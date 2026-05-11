# loco_retro — Development Plan

> **Source of truth for *how* we're building it.** Architecture, conventions, tooling, testing.
> Re-read the relevant section of this doc before touching code on any feature.
> Update this doc in the same commit whenever a non-trivial decision changes.

## Tech stack (pinned)

- **Framework:** SvelteKit (TypeScript) — full-stack, using SvelteKit endpoints for server logic.
- **Package manager:** pnpm.
- **Tests:**
  - Unit & component: Vitest (+ `@testing-library/svelte` for components).
  - End-to-end: Playwright.
- **Lint / format:** ESLint + Prettier (SvelteKit defaults).
- **Icons:** `lucide-svelte` — per-icon imports (`lucide-svelte/icons/<name>`) keep the bundle tree-shaken.
- **State / persistence:** **Yjs** (CRDT) + **`y-indexeddb`** for local persistence. The browser holds the authoritative copy of every retro it has touched.
- **Realtime transport:** **`y-partykit`** over WebSocket. The room "server" is a Cloudflare Durable Object defined in `party/main.ts`; its `onConnect` delegates to `y-partykit`'s built-in Yjs sync helper with `persist: { mode: 'snapshot' }`, so the latest Yjs state survives DO hibernation and unsticks late-joiner bootstrap. We (the team) operate no server — Cloudflare runs the DO. The client's PartyKit host is required from `VITE_PARTYKIT_HOST` (committed `.env` for dev; deploy target sets it for prod). No source-level fallback — if the env var is missing the client throws at module load.
- **Deployment adapter:** **`@sveltejs/adapter-cloudflare`**. SvelteKit deploys to Cloudflare Pages; the PartyKit worker deploys via `partykit deploy` to the same Cloudflare account.

## Architecture

- **Local-first sync model — CRDT (Yjs).** Each room is a `Y.Doc` named by its room id. Persistent state (room name, columns, cards, ballots) lives in shared Yjs types inside that doc and is mirrored to IndexedDB by `y-indexeddb`. Conflicts merge automatically; no manual conflict resolution code.
  - **Top-level shared types on the room doc:** `meta` (`Y.Map`), `columns` (`Y.Array<Y.Map>`), and `ballots` (`Y.Map<authorId, Y.Map<cardId, number>>`). Each author owns their own keyed entry in `ballots`, so concurrent +1 / −1 mutations from different authors never race on a shared counter.
  - **Ballot privacy is a UI convention, not a CRDT property.** Ballots are stored unencrypted in the shared doc; only the local viewer's per-card allocations are bound to the UI. A determined participant who inspects raw Yjs state could read others' ballots — "private" in the PRD means "private in the product UI," not cryptographically secret.
- **Realtime transport — `y-partykit`.** Each client opens a `YPartyKitProvider` against the PartyKit host (`VITE_PARTYKIT_HOST`; `localhost:1999` in dev, `<project>.<account>.partykit.dev` in prod). The Durable Object hosting the room runs `y-partykit`'s `onConnect` helper with snapshot persistence, so the latest Yjs state survives DO hibernation. Offline edits queue locally and replay on reconnect; late joiners can bootstrap from the DO even when no peer is online.
- **Identity / room model — anonymous + shareable URL.** A room is created with a fresh UUID v4; the URL `/r/<id>` is the share artifact. There are no accounts. A participant's display name is stored in `localStorage` and prefilled on subsequent visits. **Presence** (who is currently in the room) is carried on the Yjs **awareness** channel — ephemeral, not part of the persisted CRDT, so it doesn't need clean-up logic.
- **Client state management — Svelte stores backed by Yjs.** Component code reads from thin Svelte stores that subscribe to Yjs observers and to the awareness channel; writes mutate the Yjs types directly. The whole room layer (id helpers, doc factory, seed, session singleton, derived Svelte stores) lives in a single `src/lib/room.ts`.

Routes that touch CRDT state are client-rendered (`ssr=false`) — Yjs and IndexedDB are browser-only in v1.

## Conventions

- **Plan mode default.** Every Claude Code session starts read-only; implementation only after a plan is accepted.
- **Commit frequently.** Small, focused commits — the diff is the review surface.
- **Feature-plan first.** No application code without a corresponding `docs/features/<name>.md` traced back to a PRD requirement.
- **Tests live next to code** (`*.test.ts` for unit, `*.spec.ts` under `e2e/` for Playwright) — concrete layout TBD when the SvelteKit app is initialized.
- **TypeScript strict mode** on from day one.
- **Flat `src/lib/` structure.** `.ts` utilities and `.svelte` components live alongside each other in `src/lib/`, prefix-disambiguated (`Card.svelte` vs `RetroCard.svelte`). Matches the SvelteKit reference apps (sveltejs/realworld, PocketBase admin) and the dominant community advice — keep `$lib` small, colocate to routes when possible. Promote a group to its own subfolder (e.g. `lib/voting/`) only when it has its own internal structure (5+ files); never split by *type* (`components/`, `utils/`, `stores/`) because that fragments cohesive features.
- **Design tokens.** All component CSS uses CSS variables from `src/app.css` for colors, radii, shadows, **spacing (4px scale: `--space-1`…`--space-24`)**, and **font sizes (`--font-size-xs`…`--font-size-xl`)**. Raw `rem`/`px` literals in `padding` / `margin` / `gap` / `font-size` belong only to dimensions of fixed-size primitives (icon buttons, SVG glyphs, container `max-width` / `height`). Add new tokens at the `:root` block before introducing a new literal value.

## Standard commands

| Purpose                | Command              |
| ---------------------- | -------------------- |
| Install                | `pnpm install`       |
| Dev (app + PartyKit)   | `pnpm dev:all`       |
| Dev server (app only)  | `pnpm dev`           |
| PartyKit dev server    | `pnpm party:dev`     |
| PartyKit deploy        | `pnpm party:deploy`  |
| Type-check             | `pnpm check`         |
| Lint                   | `pnpm lint`          |
| Format                 | `pnpm format`        |
| Unit tests             | `pnpm test:unit`     |
| E2E tests              | `pnpm test:e2e`      |

`pnpm dev:all` is the recommended local dev command — it runs Vite and `partykit dev` together via `concurrently`, with `VITE_PARTYKIT_HOST=localhost:1999` injected.

## Deploy

- **App:** `pnpm build` produces `.svelte-kit/cloudflare/`; deploy to Cloudflare Pages.
- **PartyKit worker:** `pnpm party:deploy` (wraps `partykit deploy`). First deploy requires a Cloudflare account linked via the PartyKit CLI. The deployed host is `loco-retro.<account>.partykit.dev`; set `VITE_PARTYKIT_HOST` on the Pages project to that value.

## Open decisions

_None currently open. The realtime transport (`y-partykit`) and deploy target (Cloudflare Pages + PartyKit) are pinned as of the `partykit-sync` feature._
