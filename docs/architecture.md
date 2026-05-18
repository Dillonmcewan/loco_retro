# loco_retro — Architecture

> **Source of truth for *how* it's built.** Tech stack and architecture.
> Re-read the relevant section before touching code on any feature. Update this doc in the same commit whenever a non-trivial decision changes.

For workflow, setup, and commands see [`CONTRIBUTING.md`](../CONTRIBUTING.md). Component-pattern conventions live as comments at the code they describe.

## Tech stack

- **Framework:** SvelteKit (TypeScript), running entirely in the browser. `src/routes/+layout.ts` sets `ssr=false` and `prerender=false` globally.
- **State / persistence:** **Yjs** (CRDT) + **`y-indexeddb`**. Local-first — the browser holds the authoritative copy of every retro it has touched.
- **Realtime transport:** **`y-partyserver`** (the Cloudflare-org successor to `y-partykit`) over WebSocket. The room "server" is a Cloudflare Durable Object in `party/main.ts` — a `YServer` subclass routed via `partyserver`'s `routePartykitRequest`. Snapshots live in the DO's default SQLite storage (no `onLoad`/`onSave` overrides), so the latest state survives hibernation.
- **Deploy:** Cloudflare Pages (SvelteKit) + a Cloudflare Worker for the sync DO, both shipped via `wrangler` under our own Cloudflare account so the DO and its logs are visible in `dash.cloudflare.com`.

## Architecture

- **Local-first sync model — CRDT (Yjs).** Each room is a `Y.Doc` named by its room id, mirrored to IndexedDB by `y-indexeddb`. Conflicts merge automatically; no manual conflict resolution code.
  - **Top-level shared types on the room doc:**
    - `meta` (`Y.Map`): `{ name, phase, votesPerParticipant, chrisMode }`. `phase` advances through `collect → vote → discuss → closed`.
    - `columns` (`Y.Array<Y.Map>`): the sole source of truth for room shape. Each column map carries `{ id, title, cards: Y.Array<Y.Map> }`. Each card map carries `{ id, text, author, authorId, createdAt, editedAt?, discussed? }`.
    - `ballots` (`Y.Map<authorId, Y.Map<cardId, number>>`): each author owns their own keyed entry, so concurrent +1/−1 from different authors never race on a shared counter.
  - Templates are a pure presentation concept (presets + the user's local retro history); no persisted `templateId` lives in the doc.
  - **Ballot privacy is a UI convention, not a CRDT property.** Ballots are stored unencrypted in the shared doc; only the local viewer's per-card allocations are bound to the UI. A determined participant who inspects raw Yjs state could read others' ballots — "private" in the PRD means "private in the product UI," not cryptographically secret.
- **Realtime transport — `y-partyserver`.** Each client opens a `YProvider` against `VITE_SYNC_HOST` (`localhost:1999` in dev via `wrangler dev`, `loco-retro-sync.<account>.workers.dev` in prod). The Durable Object is a `YServer` subclass; `y-partyserver` debounces snapshots to the DO's default SQLite storage, so the latest state survives hibernation and late-joiners can bootstrap even when no peer is online. Offline edits queue locally and replay on reconnect.
- **Identity / room model — anonymous + shareable URL.** A room is created with a fresh UUID v4; the URL `/r/<id>` is the share artifact. There are no accounts. A participant's display name is stored in `localStorage` and prefilled on subsequent visits. **Presence** (who is currently in the room) is carried on the Yjs **awareness** channel — ephemeral, not part of the persisted CRDT, so it needs no clean-up logic. Each client publishes `{ user: { name, authorId, ready } }`.
- **Client state management — Svelte stores backed by Yjs.** Component code reads from thin Svelte stores that subscribe to Yjs observers (or to the awareness channel); writes mutate the Yjs types directly. The whole room layer lives in `src/lib/room.ts`. Only one room session is active per tab — opening a new id closes the previous one. Seeding is idempotent: late joiners cannot clobber the facilitator's template choice.

## Deploy

Two deployable units run on Cloudflare under our own account: the **sync Worker** (`party/main.ts`, deployed by `wrangler deploy` using `wrangler.jsonc`) and the **SvelteKit app** (Cloudflare Pages, deployed by `wrangler pages deploy`). GitHub Actions deploys both on every push to `main` via `.github/workflows/deploy.yml` — the sync Worker first (its host is baked into the SvelteKit build), then Pages. Rollback is a redeploy of an earlier SHA; there's no database or migrations to reverse.

## Open decisions

_None currently open. The realtime transport (`y-partyserver`) and deploy target (Cloudflare Pages + a sync Worker in our own Cloudflare account) are pinned by the partyserver migration._
