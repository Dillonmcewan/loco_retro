# loco_retro

Lovingly vibe-coded local-first app for running remote retros.

[![CI](https://github.com/dillonmcewan/loco_retro/actions/workflows/ci.yml/badge.svg)](https://github.com/dillonmcewan/loco_retro/actions/workflows/ci.yml)
[![Deploy](https://github.com/dillonmcewan/loco_retro/actions/workflows/deploy.yml/badge.svg)](https://github.com/dillonmcewan/loco_retro/actions/workflows/deploy.yml)
[![codecov](https://codecov.io/gh/dillonmcewan/loco_retro/branch/main/graph/badge.svg)](https://codecov.io/gh/dillonmcewan/loco_retro)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

A simple retro tool for distributed teams. No accounts or set up; simply share a URL and get started. Data is stored locally in the browser and synced in realtime with other participants via a CRDT (Yjs) and WebSocket transport (`y-partykit`).

- **No accounts.** Share a URL, pick a display name, go.
- **Local-first.** Every participant holds the full retro state in their browser via a CRDT (Yjs) backed by IndexedDB.
- **Phases:** Collect → Vote → Discuss → Closed.
- **Export** to PDF, CSV, or Markdown from any open or closed room.
- **Presets** (Went well / Didn't go well / Actions, Start / Stop / Continue, Mad / Sad / Glad, 4Ls) or define custom templates.

See [`docs/prd.md`](docs/prd.md) for the full product spec and [`docs/architecture.md`](docs/architecture.md) for the tech stack and runtime architecture.

## Quick Start

See [`CONTRIBUTING.md`](CONTRIBUTING.md) for local development setup and commands.

## Stack

See [`docs/architecture.md`](docs/architecture.md) for the tech stack and runtime architecture.

## Contributing

Contributions welcome — please read [`CONTRIBUTING.md`](CONTRIBUTING.md) first.

Found a security issue? See [`SECURITY.md`](SECURITY.md) for private reporting.

## License

[MIT](LICENSE) © Dillon McEwan
