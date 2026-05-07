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
- **Database:** _none yet — deferred._ Local-first storage strategy to be decided (e.g. IndexedDB via Dexie, SQLite-WASM, or sync engine like Automerge/Yjs). Revisit before the first persistence-touching feature.
- **Deployment adapter:** deferred. Use `@sveltejs/adapter-auto` until a target is pinned (Vercel / Cloudflare / Node).

## Architecture

_TBD — fill in once the first features are scoped. Topics to cover:_

- Local-first sync model (CRDT? last-write-wins? offline queue?)
- Realtime transport for remote retros (WebSocket? SSE? peer-to-peer?)
- Authentication / room model
- State management on the client (Svelte stores vs. signal-based)

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

- Local-first persistence layer (see Architecture).
- Realtime sync mechanism for multi-user retros.
- Hosting / deploy target.
- Auth approach (anonymous rooms? accounts?).
