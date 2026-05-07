# relay

Dev-only `y-websocket` server. Runs on `localhost:1234` by default
(override with `HOST` and `PORT` env vars).

State is **in-memory only** — restarting the relay wipes every room
that isn't currently held in some participant's IndexedDB. That's
fine for v1: clients are the source of truth, the relay is best-effort
forwarding only.

Run from the repo root: `pnpm relay`.
Run with the app: `pnpm dev:all`.
