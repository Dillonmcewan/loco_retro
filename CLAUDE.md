# loco_retro

Local-first app for running remote retros.

## Spec-driven workflow — read these first

This repo follows a strict spec-first loop. Before writing or editing application code, read the relevant docs:

- **`docs/prd.md`** — source of truth for **what** we're building (product requirements). Always check current requirements before proposing scope.
- **`docs/plan.md`** — source of truth for **how** we're building it (architecture, tech stack, conventions, testing strategy). **Re-read the relevant section of this file before touching code on any feature** — it evolves over time and supersedes any older assumptions.
- **`docs/features/<feature-name>.md`** — per-feature implementation plan. Each feature traces back to PRD requirements and aligns with the dev plan.

If a request conflicts with the PRD or dev plan, surface the conflict before implementing — don't silently deviate.

## Stack (pin early; details live in `docs/plan.md`)

- **Framework:** SvelteKit (TypeScript), full-stack via SvelteKit endpoints
- **Package manager:** pnpm
- **Tests:** Vitest (unit/component), Playwright (e2e)
- **DB:** none yet — deferred
- **Deploy adapter:** deferred (use `@sveltejs/adapter-auto` until pinned)

## Standard commands

- Install: `pnpm install`
- Dev (app + PartyKit): `pnpm dev:all` (recommended)
- Dev server (app only): `pnpm dev`
- PartyKit dev server: `pnpm party:dev`
- PartyKit deploy: `pnpm party:deploy`
- Type-check: `pnpm check`
- Lint: `pnpm lint`
- Format: `pnpm format`
- Unit tests: `pnpm test:unit` (Vitest)
- E2E tests: `pnpm test:e2e` (Playwright)

(Scripts will be wired up when the SvelteKit app is initialized — until then, prompt the user before running them.)

## Conventions

- **Plan mode is the default.** Sessions start read-only; produce a plan, get acceptance, then implement.
- **Commit frequently.** Small, focused commits are the primary review surface — the user reviews diffs between iterations rather than approving each tool call. Prefer many small commits over one large one.
- **Don't start writing application code until `docs/prd.md` and `docs/plan.md` have content.** If they're empty, ask before scaffolding the app.
- Keep PRD and dev plan **in sync with reality** — when you make a non-trivial decision while implementing, update `docs/plan.md` in the same change.
