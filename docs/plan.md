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
- **State / persistence:** **Yjs** (CRDT) + **`y-indexeddb`** for local persistence. The browser holds the authoritative copy of every retro it has touched.
- **Realtime transport:** **`y-websocket`**. A small standalone Node relay runs as a separate package under `relay/`. The relay forwards Yjs updates between clients; it is intentionally pure pass-through and in-memory in dev. Persistence between sessions on the relay is a PRD-level open question.
- **Deployment adapter:** still deferred. Use `@sveltejs/adapter-auto` until a target is pinned (Vercel / Cloudflare / Node). Pinning a target will likely also force a decision about whether to keep `relay/` separate or fold it into the SvelteKit deployment.

## Architecture

- **Local-first sync model — CRDT (Yjs).** Each room is a `Y.Doc` named by its room id. Persistent state (room name, columns, cards, votes once they exist) lives in shared Yjs types inside that doc and is mirrored to IndexedDB by `y-indexeddb`. Conflicts merge automatically; no manual conflict resolution code.
- **Realtime transport — `y-websocket`.** Each client opens a `y-websocket` provider against the relay (`VITE_RELAY_URL`, default `ws://localhost:1234`). The relay routes updates between connected clients for the same doc id. Offline edits queue locally and replay on reconnect.
- **Identity / room model — anonymous + shareable URL.** A room is created with a fresh UUID v4; the URL `/r/<id>` is the share artifact. There are no accounts. A participant's display name is stored in `localStorage` and prefilled on subsequent visits. **Presence** (who is currently in the room) is carried on the Yjs **awareness** channel — ephemeral, not part of the persisted CRDT, so it doesn't need clean-up logic.
- **Client state management — Svelte stores backed by Yjs.** Component code reads from thin Svelte stores that subscribe to Yjs observers and to the awareness channel; writes mutate the Yjs types directly. Stores live alongside the rest of the room helpers in `src/lib/` (flat layout — `roomStore.ts`, `roomDoc.ts`, etc.).

Routes that touch CRDT state are client-rendered (`ssr=false`) — Yjs and IndexedDB are browser-only in v1.

## Conventions

- **Plan mode default.** Every Claude Code session starts read-only; implementation only after a plan is accepted.
- **Commit frequently.** Small, focused commits — the diff is the review surface.
- **Feature-plan first.** No application code without a corresponding `docs/features/<name>.md` traced back to a PRD requirement.
- **Tests live next to code** (`*.test.ts` for unit, `*.spec.ts` under `e2e/` for Playwright) — concrete layout TBD when the SvelteKit app is initialized.
- **TypeScript strict mode** on from day one.

## Standard commands

| Purpose       | Command            |
| ------------- | ------------------ |
| Install       | `pnpm install`     |
| Dev server    | `pnpm dev`         |
| Type-check    | `pnpm check`       |
| Lint          | `pnpm lint`        |
| Format        | `pnpm format`      |
| Unit tests    | `pnpm test:unit`   |
| E2E tests     | `pnpm test:e2e`    |

(Scripts will be wired up when `pnpm create svelte` is run for the app skeleton.)

## Open decisions

- Hosting / deploy target.
- Whether the relay (currently a separate dev-only Node process) should be folded into the SvelteKit deployment when a target is picked, or stay a standalone service.
