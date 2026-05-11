# Feature: PartyKit sync + Cloudflare deploy

## Requirement traceability

- Maps to PRD section(s):
  - **R8 — Local-first sync.** "Each client holds full retro state locally via a CRDT and syncs through a lightweight relay. Edits made while offline appear locally immediately and merge on reconnect without data loss, for the duration of a single retro session." This feature reinterprets "lightweight relay" as a Cloudflare Durable Object running `y-partykit`. We don't operate a server; Cloudflare runs the managed primitive.
  - **R9 — Room lifecycle.** "Closed rooms … remain viewable by anyone with the join code as long as the state exists on at least one participant's device or the relay's best-effort cache." A DO with y-partykit's `persist: { mode: "history" }` *is* that best-effort cache — and unlike y-webrtc, it survives "everyone went home, come back tomorrow."
  - **G2 (goal).** "A brief loss of connectivity never loses a participant's cards or votes." Unchanged — `y-indexeddb` still mirrors the doc locally.
  - **Open question — relay persistence.** This feature resolves it with a *different* answer than the abandoned y-webrtc attempt: the DO **does** hold ephemeral room state in CF's managed storage. Retro content transits Cloudflare's edge; we (the team) operate no server and don't run a database. PRD wording needs an update — the previous answer of "no relay carries application data" is now stale.
- Out of scope for this feature:
  - Authentication, room passwords, or restricting room access. Anyone with the URL can join (unchanged from the rest of the app).
  - Server-side persistence beyond y-partykit's default DO-backed `persist`. No external DB, no S3, nothing.
  - Multi-region / replicated DO placement — CF places the DO; we don't pin it.
  - Cleanup / TTL policies for stale rooms. We'll rely on CF's defaults and revisit once we see real usage. Out-of-scope warning is loud.
  - The previously-considered `connection-status` UI feature. Defer.
  - Monitoring / observability beyond CF's defaults (logs in the dashboard).
  - Custom domain pinning — start on the default `*.partykit.dev` host; revisit when we have a product domain.

## Design

### Summary

Replace `y-websocket` + the `relay/` Node package with `y-partykit`. The client uses `YPartyKitProvider` (a thin WebSocket-based Yjs provider); the room state lives in a Cloudflare Durable Object whose `onConnect` delegates to `y-partykit`'s built-in Yjs sync helper. The SvelteKit app deploys to Cloudflare Pages; the PartyKit server deploys via `partykit deploy` to the same Cloudflare account. After this lands, the MVP is genuinely live: zero servers we run, one bill, one dashboard, native Yjs sync, and late joiners can connect even when no peer is online.

### How it aligns with `docs/plan.md`

- **Tech stack → "Realtime transport"** (line 17): wholesale rewrite — `y-partykit` over WebSocket, with a Cloudflare DO as the server. No Node relay, no signaling server, no relay package.
- **Tech stack → "Deployment adapter"** (line 18): pin `@sveltejs/adapter-cloudflare` (replacing `adapter-auto`). The SPA deploys to Cloudflare Pages; the PartyKit worker deploys alongside via `partykit deploy`. This is the v1 hosting decision.
- **Architecture → "Realtime transport"** (line 25): rewrite to describe `YPartyKitProvider` against `wss://<project>.<account>.partykit.dev/parties/main/<roomId>` (URL shape pending — see open questions), with the DO running `y-partykit`'s `onConnect` helper for sync.
- **Architecture → "Local-first sync model"**: unchanged. Yjs schema, IndexedDB persistence, awareness model all untouched. The provider swap is the only consumer of these changes.
- **Open decisions** (lines 55–58): we are *closing* both items in this feature — hosting target is Cloudflare; the relay-equivalent (the DO) lives inside the same Cloudflare project as the SPA.
- **New decision to document:** the DO persists CRDT history in its own storage. That contradicts the "no application-data persistence on services we operate" framing from the abandoned y-webrtc work. Updated framing: *we* (the team) don't operate or persist anything; *Cloudflare* manages the DO and its storage. Retro content lives on participants' devices *and* in the DO's managed storage during a room's active life.

### Alternatives considered

- **y-webrtc with self-hosted signaling.** Already attempted on `feature/p2p-sync` (now deleted). Blocked by unreliable public signaling and the realization that we'd be operating a service either way — at which point WebRTC's mesh/NAT/bootstrap complexity loses to a managed primitive.
- **y-websocket on Fly/Render.** Works, debuggable, no Cloudflare vendor exposure. Rejected because PartyKit gives us the same shape with *zero* server-management overhead (no Dockerfile, no health checks, no resource sizing). We'd revisit this if Cloudflare lock-in becomes a concern.
- **Hocuspocus self-hosted.** Same trade-off as y-websocket plus an extra dependency. Rejected for v1; revisit if we ever want auth hooks or DB adapters.
- **Liveblocks / Tiptap Hocuspocus Cloud / managed SaaS.** Cheap and fast, but retro content lives with a third party we don't have a relationship with. Cloudflare is already a deeper, more boring infrastructure dependency — preferable to taking on a new vendor.
- **`partyserver` (newer raw CF-Workers-native Yjs binding).** Lower-level than y-partykit; would mean writing our own `onConnect` glue. Defer — `partykit deploy` is the documented happy path and the abstraction we want at MVP scope.

### Key technical decisions

- **Provider:** `YPartyKitProvider(host, roomId, doc, opts?)` from `y-partykit/provider`. `host` comes from an env var (`VITE_PARTYKIT_HOST`); `roomId` is the existing room UUID; `doc` is the existing `Y.Doc`. Provider exposes `.awareness` — `participantsStore` keeps working unchanged.
- **Server:** a single `party/main.ts` exporting a `Party.Server` class whose `onConnect` is one line: `return onConnect(conn, this.party, { persist: { mode: 'snapshot' } });`. Snapshot persistence stores only the latest `Y.Doc` state in the DO — enough to survive hibernation and unstick the late-joiner bootstrap problem, without paying the storage cost of full update history. For retros (short-lived, small docs, low edit volume) snapshot is sufficient; we revisit `mode: 'history'` only if we see real merge issues.
- **Deploy adapter:** swap `@sveltejs/adapter-auto` for `@sveltejs/adapter-cloudflare`. The app builds to `.svelte-kit/cloudflare/` and deploys to Cloudflare Pages; PartyKit deploys via `npx partykit deploy`.
- **Env var:** `VITE_PARTYKIT_HOST` — required for the client to know where to connect. Dev default: `localhost:1999` (PartyKit's `partykit dev` default port). Prod: `<project>.<account>.partykit.dev`.
- **Dev workflow:** a single command — `pnpm dev:all` (restored from before the y-webrtc work) — orchestrates Vite and `partykit dev` together via `concurrently`. Identical DX to the old Vite-plus-Node-relay setup; just swaps the relay process for the local Workers shim that PartyKit ships. The bare `pnpm dev` and `pnpm party:dev` scripts remain available for running each side alone. They communicate over `localhost:1999`. Production: Cloudflare runs both halves; we run nothing.
- **E2E:** same shape as the abandoned attempt — Playwright's `webServer` array boots `partykit dev` alongside the Vite server. No more loopback-NAT-failure pain because PartyKit is plain WebSocket.

## File-level changes

- `package.json`:
  - Remove `y-websocket`; add `y-partykit`, `partykit` (devDep, provides the `partykit` CLI), `@sveltejs/adapter-cloudflare` (replacing `@sveltejs/adapter-auto`). Restore `concurrently` as a devDep.
  - Add scripts: `party:dev` (`partykit dev`), `party:deploy` (`partykit deploy`), and `dev:all` (Vite + `partykit dev` via `concurrently`, with `VITE_PARTYKIT_HOST=localhost:1999` injected). `pnpm dev:all` is the recommended local dev command.
- `svelte.config.js` — swap the adapter import + invocation from `@sveltejs/adapter-auto` to `@sveltejs/adapter-cloudflare`.
- `partykit.json` (new) — top-level config: project name, the parties map (`main` → `party/main.ts`), `compatibility_date`.
- `party/main.ts` (new) — the Durable Object server. ~15 lines:
  ```ts
  import type * as Party from 'partykit/server';
  import { onConnect } from 'y-partykit';

  export default class RetroRoom implements Party.Server {
      constructor(readonly party: Party.Party) {}
      onConnect(conn: Party.Connection) {
          return onConnect(conn, this.party, {
              persist: { mode: 'history' }
          });
      }
  }
  ```
- `src/lib/room.ts`:
  - Drop `WebsocketProvider` import → add `YPartyKitProvider`.
  - Replace `VITE_RELAY_URL` (currently throws if unset) with `VITE_PARTYKIT_HOST` (same semantics: required, throws at module load if missing — unlike the y-webrtc attempt, we *want* fail-fast here because there is no working default).
  - `OpenRoom['provider']` and `OpenRoom['awareness']` typed against `YPartyKitProvider`.
  - `openRoomDoc` constructs `new YPartyKitProvider(PARTYKIT_HOST, id, doc)`.
- `.env` — replace `VITE_RELAY_URL=ws://localhost:1234` with `VITE_PARTYKIT_HOST=localhost:1999`.
- `relay/` — **delete the entire directory.**
- `pnpm-workspace.yaml` — drop the `relay/*` entry. (If after this no workspaces remain, delete the file.)
- `playwright.config.ts` — `webServer` array runs `partykit dev` (with a healthcheck URL on `http://localhost:1999`) alongside `pnpm dev` (with `VITE_PARTYKIT_HOST=localhost:1999` injected via env).
- `.devcontainer/devcontainer.json` — replace forwarded port `1234` ("Yjs relay") with `1999` ("PartyKit dev").
- `e2e/create-and-join.spec.ts:32`, `e2e/persistence.spec.ts:4-6` — comment-only updates describing PartyKit/WebSocket transport instead of relay/WebSocket.
- `docs/plan.md`:
  - Rewrite Tech-stack and Architecture transport sections.
  - Pin the deploy adapter (`adapter-cloudflare`) — closes the "deferred" status.
  - Close both Open decisions; add a single-line note that DO storage holds Yjs history for active rooms.
- `docs/prd.md`:
  - Update R8 wording slightly: "syncs through a managed Cloudflare Durable Object" instead of "lightweight relay." Optional — could leave R8 vague and add a one-line implementation note. Decide during implementation.
  - Update the (already-marked-resolved) relay-persistence open question's text to reflect the new answer: CF holds room state in DO storage; we don't operate or persist anything ourselves.
- `CLAUDE.md` — refresh the **Standard commands** block to add `pnpm dev:all` / `pnpm party:dev` / `pnpm party:deploy`. The "Two-tab sync in the devcontainer" section from the deleted y-webrtc branch is already gone (the branch was force-deleted before merging), so no removal needed.
- No new README; deploy + dev-flow documentation lives in `docs/plan.md` (Architecture / Standard commands) and `CLAUDE.md` (commands cheatsheet).

## Test plan

### Unit (Vitest)

- The transport swap doesn't materially change `src/lib/room.ts`'s public surface; existing 135 tests should pass with only the provider type changing. **Run them; investigate any breakage individually.**
- Add a small test pinning that `VITE_PARTYKIT_HOST` is required: importing `room.ts` with the env var unset throws at module load. (Counterpart of the `parseSignalingUrls` tests we threw away with `feature/p2p-sync`.)

### Component (Vitest + Testing Library)

- No changes expected — components don't touch transport. Re-run as a sanity check.

### E2E (Playwright)

- **`create-and-join.spec.ts`** (existing two-context test): expect to pass once `partykit dev` is wired into `webServer`. This is the real proof that the transport works end-to-end.
- **`persistence.spec.ts`** (existing single-context reload test): expect to pass — IndexedDB still mirrors the doc.
- **New `bootstrap.spec.ts`** (recommended): start a room in context A, add a card, close A entirely, open the room URL in context B with a *fresh* storage state. Confirm B sees the card. This proves the late-joiner-bootstrap claim — the *specific* thing y-webrtc couldn't do.

### Manual verification

1. `pnpm install` — `y-partykit`, `partykit`, `@sveltejs/adapter-cloudflare` resolve; `y-websocket` is gone.
2. `pnpm party:dev` in one terminal, `pnpm dev` in another. Open `http://localhost:5173`, create a room.
3. Open the room URL in a fresh incognito window. Confirm the room loads instantly (no "Untitled retro" hang). Confirm cards/votes/phase changes propagate within ~1s.
4. Close *both* tabs. Reopen the URL in incognito (fresh storage). Confirm the room rehydrates from the DO. **This is the bootstrap test that motivated the whole pivot.**
5. DevTools → Network → WS: confirm a single WSS connection to `localhost:1999` on the dev host. In prod this becomes `<project>.<account>.partykit.dev`.
6. (Once deployed) `pnpm build && wrangler pages deploy …` (or the equivalent Pages CLI flow). `npx partykit deploy`. Open the deployed URL on two devices, confirm sync. Send the URL to a teammate, confirm a real third party can join.

## Resolved decisions

1. **PartyKit project name** = `loco-retro` (kebab-case, per PartyKit convention; produces a deploy host of `loco-retro.<account>.partykit.dev`). Renaming later is annoying but possible.
2. **Persist mode** = `snapshot`. Cheapest option that still survives DO hibernation. Yjs CRDT idempotency handles the late-merge cases. Revisit `history` only if real merge issues surface.
3. **`dev:all`** = restored. Single command runs Vite + `partykit dev` via `concurrently`.
4. **README** = not added. Update `docs/plan.md` and `CLAUDE.md` instead.

## Open questions

1. **Cloudflare account.** Not blocking `/implement` — `partykit dev` runs locally without one, so all coding and local/e2e testing can complete without an account. The account becomes a *prerequisite for the first production deploy* (the operational step at the end). Treat as a parallel TODO; flag again at deploy time.

## Rollout / commit plan

Each commit independently reviewable; the working tree should pass `pnpm check` at every commit. The two behavior-changing commits are #2 and #3.

1. **`chore(deploy): pin adapter-cloudflare`** — `svelte.config.js` + `package.json` (`adapter-auto` → `adapter-cloudflare`) + lockfile. App still builds; no transport change yet.
2. **`feat(sync): introduce PartyKit Durable Object backend`** — add `partykit.json`, `party/main.ts`, the `y-partykit` + `partykit` deps, the `party:dev` / `party:deploy` scripts, the `VITE_PARTYKIT_HOST` env var. Update `src/lib/room.ts` to use `YPartyKitProvider`. Wire `playwright.config.ts` to run `partykit dev`. Update `.devcontainer/devcontainer.json` port forward. Should leave `pnpm dev` + `pnpm party:dev` flow working end-to-end locally; e2e green.
3. **`chore: remove dev-only y-websocket relay`** — delete `relay/`, drop the `relay` script, drop `pnpm-workspace.yaml`, update `.env` env-var name, drop any lingering `y-websocket` references. Smaller commit; could be folded into #2 if reviewer prefers a single behavior-change diff.
4. **`docs: pin Cloudflare/PartyKit transport in PRD and plan`** — `docs/plan.md` rewrites; `docs/prd.md` open-question + R8 wording; `CLAUDE.md` commands cheatsheet refresh.
5. **`test(e2e): cover late-joiner bootstrap`** — add `e2e/bootstrap.spec.ts`. This is the test that proves we actually fixed the thing that broke under y-webrtc.
6. **(Out-of-scope for this commit sequence, listed for visibility) `pnpm party:deploy` + Cloudflare Pages first deploy.** Not a code commit — operational step we do once #1–#5 are merged *and* the Cloudflare account exists. Document the exact commands in `docs/plan.md`.
