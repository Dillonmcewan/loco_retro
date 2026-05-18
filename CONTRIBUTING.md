# Contributing to loco_retro

Thanks for your interest. This is a small project with a clear spec; the cheapest way to land a PR is to read the spec first.

## Spec-first workflow

This repo treats `docs/` as the source of truth, not the code:

- **`docs/prd.md`** — what we're building (numbered requirements R1–R13).
- **`docs/architecture.md`** — how we're building it (stack, architecture). **Re-read the relevant section before touching code on any feature.**
- **`docs/features/<feature-name>.md`** — per-feature plan, traced back to a PRD requirement.

A change that conflicts with the PRD or architecture doc should either update the docs in the same PR or be discussed in an issue first.

`CLAUDE.md` at the repo root documents this workflow for AI coding assistants — it's worth a read for human contributors too, since it reflects how the codebase is actually maintained.

## Local development

Requires **Node 22** (see `.nvmrc`) and **pnpm 10**.

```sh
pnpm install
pnpm dev:all   # Vite on :5173 + PartyKit on :1999
```

The dev container at `.devcontainer/devcontainer.json` works out of the box for VS Code Remote Containers and GitHub Codespaces.

### Tests

| Suite                             | Command          |
| --------------------------------- | ---------------- |
| Unit / component (Vitest, jsdom)  | `pnpm test:unit` |
| End-to-end (Playwright, Chromium) | `pnpm test:e2e`  |
| Type-check (svelte-check)         | `pnpm check`     |
| Lint (prettier + eslint)          | `pnpm lint`      |

`pnpm test:e2e` starts both PartyKit and the Vite dev server automatically via Playwright's `webServer` config; no setup needed beyond `pnpm install`.

Tests live next to the code they cover (`*.test.ts` for unit/component, `*.spec.ts` under `e2e/` for Playwright).

## Commit style

Conventional-commit style, scoped by feature area:

```
feat(voting): add Chris mode toggle to room creation
fix(export): strip null author from CSV rows
refactor(modal): drop Cancel from info modals
docs(architecture): document phase-transition gating with $effect.pre
```

Prefer **many small commits** over one large one — the diff is the review surface.

## Pull requests

- Open against `main`.
- Keep PRs scoped to one logical change. Architectural changes should update `docs/architecture.md` in the same PR.
- CI (`.github/workflows/ci.yml`) runs `check`, `lint`, unit tests with coverage, build, and e2e tests on every PR. Green CI is required before merge.
- The PR template prompts you for a summary, linked issue, and test plan — please fill it in.

## Branch protection (maintainer only)

Branch protection for `main` is defined as code at `.github/rulesets/main.json` and applied once via:

```sh
gh api -X POST repos/<owner>/loco_retro/rulesets --input .github/rulesets/main.json
```

The ruleset requires a passing CI status check, blocks force-push, and enforces linear history.

## Code of conduct

This project follows the [Contributor Covenant 2.1](CODE_OF_CONDUCT.md).
