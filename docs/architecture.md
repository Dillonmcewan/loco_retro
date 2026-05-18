# loco_retro — Architecture

> **Source of truth for *how* it's built.** Tech stack, runtime architecture, basic deploy shape.
> Re-read the relevant section before touching code on any feature. Update this doc in the same commit whenever a non-trivial decision changes.

For workflow, setup, and commands see [`CONTRIBUTING.md`](../CONTRIBUTING.md). Component-pattern conventions live as comments at the code they describe.

## Tech stack (pinned)

- **Framework:** SvelteKit (TypeScript) — full-stack, using SvelteKit endpoints for server logic.
- **Package manager:** pnpm.
- **Tests:** Vitest (+ `@testing-library/svelte`) for unit & component; Playwright for end-to-end.
- **Lint / format:** ESLint + Prettier (SvelteKit defaults).
- **Icons:** `lucide-svelte` — per-icon imports (`lucide-svelte/icons/<name>`) keep the bundle tree-shaken.
- **State / persistence:** **Yjs** (CRDT) + **`y-indexeddb`** for local persistence. The browser holds the authoritative copy of every retro it has touched.
- **Realtime transport:** **`y-partykit`** over WebSocket. The room "server" is a Cloudflare Durable Object defined in `party/main.ts`; its `onConnect` delegates to `y-partykit`'s built-in Yjs sync helper with `persist: { mode: 'snapshot' }`, so the latest Yjs state survives DO hibernation and unsticks late-joiner bootstrap. The client's PartyKit host is required from `VITE_PARTYKIT_HOST`, loaded by Vite from committed env files: `.env` for dev defaults (`localhost:1999`) and `.env.production` for the prod host. No source-level fallback — if the env var is missing the client throws at module load.
- **Deployment adapter:** **`@sveltejs/adapter-cloudflare`**. SvelteKit deploys to Cloudflare Pages; the PartyKit worker deploys via `partykit deploy` to the same Cloudflare account.

## Architecture

- **Local-first sync model — CRDT (Yjs).** Each room is a `Y.Doc` named by its room id. Persistent state (room name, columns, cards, ballots) lives in shared Yjs types inside that doc and is mirrored to IndexedDB by `y-indexeddb`. Conflicts merge automatically; no manual conflict resolution code.
  - **Top-level shared types on the room doc:** `meta` (`Y.Map`, carrying `{ name, phase, votesPerParticipant, chrisMode }`), `columns` (`Y.Array<Y.Map>`, the sole source of truth for room shape — column titles and ids live here, not in `meta`), and `ballots` (`Y.Map<authorId, Y.Map<cardId, number>>`). Each author owns their own keyed entry in `ballots`, so concurrent +1 / −1 mutations from different authors never race on a shared counter. Templates are a pure presentation concept (presets + the user's local retro history) — there is no persisted `templateId`.
  - **Ballot privacy is a UI convention, not a CRDT property.** Ballots are stored unencrypted in the shared doc; only the local viewer's per-card allocations are bound to the UI. A determined participant who inspects raw Yjs state could read others' ballots — "private" in the PRD means "private in the product UI," not cryptographically secret.
- **Realtime transport — `y-partykit`.** Each client opens a `YPartyKitProvider` against the PartyKit host (`VITE_PARTYKIT_HOST`; `localhost:1999` in dev, `<project>.<account>.partykit.dev` in prod). The Durable Object hosting the room runs `y-partykit`'s `onConnect` helper with snapshot persistence, so the latest Yjs state survives DO hibernation. Offline edits queue locally and replay on reconnect; late joiners can bootstrap from the DO even when no peer is online.
- **Identity / room model — anonymous + shareable URL.** A room is created with a fresh UUID v4; the URL `/r/<id>` is the share artifact. There are no accounts. A participant's display name is stored in `localStorage` and prefilled on subsequent visits. **Presence** (who is currently in the room) is carried on the Yjs **awareness** channel — ephemeral, not part of the persisted CRDT, so it doesn't need clean-up logic.
- **Client state management — Svelte stores backed by Yjs.** Component code reads from thin Svelte stores that subscribe to Yjs observers and to the awareness channel; writes mutate the Yjs types directly. The whole room layer (id helpers, doc factory, seed, session singleton, derived Svelte stores) lives in a single `src/lib/room.ts`.

Routes that touch CRDT state are client-rendered (`ssr=false`) — Yjs and IndexedDB are browser-only in v1.

## Deploy

Two deployable units run on Cloudflare under a single account: the **PartyKit worker** (`party/main.ts`) and the **SvelteKit app** (Cloudflare Pages). GitHub Actions deploys both on every push to `main` via `.github/workflows/deploy.yml` — PartyKit first (its host is baked into the SvelteKit build), then Pages. Rollback is a redeploy of an earlier SHA; there's no database or migrations to reverse.

## Open decisions

_None currently open. The realtime transport (`y-partykit`) and deploy target (Cloudflare Pages + PartyKit) are pinned as of the `partykit-sync` feature._
