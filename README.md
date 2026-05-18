# loco_retro

Local-first app for running remote retros.

[![CI](https://github.com/dillonmcewan/loco_retro/actions/workflows/ci.yml/badge.svg)](https://github.com/dillonmcewan/loco_retro/actions/workflows/ci.yml)
[![codecov](https://codecov.io/gh/dillonmcewan/loco_retro/branch/main/graph/badge.svg)](https://codecov.io/gh/dillonmcewan/loco_retro)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

A frictionless retrospective tool for distributed software teams. Join by code, work offline, and never lose a card to a dropped connection.

- **No accounts.** Share a URL, pick a display name, go.
- **Local-first.** Every participant holds the full retro state in their browser via a CRDT (Yjs) backed by IndexedDB. Offline edits merge cleanly on reconnect.
- **Phases:** Collect → Vote → Discuss → Closed. Facilitator advances.
- **Dot voting** with optional uncapped "Chris mode."
- **Export** to PDF, CSV, or Markdown from any open or closed room.
- **Presets** (Went well / Didn't go well / Actions, Start / Stop / Continue, Mad / Sad / Glad, 4Ls) or define custom columns.

See [`docs/prd.md`](docs/prd.md) for the full product spec and [`docs/plan.md`](docs/plan.md) for the architecture, conventions, and deploy story.

## Quickstart

Requires Node 22 and pnpm 10.

```sh
pnpm install
pnpm dev:all
```

`dev:all` boots Vite on `localhost:5173` and a local PartyKit dev server on `localhost:1999` in one terminal. Open the browser at `http://localhost:5173`.

Other useful commands:

| Purpose | Command |
| --- | --- |
| Type-check | `pnpm check` |
| Lint | `pnpm lint` |
| Unit tests | `pnpm test:unit` |
| E2E tests | `pnpm test:e2e` |
| Format | `pnpm format` |

## Stack

- **SvelteKit** (TypeScript) + Vite, deployed to Cloudflare Pages via `@sveltejs/adapter-cloudflare`.
- **Yjs** + **`y-indexeddb`** for local CRDT state and persistence.
- **`y-partykit`** over WebSocket for realtime sync against a Cloudflare Durable Object (the `party/main.ts` worker).
- **Vitest** (unit/component) + **Playwright** (e2e).

## Deploy your own

The hosted PartyKit worker baked into `.env.production` is the maintainer's. To deploy your own copy:

1. `pnpm dlx partykit login` and `pnpm dlx wrangler login` (both OAuth into Cloudflare; run on your host machine, not in a dev container).
2. `pnpm party:deploy` — first deploy of the worker. The CLI prints your host as `loco-retro.<your-account>.partykit.dev`.
3. Create a local `.env.production.local` (gitignored) with your host:
   ```
   VITE_PARTYKIT_HOST=loco-retro.<your-account>.partykit.dev
   ```
   This overrides the committed `.env.production` for your build only.
4. `pnpm dlx wrangler pages project create loco-retro --production-branch=main` once.
5. `pnpm deploy` ships PartyKit + Cloudflare Pages in order.

Full deploy walkthrough in [`docs/plan.md`](docs/plan.md#deploy).

## Contributing

Contributions welcome — please read [`CONTRIBUTING.md`](CONTRIBUTING.md) first. This repo follows a strict **spec-first workflow**: PRs that change behavior should trace back to a requirement in `docs/prd.md` and a section of `docs/plan.md`.

Found a security issue? See [`SECURITY.md`](SECURITY.md) for private reporting.

## License

[MIT](LICENSE) © Dillon McEwan
