# Feature: Custom columns (with template history)

## Context

R10 calls for custom column definitions at room creation. Investigating the existing code surfaced a deeper issue: `meta.templateId` (and `RoomIndexEntry.templateId`) is a foreign key into the hardcoded `PRESET_TEMPLATES` array. That works for the four shipped presets but does not generalize to user-defined columns — there is no permanent id we can look up to recover a template's shape. The columns themselves are already stored in the Yjs doc; `templateId` is a denormalized label whose only consumer is the dashboard tile.

This feature ships R10 by **removing `templateId` from the persisted model entirely** and making templates a pure-UI concept derived from (a) the four hardcoded presets and (b) the user's local retro history. The create-room modal gets a richer picker: three most-recently-used templates inline, plus a "More templates" affordance that opens an aggregated list (Yours + Presets) with a "Create new template" button leading to the column editor.

## Requirement traceability

- Maps to PRD section(s):
  - **R10 — Custom columns.** Facilitator may define 1–6 columns with custom titles at room creation.
  - **R1 — Create a room.** Refines the create flow: template picker now surfaces both presets and the user's prior custom templates.
  - **R3 — Preset templates.** Still ships the four built-in presets; they are starting points, not load-bearing identifiers.
  - **R11 — Dashboard.** Tile subtitle now derives from `columnTitles` (preset-derived or custom) instead of looking up a preset id.
- Out of scope:
  - Editing columns after a room is seeded (R10 reads "at room creation"; immutable thereafter).
  - Sharing templates across devices or accounts (no accounts in v1).
  - Naming/renaming templates as a separate management surface — naming is one optional input in the column editor; templates are not first-class persisted objects.
  - Migration of pre-existing `templateId`-shaped localStorage entries (no live users; user will clear local storage).

## Design

Templates become a pure presentation concept: `{ key, label, columns: { title: string }[] }`. The `key` is a deterministic hash of the (trimmed, lowercased) column titles in order, so two retros created with the same titles share a template. Presets ship with their key as a stable string. Custom templates' keys are computed.

The Yjs doc no longer stores `templateId`. `seedRoom` accepts `columns: { title: string }[]` directly and generates per-column UUIDs at seed time. `RoomIndexEntry` gains `columnTitles: string[]` (required) and `templateName?: string` (optional user-given name, preserved for picker display only). The picker's "Yours" section aggregates unique templates from the local retro index, deduped by key, sorted by most-recent `lastOpenedAt`.

**Alignment with `docs/architecture.md`.**
- *Top-level Yjs schema* (architecture.md §Architecture): `meta` keeps `name`, `phase`, `votesPerParticipant`; `templateId` is removed. Columns remain a `Y.Array<Y.Map>` with `{ id, title, cards }`. The doc-level shape is unchanged otherwise.
- *Flat `src/lib/` structure*: new files (`TemplatePickerModal.svelte`, `ColumnEditor.svelte`) live in `src/lib/` next to `CreateRoomModal.svelte`.
- *Design tokens*: new UI uses existing `--space-*`, `--font-size-*`, `--icon-size-*`, `--color-*` tokens.
- *Tests live next to code*: `*.test.ts` colocated with new components and helpers.
- *Plan-doc update*: §Architecture's "Top-level shared types on the room doc" bullet currently mentions `meta` carrying the template selection — that note will be updated in the same change to reflect that columns are the source of truth.

**Alternatives considered.**
- *Keep `templateId`, add a reserved `'custom'` value.* Rejected: still treats templates as load-bearing ids; doesn't generalize to per-user template history; needs special-cased fallback in every read site.
- *Persist templates as first-class objects in a separate localStorage key.* Rejected: requires explicit name/delete UX; current rooms-as-source-of-history works because rooms already carry the column data.
- *Use the room's Yjs doc as the source of column titles for the index.* Rejected: would force every dashboard render to open every doc; denormalizing titles into the index entry (small, immutable per room) is cheaper and matches how `phase` is already mirrored.

## File-level changes

**Schema / data layer**

- `src/lib/templates.ts` — refactor.
  - `Template` becomes `{ key: string; label: string; columns: { title: string }[] }` (no per-column `id`; ids minted at seed time).
  - `PRESET_TEMPLATES` keeps its four entries; `id` field renames to `key`.
  - New: `templateKeyFromTitles(titles: string[]): string` — normalize (trim, lowercase, collapse whitespace) and FNV-1a hash via the existing `hashString` from `src/lib/hash.ts`.
  - New: `deriveTemplateLabel(titles: string[]): string` — join with ` / `, truncate past ~48 chars with an ellipsis.
  - New: `recentTemplates(rooms: RoomIndexEntry[], limit = 3): Template[]` — for each room in `lastOpenedAt`-desc order, dedupe by key, return up to `limit`. Pad with presets (in preset order) if fewer.
  - New: `aggregatedTemplates(rooms: RoomIndexEntry[]): { yours: Template[]; presets: Template[] }` — `yours` = unique non-preset templates from history (sorted by most-recent use); `presets` = `PRESET_TEMPLATES`.

- `src/lib/rooms.ts` — schema change to `RoomIndexEntry`.
  - Drop `templateId`.
  - Add `columnTitles: string[]` (required; non-empty array of non-empty strings).
  - Add `templateName?: string` (optional).
  - Update `isEntry` validator accordingly; no migration path — bad entries are dropped.

- `src/lib/room.ts` — drop `templateId` from the persisted model.
  - Remove `templateId` from `MetaShape`, `SeedParams`, `RoomMetaSnapshot`.
  - `SeedParams.columns: { title: string }[]` replaces `templateId`.
  - `seedRoom` validates `columns.length` between 1 and 6 and every `title.trim()` non-empty; generates `crypto.randomUUID()` for each column id; writes columns straight into the Yjs array.
  - `readRoomMeta` no longer reads/returns `templateId`.
  - Remove `getTemplate` import.

**Create-room flow**

- `src/lib/CreateRoomModal.svelte` — replace the template grid.
  - Reads the rooms index via `listRooms()` on open.
  - Renders up to 3 recent-template cards (from `recentTemplates(rooms, 3)`) plus a "More templates" card.
  - Selecting a card sets local `selectedTemplate: Template`. The card grid retains the existing card visuals (label + column chips).
  - "More templates" opens `TemplatePickerModal`.
  - On submit: `seedRoom(doc, { name, columns: selectedTemplate.columns, votesPerParticipant })`; `upsertRoom({ id, name, columnTitles: selectedTemplate.columns.map(c => c.title), templateName: <only if user-named>, lastOpenedAt, phase })`.

- `src/lib/TemplatePickerModal.svelte` *(new)* — secondary `<dialog>` modal.
  - Two sections: **Yours** (custom templates from history, sorted by recency) and **Presets** (the four hardcoded). Empty Yours section is hidden.
  - Each row: label + column chips + a select button (or whole-row click).
  - Bottom: a "Create new template" button that opens `ColumnEditor` inside the same dialog.
  - On select / on column-editor save: calls back to `CreateRoomModal` with the chosen `Template` and closes.

- `src/lib/ColumnEditor.svelte` *(new)* — inline editor used by the picker.
  - Optional `Template name` text input (placeholder: `"Optional — leave blank to use column titles"`).
  - 1–6 title inputs, each with a remove (×) button (disabled when only one row remains). An "Add column" button (disabled at 6 rows). Reorder is out of scope.
  - Validation: at least one non-empty trimmed title; per-row errors for empty rows when present.
  - On save: emits `{ key: templateKeyFromTitles(titles), label: name?.trim() || deriveTemplateLabel(titles), columns: titles.map(title => ({ title })) }`.

**Room route**

- `src/routes/r/[id]/+page.svelte` — drop `templateId` from the index-write callsite.
  - Subscribe to both `roomMetaStore` and `columnsStore`; on phase change (or first observation), `upsertRoom({ id, name, columnTitles: cols.map(c => c.title), templateName: <preserved from existing entry if present>, lastOpenedAt, phase })`.
  - `templateName` preservation: read the existing entry via a new `getRoom(id)` helper in `rooms.ts` (small addition) and pass it through; this keeps a user-named template's name on subsequent opens.

**Dashboard**

- `src/lib/RoomTile.svelte` — replace `PRESET_TEMPLATES.find(...)?.label` lookup with `entry.templateName ?? deriveTemplateLabel(entry.columnTitles)`.

**Docs**

- `docs/architecture.md` — update the "Top-level shared types on the room doc" bullet to note that `meta` carries `{ name, phase, votesPerParticipant }` only, and columns are the sole source of truth for room shape. Same commit as `room.ts` changes.

**Existing files unchanged (verified):** `src/lib/Card.svelte`, `src/lib/RetroCard.svelte`, `src/lib/Toast.svelte`, `src/lib/displayName.ts`, `src/lib/participantColor.ts`, voting & phase machinery — these never read `templateId`.

## Test plan

**Unit (Vitest):**
- `templates.test.ts` — preset shape (no per-column ids); `templateKeyFromTitles` is order-sensitive and case-insensitive on titles; same titles in same order → same key; preset key matches `templateKeyFromTitles(preset.columns.map(c => c.title))`; `deriveTemplateLabel` joins with ` / ` and truncates; `recentTemplates` returns the most-recent N unique templates and pads with presets; `aggregatedTemplates` partitions Yours/Presets correctly and dedupes a user template whose titles match a preset (it stays in Presets, not Yours).
- `rooms.test.ts` — new schema accepted; entries missing `columnTitles` or with malformed `columnTitles` rejected; `templateName` round-trips when present.
- `room.test.ts` — `seedRoom` writes the supplied columns and rejects `columns.length === 0` or `> 6`; trimmed titles persisted; `readRoomMeta` returns no `templateId`; previously-`templateId`-dependent paths gone.

**Component (Vitest + Testing Library):**
- `CreateRoomModal.test.ts` — empty name blocks submit (unchanged assertion); with no history, the three "recent" cards are presets in preset order; selecting one and submitting calls `seedRoom` with `{ name, columns, votesPerParticipant }` and `upsertRoom` with `columnTitles`; "More templates" opens the picker.
- `TemplatePickerModal.test.ts` — *(new)* — sections rendered conditionally (Yours hidden if empty); selecting a row closes the modal and reports the chosen template; "Create new template" reveals the column editor.
- `ColumnEditor.test.ts` — *(new)* — starts with one empty row; "Add column" caps at 6; remove button disabled at one row; submit blocks when all rows are empty; trimmed titles flow through; optional name flows through.
- `RoomTile.test.ts` — uses `templateName ?? deriveTemplateLabel(columnTitles)` correctly.

**E2E (Playwright):**
- `e2e/custom-columns.spec.ts` *(new)* — facilitator opens "More templates" → "Create new template", enters 4 custom titles, saves, completes room creation; both URL navigation works and the room shell renders four columns with those titles. Subsequent room-creation opens of the modal show that template in the recent-three slots.

**Manual verification:**
1. `pnpm dev:all`; open `/`; clear localStorage; verify modal shows three presets + "More templates".
2. Click a preset → create a room → confirm room columns match.
3. Back on `/`, open modal → "More templates" → "Create new template"; add titles `Mind / Body / Soul / Vibe`, save (no template name).
4. Confirm modal now lists the custom template in "Yours" section; create a room from it.
5. Reload `/`; confirm dashboard tile subtitle shows `Mind / Body / Soul / Vibe`.
6. Open modal again; the custom template is one of the recent three.
7. Repeat with an optional template name; verify it shows in picker and on the dashboard tile.
8. `pnpm check`, `pnpm lint`, `pnpm test:unit`, `pnpm test:e2e` clean.

## Rollout / commit plan

Sequenced so each commit leaves the app green:

1. **Refactor `templates.ts` shape** — rename `id` → `key`, drop per-column ids from preset definitions, add `templateKeyFromTitles` / `deriveTemplateLabel` / `recentTemplates` / `aggregatedTemplates`. Update preset consumers in the same commit. Tests updated.
2. **Drop `templateId` from `room.ts` + architecture.md** — change `MetaShape`, `SeedParams`, `RoomMetaSnapshot`; `seedRoom` accepts `columns`; remove `getTemplate` call. Update `docs/architecture.md` Architecture bullet. Tests updated.
3. **Switch `rooms.ts` schema** — `templateId` → `columnTitles` + optional `templateName`; add `getRoom(id)` helper. Tests updated. Bump validator strictly (no migration).
4. **Wire dashboard + room route to new schema** — `RoomTile` uses `deriveTemplateLabel(columnTitles)`; `+page.svelte` writes `columnTitles` / preserves `templateName`. Tests updated.
5. **CreateRoomModal: recent-three picker** — render `recentTemplates(listRooms(), 3)` + "More templates" placeholder card (button disabled until step 6). Tests updated.
6. **Add `TemplatePickerModal`** — Yours/Presets sections + select; no editor yet. "Create new template" button disabled. Tests added.
7. **Add `ColumnEditor`** — inline editor with 1–6 rows + optional name; wire to "Create new template" button. Tests added.
8. **E2E: `e2e/custom-columns.spec.ts`** — end-to-end custom template creation + reuse.

## Open questions

_None blocking. Decisions locked in via clarification:_

- Template identity = deterministic key over normalized titles; no naming required, but optional template name supported.
- Picker shows three recent templates (padded with presets); More-templates modal groups Yours then Presets; column editor supports add/remove with per-row remove.
- No localStorage migration — pre-launch, user will clear local storage.
- Columns are immutable after room creation (R10 explicitly says "at room creation").
