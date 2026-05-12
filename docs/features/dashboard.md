# Feature: Dashboard for past retros

## Requirement traceability

- Maps to PRD section(s):
  - **R11 — Dashboard.** The root route `/` presents a tile grid of retros the user has on this device, sorted by most-recently-opened, with a "New Retro" tile that opens the create-room modal. Tiles show name, template, and a relative timestamp.
  - **R1 — Create a room.** The create form (already implemented) is lifted out of the root route and reached through the dashboard's "New Retro" modal instead.
  - **R2 — Join a room.** A user who joins via a shared `/r/<id>` link gets that room on their dashboard automatically; the room appears the next time they visit `/`.
  - **R9 — Room lifecycle.** Closed rooms remain in the dashboard and load `/r/<id>` in their last-known state. (The existing room view already renders the closed phase; no changes there.)
- Out of scope for this feature:
  - Removing tiles from the dashboard ("forget this retro"). `removeRoom` exists in the index API but has no UI surface in v1.
  - Filtering, search, pagination.
  - Phase badges on tiles. The room view handles state display; the dashboard intentionally keeps tiles lightweight.
  - Cleaning up tiles whose underlying IndexedDB doc has been evicted by the browser. Defer until observed.

## Design

`/` becomes a dashboard. The current single-card create form (`src/routes/+page.svelte`) is lifted into a `CreateRoomModal.svelte` component reached by clicking the first tile in the grid ("New Retro"). The remaining tiles are rendered by a new `RoomTile.svelte`, one per retro the user has on this device.

**Discovery mechanism.** The relay is not a system of record (PRD non-goal: *Long-term cloud archival*), so there is no global "my retros" list to fetch. Rooms in the dashboard are exactly the rooms whose state is in this browser's IndexedDB. Rather than enumerate IndexedDB at every page load — y-indexeddb stores Yjs updates, not metadata we can render cheaply — the dashboard reads a **sidecar `localStorage` index** keyed `loco_retro:rooms`. The index is a denormalized cache of (id, name, templateId, lastOpenedAt). Canonical state still lives in the Yjs doc; the sidecar only exists to make the grid render without opening N docs.

The sidecar is written in two places:

- **On create**, inside the modal's submit handler — immediately after `seedRoom(...)` succeeds, before navigation.
- **On open**, inside `src/routes/r/[id]/+page.svelte` — once `roomMetaStore` emits a snapshot with a name, we `upsertRoom(...)`. This covers both "I already had this room" (refreshes `lastOpenedAt`) and "someone shared the link with me" (first-time insert).

The sidecar can drift from the Yjs doc (e.g. a facilitator renames the room and the user never revisits to refresh the index). That's an acceptable cost — the next open trues it up. The Yjs doc remains authoritative.

**Tile content.** Name, template label (resolved via `PRESET_TEMPLATES`; falls back to the raw templateId for future custom-column rooms under R10), and a relative "last opened" string ("just now" / "5m ago" / "2d ago" / locale date past 30d). No phase badge.

**Modal.** Native `<dialog>` element via `showModal()` for free focus trap, ESC-to-close, and ARIA roles. No a11y library needed.

**Alternatives considered.**

- *Enumerate IndexedDB at dashboard mount.* Rejected. We'd need to call `indexedDB.databases()`, open each Yjs doc, wait for it to hydrate, and read `meta`. That's slow with many rooms and brittle (DB list isn't supported uniformly across browsers in Safari/Firefox private modes). The sidecar makes the read O(1) and the drift cost is bounded.
- *Yjs index doc shared across the browser.* Rejected. A second `Y.Doc` would invite the same `y-partykit`/`y-indexeddb` machinery for a strictly local list — overkill for what's effectively a flat array in `localStorage`.
- *Dedicated `/create` route instead of a modal.* Rejected (user preference). The "New Retro" affordance is framed as a tile; a modal sits naturally inside the grid without forcing another routing surface or a back-button discontinuity.
- *Phase badge on tile.* Rejected (user preference). Adds a state we'd have to keep fresh in the sidecar and crowds the tile. Trivially re-addable later by extending `RoomIndexEntry`.

## File-level changes

All files are new unless noted.

**App code**

- `src/lib/rooms.ts` — sidecar index: `RoomIndexEntry` type, `listRooms()`, `upsertRoom(entry)`, `touchRoom(id)`, `removeRoom(id)`, and a `formatRelative(ms)` helper. Storage access mirrors `src/lib/displayName.ts:4` so SSR / private-mode browsers return `[]` rather than throw. Malformed JSON in the storage slot is tolerated by returning `[]` and overwriting on next write.
- `src/lib/CreateRoomModal.svelte` — lifted from the current root-route form. Props: `{ open: boolean, onClose: () => void }`. Uses `<dialog>` + `showModal()/close()`. On submit: same validation as today, generate a room id, `ensureRoom`, `seedRoom`, `upsertRoom`, `goto('/r/<id>')`; error handling matches the current `leaveRoom()`-on-fail behavior in `src/routes/+page.svelte:38-45`.
- `src/lib/RoomTile.svelte` — tile component. Props: `{ entry: RoomIndexEntry }`. Renders name (clamped to two lines), resolved template label, relative timestamp. Click navigates via `goto('/r/' + entry.id)`. The tile itself is a `<button>` for keyboard a11y.
- `src/routes/+page.svelte` — rewritten as the dashboard. `onMount` reads `listRooms()`; the page renders a CSS grid with the "New Retro" tile first and one `RoomTile` per entry. Modal state is local. When the modal closes (e.g. user cancels), the dashboard re-reads `listRooms()` so a just-created room appears immediately (though in practice we navigate away on submit). Page width cap is removed so the grid can breathe; empty state shows just the "New Retro" tile centered with a one-line hint.
- `src/routes/r/[id]/+page.svelte` — *modified.* Add `upsertRoom(...)` once the first `roomMetaStore` snapshot with a non-empty name arrives. Use a local "touched" boolean so we only fire once per mount.

**Tests**

- `src/lib/rooms.test.ts` — unit tests for the sidecar index: insert + update path of `upsertRoom`, sort order of `listRooms`, `touchRoom` no-ops on missing id, `removeRoom`, malformed JSON tolerance, SSR safety. Also covers `formatRelative` edge cases (now, sub-minute, hours, days, > 30d fallback).
- `src/lib/RoomTile.test.ts` *(component)* — renders name, resolves template label from `PRESET_TEMPLATES`, falls back to raw id for unknown templateIds, click triggers navigation.
- `src/routes/page.test.ts` *(component)* — empty state when index is empty; renders one tile per entry; clicking the "New Retro" tile opens the modal.
- `e2e/dashboard.spec.ts` — fresh browser context: dashboard is empty → create a retro via the modal → land on `/r/<id>` → navigate back to `/` → tile appears with the right name and "just now"; reload preserves the tile.

**Docs**

- `docs/prd.md` — add R11, append the cross-device non-goal, light edit to R1. (Same commit as the feature work, per the spec-first workflow.)

## Test plan

- **Unit (Vitest):** `src/lib/rooms.test.ts` covers all branches of the sidecar index module + `formatRelative`.
- **Component (Vitest + `@testing-library/svelte`):** `RoomTile` rendering + click behavior; dashboard page empty-state + modal-open behavior.
- **E2E (Playwright):** `dashboard.spec.ts` exercises the create → navigate → return → tile-visible loop.
- **Manual verification** (`pnpm dev:all`):
  1. Fresh browser → `/` shows only the "New Retro" tile + hint text.
  2. Click "New Retro" → modal opens, focus is trapped, ESC closes.
  3. Create a retro → lands on `/r/<id>` → navigate back to `/` → tile visible with correct name, template, "just now".
  4. Advance the room to `closed`, return to `/`, click the tile → opens in closed state.
  5. Open `/r/<fresh-uuid>` directly (simulating a shared link) and join → return to `/` → second tile appears at top of grid.
  6. Reload `/` → tiles persist.
  7. Resize viewport — grid reflows down to single column on narrow screens.

## Open questions

_None blocking._

- Whether to eventually let users hide / delete tiles. `removeRoom` is in the API for this; the UI is deferred.
- Whether `lastOpenedAt` should also bump when the doc is touched by background sync, not just when the route mounts. Probably not — "last opened" framing is what the user sees and acts on.

## Rollout / commit plan

Each step a single, independently-reviewable commit:

1. **PRD update + feature plan** (`docs/prd.md` R11/non-goal/R1, this file).
2. **Sidecar index** (`src/lib/rooms.ts` + `src/lib/rooms.test.ts`).
3. **CreateRoomModal component** — lifted form, no route change yet (still imported by the legacy root page for sanity).
4. **RoomTile component** (`src/lib/RoomTile.svelte` + `src/lib/RoomTile.test.ts`).
5. **Dashboard route** (rewrite `src/routes/+page.svelte`, retire the legacy form path, add `src/routes/page.test.ts`).
6. **Hook `/r/[id]` to upsertRoom** so opened-via-link rooms enter the dashboard.
7. **E2E** (`e2e/dashboard.spec.ts`).
