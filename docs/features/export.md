# Feature: Export retro (PDF / CSV / Markdown)

## Context

Today, a retro lives only in each participant's browser (Yjs in IndexedDB) plus the Cloudflare Durable Object's best-effort snapshot. There's no way to take the artifact out of the app — read it back next sprint, paste it into Slack/Notion, attach it to a sprint summary, or share it with someone who wasn't in the room. R12 fills that gap: a single Download affordance from inside any room, in any phase, that produces a portable snapshot of the current Yjs state.

We deliberately keep this local-first: the export reflects *the requester's view of the CRDT at click time*, with no server round-trip. That keeps it consistent with the rest of the app's offline-tolerant posture.

## Requirement traceability
- Maps to **PRD R12** (`docs/prd.md:49`): _"From an open room, any participant can download the current retro state in their choice of PDF, CSV, or Markdown. Exports include the room name, template/columns, cards (with author attribution), vote totals, and discussed indicators. Export is a local operation — it reflects the requester's current view of the CRDT state and does not require the room to be closed."_
- Out of scope for this feature:
  - Server-side rendering of exports (PRD: local operation only).
  - Cloud archival / sharing of generated files (PRD non-goal).
  - Per-ballot exports (PRD R6: ballot privacy is a UI convention — exports show aggregate totals only).
  - Bulk export from the dashboard (R11 dashboard scope; export is an in-room action).
  - Re-importing an exported retro back into the app.

## Design

**Approach.** One new header button (`Download` icon from `lucide-svelte`) sits to the right of the existing Share2 button in `src/routes/r/[id]/+page.svelte`. Clicking it opens a small `<dialog>` (`ExportModal.svelte`) that mirrors `TemplatePickerModal.svelte`: three selectable cards labelled **PDF**, **CSV**, **Markdown**, plus Cancel / Export actions in the footer. Confirming dispatches one of three flows:

- **CSV** — a pure function (`buildCsv(snapshot)`) generates a string, wrapped in a Blob and downloaded via a temporary `<a download>` click.
- **Markdown** — same pattern, via `buildMarkdown(snapshot)`.
- **PDF** — opens a new tab at `/r/<id>/export/print`. That route loads the room CRDT from IndexedDB (same `ensureRoom` path as the live room), renders a stripped-down print-friendly view, and calls `window.print()` on first paint. The user picks "Save as PDF" in the browser's native print dialog. No PDF library, no extra bundle weight.

A new `src/lib/exporters.ts` module holds the pure builders + a tiny `downloadBlob(blob, filename)` helper + a `buildSnapshot(doc)` function that walks the existing `readRoomMeta` / `readCards` / `readVoteTotals` helpers (`src/lib/room.ts`) into a single POJO consumed by all three formats. The print route, CSV builder, and Markdown builder all read from this same snapshot — one source of truth for what an "export" sees.

**How it aligns with `docs/plan.md`:**
- *Local-first sync model* (plan.md:22-26): exports read from the local Yjs doc — no server, no relay round-trip. Works offline.
- *Flat `src/lib/` structure* (plan.md:38): new files (`exporters.ts`, `exporters.test.ts`, `ExportModal.svelte`, `ExportModal.test.ts`) live at the top level of `src/lib/`, prefix-disambiguated.
- *Design tokens* (plan.md:39): the new modal and Download header button consume existing CSS variables — no raw literals introduced.
- *Routes that touch CRDT state are client-rendered* (plan.md:29): the new `/r/[id]/export/print` route gets `export const ssr = false` and `export const prerender = false`, matching the existing room route's posture.
- *Icons*: per-icon `lucide-svelte/icons/<name>` imports — `Download` for the header button, `FileText` / `FileSpreadsheet` / `FileType2` (or similar) for the three format cards.
- *Tooltip portal target* (plan.md:42): the Download button uses `use:tooltip={'Export retro'}` so it appends to body (not inside a dialog).

**Alternatives considered:**
- **`jspdf` / `pdf-lib` PDF library** — true single-click PDF download. Rejected: adds 150–300 KB to the bundle, lazy-load complexity, and the print route gives objectively better typography for free. The "two clicks" cost (Save as PDF in print dialog) is acceptable for an action used a few times per retro.
- **Three header buttons (one per format)** — direct, no modal. Rejected: visual noise, three glyphs in the header, doesn't scale if we add formats later.
- **Split-menu dropdown** — one click per format. Rejected: no menu primitive exists in the codebase, would have to be invented for one use case.
- **Encode format in `?print=md` query on the existing room page** — avoids a new route. Rejected: the print view needs different CSS, no chrome, and a different `ssr` posture; a dedicated route is cleaner than conditionally swapping the whole page shell.
- **Format-picker triggers export immediately on card click (no separate Export button)** — fewer clicks. Rejected: out of step with `TemplatePickerModal`'s select-then-confirm pattern; risks accidental downloads on a stray click.

## File-level changes

**New:**
- `src/lib/exporters.ts` — `buildSnapshot(doc)`, `buildCsv(snapshot)`, `buildMarkdown(snapshot)`, `slugifyRoomName(name)`, `exportFilename(name, ext, now)`, `downloadBlob(blob, filename)`. Pure functions (modulo `downloadBlob`'s DOM use). No Yjs imports beyond `Y.Doc` typing; consumes existing `readRoomMeta` / `readCards` / `readVoteTotals` from `src/lib/room.ts` and `deriveTemplateLabel` from `src/lib/templates.ts`.
- `src/lib/exporters.test.ts` — Vitest unit tests for the pure builders + slug helper.
- `src/lib/ExportModal.svelte` — `<dialog>` with three format cards (selectable, like `TemplatePickerModal`) and Cancel / Export footer. Props: `open: boolean`, `onClose: () => void`, `onConfirm: (format: 'pdf' | 'csv' | 'md') => void`. Reuses `CardSurface` for the format cards.
- `src/lib/ExportModal.test.ts` — open/close, selection, confirm callback fires with chosen format.
- `src/routes/r/[id]/export/print/+page.svelte` — minimal print layout: room name, template label, export timestamp, then one section per column with cards sorted by votes desc, each card showing text + author + vote total + discussed mark. No header/chrome/phase controls. Calls `window.print()` after the doc has settled (one tick after first paint).
- `src/routes/r/[id]/export/print/+page.ts` — `export const ssr = false`, `export const prerender = false`, same `isRoomId` guard as the existing room page (so `/r/<bad-id>/export/print` 404s consistently).
- `src/routes/r/[id]/export/print/print.test.ts` — Vitest smoke test that the print page renders the expected room title + column headers from a seeded Yjs doc.
- `e2e/export.spec.ts` — Playwright flows for CSV download, Markdown download, and PDF print route.

**Modified:**
- `src/routes/r/[id]/+page.svelte` — import `Download` icon and `ExportModal`; add the Download `.link` button to the `.title` block right after the Share2 button (`+page.svelte:341-349`); add `showExportModal` state; on confirm, dispatch CSV/MD via `downloadBlob` + show toast, or `window.open('/r/<id>/export/print', '_blank')` for PDF; reuse the existing `showToast('success'|'error', message)` plumbing (`+page.svelte:57-64`).
- `docs/plan.md` — append a one-line entry under **Conventions** describing the export module pattern (single `buildSnapshot` → format-specific builders) and the print-route convention (`/r/[id]/export/print`, `ssr=false`, `prerender=false`). Updated in the same commit that lands the route.
- `src/setup-tests.ts` — only if needed: stub `window.print` to a no-op so the print route's auto-print doesn't blow up in jsdom.

**Reused (no changes):**
- `src/lib/room.ts:232-244` `readRoomMeta`, `:399-406` `readCards`, `:482-490` `readVoteTotals` — snapshot inputs.
- `src/lib/templates.ts:29` `deriveTemplateLabel` — human-readable template label for headers.
- `src/lib/CardSurface.svelte` — base for the three format cards in the modal.
- `src/lib/tooltip.ts` `tooltip` action — for the header Download button.
- `src/lib/Toast.svelte` + the `showToast` helper in `+page.svelte:57-64` — success/error feedback.

## Format details (defaults — confirm in Open Questions)

**CSV** — one row per card. Columns: `Column, Card, Author, Votes, Discussed`. RFC 4180 quoting: wrap in `"..."` if the value contains `,`, `"`, or newline; double internal `"`. `Discussed` is `yes` / empty. Header row first; one-line preamble (`# Room: <name> — Exported <ISO>`) is **omitted** so the file parses as plain CSV in any tool.

**Markdown** — H1 for the room name, then a metadata block (template, phase, export timestamp, room URL). One H3 per column. Cards as `- ` bullets, in the form `- <text> — _<author>_ · <N> votes · ✓ discussed`. Empty columns render the H3 with `_(no cards)_` underneath. Vote count omitted when 0; discussed mark omitted when not discussed.

**PDF (print route)** — Same content as Markdown but laid out for print: room name as page title, metadata block top-right, columns rendered as stacked sections with their cards listed beneath. Uses the existing CSS tokens and a `@page` rule for margins. A single `Print` button at the top-right of the print view, hidden via `@media print`, in case the auto-print dialog is dismissed.

**Sort order (all three formats)** — Cards within each column sorted by `votes desc`, ties broken by `createdAt asc`. Matches the Discuss view ordering and is the most useful default when the export is read post-retro. Columns stay in the order defined on the room.

**Filename** — `<slug>-<YYYY-MM-DD>.<ext>` where `slug = lowercase, non-alphanumeric → '-', collapse repeats, trim '-'`. Empty room name → `retro`.

## Test plan

**Unit (Vitest) — `src/lib/exporters.test.ts`:**
- `buildCsv` golden cases:
  - Standard room (preset template, mixed votes, some discussed).
  - Empty room (no cards in any column).
  - Custom columns (5 columns, varied titles).
  - Chris mode (uncapped votes; the value is metadata, doesn't change the rows).
  - Closed phase room.
  - Special chars: card text contains `,`, `"`, and `\n` — verify RFC 4180 quoting.
  - Card sort: cards within a column ordered by votes desc, ties by createdAt asc.
- `buildMarkdown` golden cases:
  - Same matrix as CSV plus: vote-count line suppressed when 0; "✓ discussed" mark only when discussed.
  - Empty column renders `_(no cards)_`.
- `slugifyRoomName`:
  - `"Sprint 42 Retro!"` → `"sprint-42-retro"`.
  - `"  "` → `"retro"`.
  - Unicode: `"Café ☕"` → `"caf"` (stripping non-ASCII alphanumerics; document this in a comment).
- `exportFilename`: format + date stamp + extension.

**Component (Vitest + Testing Library) — `src/lib/ExportModal.test.ts`:**
- Modal renders when `open=true`; calls `HTMLDialogElement.showModal` (polyfilled in `src/setup-tests.ts:6-22`).
- Three format cards present; clicking one applies the `selected` class.
- "Export" button disabled until a format is chosen.
- Clicking "Export" fires `onConfirm` with the selected format.
- Clicking "Cancel" or the dialog's `close` event fires `onClose` without firing `onConfirm`.

**Component (Vitest) — `src/routes/r/[id]/export/print/print.test.ts`:**
- Seed a fake Yjs doc via the same helpers used in `room.test.ts`; mount the print page; assert that the room name renders, that each column's H3 + cards appear, that `window.print` is called once after mount (stub the global).

**E2E (Playwright) — `e2e/export.spec.ts`:**
- **CSV flow:** create room → add 4 cards in 2 columns → vote → mark one discussed → click Download → choose CSV → confirm. Use `page.waitForEvent('download')`; assert filename matches `<slug>-<date>.csv`; read the download stream and parse with a tiny inline CSV reader; assert column headers + a few cell values.
- **Markdown flow:** same setup, choose MD; assert filename + content contains H1 room name and `- card text — _author_` lines.
- **PDF flow:** click Download → PDF; assert a new tab opens at `/r/<id>/export/print`; on that new page assert the room name + columns + cards render. Stub `window.print` on the print page (Playwright `page.addInitScript`) so the print dialog doesn't block.
- **Any-participant flow:** in a second browser context (no facilitator role), join the same room and confirm the Download button is visible and works — verifies the PRD "any participant" clause.
- **Closed-phase flow:** advance the room to `closed`, then export CSV. Confirms PRD "does not require the room to be closed" works in both directions.

**Manual verification:**
1. `pnpm dev:all`; visit `/`, create a room with the "Start / Stop / Continue" preset, name it "Sprint 42".
2. Add 3 cards in each column with different display names (open a second incognito window to join as a second participant).
3. Advance to Vote; cast a few votes from both participants.
4. Advance to Discuss; mark 2 cards discussed.
5. Click the Download icon in the room header → modal opens, select CSV, click Export → file `sprint-42-<today>.csv` downloads. Open in Numbers/Excel; verify the row shape and quoting.
6. Repeat for Markdown; paste the file contents into a Markdown previewer (or `pnpm dlx markdown <file>`) and visually verify.
7. Repeat for PDF; the new tab opens, print dialog appears immediately, choose "Save as PDF", verify the saved file looks clean and readable.
8. Advance to Closed and re-run the three exports — same content should produce, with `Phase: closed` in the metadata block.
9. Disable network in DevTools, then export CSV — should still work (local-first).

## Open questions

_All resolved — defaults confirmed before `/implement`._

1. **CSV shape** — one row per card. (Honours R6 ballot privacy; individual ballots never appear in exports.)
2. **Markdown layout** — H3 column headings + `- ` bullets per card. No Markdown table.
3. **Live room URL in metadata block** — yes, for PDF + Markdown. CSV stays headers-only so it parses cleanly in spreadsheet tools.
4. **`authorId` in CSV** — no, display name only.
5. **Card sort within a column** — primary `votes desc`, secondary `createdAt asc`.
6. **Print-route auto-print** — yes, fires automatically once the doc snapshot resolves. A `Print` button is still rendered (hidden under `@media print`) so a dismissed dialog can be re-triggered.
7. **Header icon** — `Download` from `lucide-svelte`. Revisit if visual feedback after launch suggests something clearer.

## Rollout / commit plan

Each commit independently reviewable; tests land with the code they cover.

1. **`feat(export): add pure CSV/Markdown builders + filename helper`** — `src/lib/exporters.ts` (no UI yet) + `src/lib/exporters.test.ts`. Covers the snapshot shape and both text format goldens.
2. **`feat(export): add ExportModal format picker`** — `src/lib/ExportModal.svelte` + `src/lib/ExportModal.test.ts`. Standalone modal, not yet wired up.
3. **`feat(export): wire Download button + CSV/MD flows on room page`** — modifies `src/routes/r/[id]/+page.svelte`; PDF option still a no-op (or opens a placeholder route). CSV + MD downloads work end-to-end.
4. **`feat(export): add /r/[id]/export/print route for PDF flow`** — new route files + `print.test.ts`. Wires the PDF option in the modal to `window.open(...)`.
5. **`test(export): e2e flows for CSV, Markdown, PDF`** — `e2e/export.spec.ts`.
6. **`docs(plan): note exporters module + print-route convention`** — short note in `docs/plan.md` under Conventions.
