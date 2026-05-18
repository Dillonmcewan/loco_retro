# loco_retro

Local-first app for running remote retros.

[`CONTRIBUTING.md`](CONTRIBUTING.md) documents the shared workflow (spec-first loop, local setup, tests, commit style, PR expectations). Read it first.

## For AI assistants

- **Plan mode is the default.** Sessions start read-only; produce a plan, get acceptance, then implement.
- **Re-read [`docs/architecture.md`](docs/architecture.md) before touching code on any feature** — it supersedes older assumptions.
- **Surface conflicts.** If a request conflicts with [`docs/prd.md`](docs/prd.md) or [`docs/architecture.md`](docs/architecture.md), flag it before implementing — don't silently deviate.
