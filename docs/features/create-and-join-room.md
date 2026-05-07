# Feature: Create and join a retro room

## Requirement traceability

- Maps to PRD section(s):
  - **R1 — Create a room.** Facilitator picks a template (preset) and a room name; system produces a shareable URL.
  - **R2 — Join a room.** Anyone with the URL can join by entering a display name. No account. Display name is persisted locally and reused.
  - **R3 — Preset templates.** Ships the four built-in presets (*Went well / Didn't / Actions*, *Start / Stop / Continue*, *Mad / Sad / Glad*, *4Ls*) selectable at creation.
  - **R8 — Local-first sync.** Establishes the foundational mechanism: each client holds full state via a CRDT, persists locally, and syncs through a lightweight relay. Subsequent features (cards, voting, etc.) build on this plumbing.
- Out of scope for this feature:
  - Adding/editing cards (R4) — empty columns only.
  - Phase progression (R5) — room is implicitly in *Collect*.
  - Dot voting (R6) and Discuss view (R7).
  - Closing rooms (R9).
  - Custom columns at creation (now tracked separately as R10).
  - Production deploy target — dev-only relay process for now.

## Design

This is the bootstrap feature — there is no application code yet, so it scaffolds the SvelteKit app, pins the local-first stack, and delivers the first user-facing slice (create → share URL → open URL → see same room shell).

**Approach.** A facilitator's *Create* form produces a fresh `Y.Doc`, seeds it with the room name and the chosen template's columns, persists it via `y-indexeddb`, and opens a `y-websocket` connection to a small standalone relay running on `localhost`. The system generates an opaque random room id (UUID v4) which becomes the document name and the URL slug (`/r/<id>`). The facilitator shares that URL; anyone who opens it loads the same `Y.Doc` by name, the relay forwards the existing state, and they appear in the participant list via Yjs **awareness** (ephemeral, not part of the persisted CRDT). The room route gates rendering behind a display-name prompt: if `localStorage` has no name, an inline form takes one before the room shell renders; on subsequent visits the saved name pre-fills and the gate is skipped.

**Alignment with `docs/plan.md`.** This feature pins three of the four currently-deferred decisions in the dev plan and updates the Architecture / Open-decisions sections in the same change:

- *Database / local-first persistence layer* → **Yjs + `y-indexeddb`**.
- *Realtime transport for remote retros* → **`y-websocket`**, with a standalone Node relay process under `relay/` for development.
- *Authentication / room model* → **Anonymous: shareable room URL + locally-stored display name; awareness for presence.**
- *Hosting / deploy adapter* → still deferred; `@sveltejs/adapter-auto`.

The feature also honors the standing conventions from `docs/plan.md`: TypeScript strict mode, Vitest for unit/component, Playwright for e2e, tests next to code (`*.test.ts`) with Playwright specs under `e2e/`, small focused commits.

**Alternatives considered.**

- *Automerge instead of Yjs.* Rejected for the first slice: heavier Wasm cost, less mature ecosystem of SvelteKit/Svelte bindings, and Yjs's `awareness` channel is a clean fit for "who's in the room" without polluting the persistent doc. Revisitable if Automerge's richer history model becomes important later.
- *Custom WebSocket protocol on a SvelteKit endpoint instead of `y-websocket`.* Rejected for this feature because `y-websocket` is the canonical battery-included server and we can swap it later without changing the client model. The dev plan's deploy-target decision is still deferred, which is the right time to revisit.
- *Embedding the relay in SvelteKit's Vite dev hook.* Rejected: works in dev but doesn't survive the prod adapter handoff cleanly. A separate process is honest about what's running.
- *Bootstrap-only feature first, then create+join.* Rejected: pure scaffolding has no user-visible behavior to validate, and the architectural decisions only have a sharp edge once a real flow exercises them. The scaffold lives as the first few commits in this feature instead.

## File-level changes

All files are new unless noted.

**Tooling / scaffold (root)**

- `package.json` — pnpm workspace root; scripts (`dev`, `dev:all`, `relay`, `build`, `check`, `lint`, `format`, `test:unit`, `test:e2e`); deps for SvelteKit, TS, Vitest, Playwright, ESLint, Prettier, `yjs`, `y-indexeddb`, `y-websocket`, `concurrently`.
- `pnpm-workspace.yaml` — declares root + `relay/` so the relay can have its own deps without polluting the app.
- `svelte.config.js`, `vite.config.ts`, `tsconfig.json` — SvelteKit defaults, strict TS.
- `.eslintrc.cjs`, `.prettierrc`, `.prettierignore` — SvelteKit defaults.
- `playwright.config.ts`, `e2e/` — Playwright bootstrap; webServer launches `pnpm dev:all`.
- `vitest.config.ts` — Vitest with `@testing-library/svelte` + jsdom env.
- `src/app.html`, `src/app.d.ts`, `src/app.css` — SK defaults; bare CSS reset.
- `.gitignore` — append `node_modules`, `.svelte-kit`, `build`, `playwright-report`, `test-results` (modify existing).

**App code**

- `src/lib/templates.ts` — exports the four preset templates as a typed const (id, label, ordered column titles).
- `src/lib/room.ts` — single module covering everything room-related: id helpers (`generateRoomId`, `isRoomId`), the `openRoomDoc(id)` factory wiring `y-indexeddb` and `y-websocket` (`VITE_RELAY_URL`, default `ws://localhost:1234`), seed/read helpers (`seedRoom` is idempotent so joiners can't clobber the facilitator's choices), the per-tab session singleton (`ensureRoom`/`leaveRoom`), and Svelte readable stores derived from the `Y.Doc` (`roomMetaStore`, `columnsStore`, `participantsStore` driven by awareness).
- `src/lib/displayName.ts` — `getDisplayName()` / `setDisplayName(value)` against `localStorage`, with SSR guard.
- `src/routes/+layout.svelte`, `src/routes/+layout.ts` — minimal shell; `ssr=false` for room routes (CRDT is browser-only in v1).
- `src/routes/+page.svelte` — root route is the create form (room name required + template picker, defaults to *Went well / Didn't / Actions*). On submit: generates a room id, opens the doc, seeds it, navigates to `/r/<id>`. With only one entry-action there's no separate landing page.
- `src/routes/r/[id]/+page.ts` — load: validates that `id` is a UUID v4; 404s otherwise.
- `src/routes/r/[id]/+page.svelte` — room view. If no display name is set in `localStorage`, renders an inline name-prompt that on submit persists the name and reveals the room. Otherwise shows the room shell directly: header with room name + copyable shareable URL, column layout with empty placeholders, participants list (driven by awareness). No card UI yet.

**Tests**

- `src/lib/templates.test.ts` — every preset has 1+ columns, unique column ids, expected labels.
- `src/lib/room.test.ts` — generated ids match the UUID-v4 regex and are unique; the validator accepts generated ids and rejects malformed ones; seeding an empty doc populates meta+columns; seeding a populated doc is a no-op; unknown template id throws.
- `src/lib/displayName.test.ts` — round-trip; absent value returns `null`; SSR-safe (no `localStorage`) returns `null` rather than throwing.
- `src/routes/create/page.test.ts` *(component)* — empty name blocks submit; valid form emits a navigation target matching `/r/<uuid>`.
- `src/routes/r/[id]/page.test.ts` *(component)* — with no display name in `localStorage`, the name-prompt renders; submitting persists the name and reveals the room shell; with a name already set, the gate is skipped.
- `e2e/create-and-join.spec.ts` — two-context flow: context A creates a room with the *Start / Stop / Continue* template and grabs the URL from the address bar; context B opens that URL, enters a name; both contexts see each other in the participant list and identical column titles.
- `e2e/persistence.spec.ts` — context A creates a room, reloads, and the room shell + display name are still there. Weaker than the originally planned "offline-reload" (we can't cleanly disable the relay mid-test in Playwright 1.47), but still asserts persistence-across-reload. Strengthen once `page.routeWebSocket` is available.

**Relay (separate package)**

- `relay/package.json` — depends on `y-websocket`; `start` script invokes the bundled `y-websocket` binary directly (no glue file needed; was originally planned as `relay/server.ts` ~20 lines).
- `relay/README.md` — one paragraph: "dev-only, in-memory, restart wipes state."

**Docs**

- `docs/plan.md` — update the *Architecture* section to describe the pinned stack (Yjs + IndexedDB + WebSocket relay; awareness for presence) and remove the corresponding entries from *Open decisions*. Same commit as the wiring code.

## Test plan

- **Unit (Vitest):** `templates`, `id`, `seed`, `displayName` as listed above.
- **Component (Vitest + `@testing-library/svelte`):** `create` form validation + navigation; room-route display-name gate (prompt when no name; skip when name already saved; submission persists name and reveals room).
- **E2E (Playwright):** two-context create+join happy path; solo offline-reload.
- **Manual verification:**
  1. `pnpm install` from clean clone — succeeds.
  2. `pnpm dev:all` launches both SvelteKit and the relay; landing page renders at `http://localhost:5173`.
  3. Create a room with each preset template — URL becomes `/r/<uuid>`, columns render with the expected titles.
  4. Copy the URL into a second browser, enter a different name at the prompt — both browsers see two participants and the same room name/columns.
  5. DevTools → Network → "Offline" on browser A, edit nothing, reload — room shell still renders; awareness shows only B; on going back online both reconcile and see two participants again.
  6. `pnpm check`, `pnpm lint`, `pnpm test:unit`, `pnpm test:e2e` all pass.

## Open questions

_None blocking — defaults locked in:_

- **Custom columns at creation:** deferred to a follow-up feature `custom-room-columns`. R3's preset half ships here; the custom half does not.
- **Dev script:** single combined `pnpm dev:all` via `concurrently`.
- **Display-name uniqueness within a room:** allow collisions (two "Dillon"s coexist). Revisit when card authorship gets richer.
- **Relay persistence between sessions:** in-memory only for v1; documented in `relay/README.md`. Cross-session persistence is already a PRD-level open question for later.
- **Deploy adapter:** keep `@sveltejs/adapter-auto` until a deploy target is picked.

## Rollout / commit plan

Each step a single, independently-reviewable commit:

1. **Scaffold SvelteKit + tooling.** `package.json`, configs, empty placeholder routes, `pnpm install`, `pnpm check` clean. No app behavior yet.
2. **Wire Vitest + Playwright** with one trivial passing test each, so CI/test commands work end-to-end.
3. **Update `docs/plan.md`** to pin Yjs + `y-indexeddb` + `y-websocket` and the awareness/anonymous identity model; remove those entries from *Open decisions*.
4. **Add preset templates** (`src/lib/templates.ts`) + tests.
5. **Add room-id generator** (`src/lib/room/id.ts`) + tests.
6. **Add display-name helper** (`src/lib/identity/displayName.ts`) + tests.
7. **Add Y.Doc factory + seed** (`src/lib/room/doc.ts`, `src/lib/room/seed.ts`) + seed tests.
8. **Add relay package** (`relay/`) and `pnpm dev:all` script (`concurrently`).
9. **Add Create flow at the root route** (`src/routes/+page.svelte`) + component test. (Originally split into a landing page + a separate `/create` route; collapsed in a follow-up commit because the landing had only one CTA — the root route *is* the create form.)
10. **Add Room shell + display-name gate** (`src/routes/r/[id]/+page.svelte` + load) wiring stores → UI + component test.
11. **Add e2e** (`e2e/create-and-join.spec.ts`, `e2e/persistence.spec.ts`).
