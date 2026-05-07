# Feature: Cards

## Context

The `create-and-join-room` feature shipped the room shell with empty columns and a placeholder "No cards yet." This feature fills those columns: any participant in a room can write a card under any column, and authors can edit or delete their own cards. This unlocks the core retro flow — voting and discussion (R6/R7) consume cards as their input — and is the first feature where multiple participants concurrently mutate persisted CRDT state, so it also exercises the Yjs sync path beyond seed.

## Requirement traceability

- Maps to PRD section(s):
  - **R4 — Add / edit / delete cards.** During the *Collect* phase, any participant can create cards under any column and can edit or delete their own cards. Cards are attributed to the author's display name.
  - **R8 — Local-first sync.** Card mutations queue locally on disconnect and reconcile on reconnect — same plumbing established in `create-and-join-room`, now exercised by mutable per-card state.
- Out of scope for this feature:
  - **R5 phase gating.** Phases ship later; cards are addable/editable/deletable always (room is implicitly in *Collect*, per the same convention as the bootstrap feature).
  - **R6 voting**, **R7 discuss view**, **R9 close room.**
  - **Card grouping / clustering** (PRD non-goal).
  - **Per-card reactions / threaded comments** (PRD open question, deferred).
  - **Drag-to-reorder** within or across columns.
  - **Soft delete / undo.** Delete is destructive; revisit if needed.
  - **Markdown / rich text.** Plain text with preserved line breaks.
  - **Collaborative editing of a single card's text** (Y.Text per card). PRD scope is single-author edits — a plain string field is sufficient.
  - **Hidden-until-reveal sub-phase** (PRD open question — defaults to *visible immediately*; revisit when phases land).

## Design

**Approach.** Promote each room's `columns` shared type from a `Y.Array` of plain `{id, title}` JSON to a `Y.Array<Y.Map>`, where each column `Y.Map` carries `id`, `title`, and a nested `cards` `Y.Array<Y.Map>`. Each card `Y.Map` holds `{ id, text, author, authorId, createdAt, editedAt? }`. Columns *own* their cards structurally — the data shape mirrors the domain (a retro is columns-of-cards) and the UI (each column renders its own list). The public `columnsStore` keeps its existing shape `Readable<Column[]>` (id + title) for compatibility with the bootstrap room shell; a new `cardsStore(doc): Readable<Record<columnId, Card[]>>` deep-observes the nested arrays and emits a snapshot keyed by column. Three room helpers — `addCard`, `editCard`, `deleteCard` — encapsulate the Yjs writes inside `doc.transact(...)` for atomic merges. Two small components (`Card.svelte`, `CardForm.svelte`) render the per-column UI, hidden behind the existing display-name gate.

**Authorship.** A card stores both `author` (the display name string captured at creation, for rendering) and `authorId` (a stable per-browser UUID v4, for ownership checks). The `authorId` is generated lazily on first use and persisted in `localStorage` alongside the display name. This avoids ambiguity when two participants share a name (the bootstrap feature explicitly accepted display-name collisions) and survives a name change without orphaning prior cards.

**Alignment with `docs/plan.md`.**
- *Architecture — CRDT.* Cards live in shared Yjs types in the same `Y.Doc` as `meta` and `columns`, so `y-indexeddb` and `y-websocket` carry them with no transport changes.
- *Architecture — Svelte stores backed by Yjs.* `cardsStore` follows the same `readable` pattern as `columnsStore` / `roomMetaStore`.
- *Conventions — flat `src/lib`, tests-next-to-code, TS strict.* New components and helpers all colocate; no subfolders.
- No dev-plan amendments required — every decision falls inside the already-pinned stack.

**Alternatives considered.**
- *Flat top-level `cards` `Y.Array` with each card carrying a `columnId` foreign-key field.* Rejected — a retro is structurally columns-of-cards, not cards-with-pointers. A flat list forces filter-by-columnId at every render, makes orphaned cards (dangling `columnId`) a runtime concern instead of a structural impossibility, and gives future per-column state (R7's "discussed" markers if they ever live at the column level, vote tallies, etc.) no natural home. The one thing flat is genuinely cleaner at — moving a card across columns without losing Yjs item identity — isn't on the roadmap (PRD non-goals exclude grouping/clustering during synthesis), and the card's logical `id` field would survive the move regardless.
- *Top-level `cards` `Y.Map<columnId, Y.Array<Y.Map>>` keyed by column id.* Rejected — solves per-column observation but leaves columns and their cards in two disjoint shared types, kept in sync by string ids. The nested form makes columns own their cards, which matches the domain and the iteration order of every future feature that touches cards.
- *`Y.Text` per card for collaborative editing.* Rejected for v1 — PRD R4 is single-author edits; a plain string in the Y.Map is one CRDT op, smaller payload, simpler UI. Revisitable if a future "co-edit" feature wants it.
- *Match ownership by display name only.* Rejected — the bootstrap feature accepts name collisions, so ownership-by-name would let one "Dillon" delete another "Dillon"'s cards. A stable per-browser `authorId` is two fields and one localStorage key — cheap insurance.
- *Soft delete with a `deletedAt` tombstone.* Rejected for v1 — the PRD asks for delete, not undo. Hard delete via `Y.Array.delete(index, 1)` is what users mean.

## File-level changes

**Modified**

- `src/lib/room.ts` — restructure `columns` from `Y.Array<{id, title}>` plain JSON to `Y.Array<Y.Map>`, where each column Y.Map carries `id`, `title`, and a nested `cards` `Y.Array<Y.Map>`. `seedRoom` is updated to build column Y.Maps and their empty nested cards arrays inside its existing `doc.transact` block. `readColumns(doc)` is updated to read from the Y.Maps but keeps its public return shape `Column[]`. `columnsStore` likewise keeps its public shape `Readable<Column[]>`. New: `Card` type; `addCard(doc, { columnId, text, author, authorId })` / `editCard(doc, columnId, cardId, text)` / `deleteCard(doc, columnId, cardId)` helpers, each wrapping its Yjs mutations in `doc.transact`; `cardsStore(doc): Readable<Record<columnId, Card[]>>` that deep-observes the nested cards arrays (per-card `text`/`editedAt` updates re-fire). The bootstrap feature has shipped only test rooms — there is no real persisted state to migrate.
- `src/lib/displayName.ts` — add `getAuthorId(): string` and (internal) helpers that read/write `loco_retro:authorId` in `localStorage`, generating a UUID v4 on first read. Same SSR guard pattern as `getDisplayName`. Keep filename — flat-structure preference.
- `src/routes/r/[id]/+page.svelte` — replace the `<p class="empty">No cards yet.</p>` placeholder with: a `cardsStore` subscription, a per-column `<Card>` list filtered by `column.id`, and a `<CardForm>` per column. Pass `currentAuthorId` into `<Card>` so it can decide whether to show edit/delete affordances. Keep the existing gate behavior — cards UI sits inside the `{:else}` branch.

**New**

- `src/lib/Card.svelte` — renders one card: text (with `white-space: pre-wrap` so newlines survive), author badge, and — only when `card.authorId === currentAuthorId` — edit and delete buttons. Edit toggles an inline `<textarea>` with save/cancel; save calls `editCard`; cancel restores the original text. Delete is a single click for now (a confirm prompt is a UX call we can revisit).
- `src/lib/CardForm.svelte` — small form bound to one column id: a `<textarea>`, a submit button, empty-trim guard. On submit calls `addCard` with `{ columnId, text, author: displayName, authorId }`, then clears the textarea. **Enter submits; Shift+Enter inserts a newline** — fast single-line capture, multi-line still possible.

**Tests**

- `src/lib/room.test.ts` — adjust the existing seed assertion so it still checks the externally-visible shape via `readColumns` (passes through the schema change unchanged); add an internal-shape test that confirms each seeded column is a Y.Map with a nested `cards` Y.Array. Extend with: `addCard` appends a Y.Map to the right column's nested array with the expected shape and a UUID id; `editCard` updates `text` and sets `editedAt`; `deleteCard` removes only the targeted card; mutations on one `Y.Doc` propagate to a second doc via in-memory `Y.applyUpdate` (the standard Yjs pattern for unit-level sync tests — no relay needed); `cardsStore` snapshot reflects all of these.
- `src/lib/displayName.test.ts` — extend with: `getAuthorId()` is stable across calls; produces a UUID v4; persists across a simulated reload (re-read after re-import); SSR-safe (no `localStorage` ⇒ generates a fresh ephemeral id rather than throwing).
- `src/lib/Card.test.ts` *(new, component)* — renders text and author; edit + delete buttons hidden when `currentAuthorId !== card.authorId`; both visible when it matches; clicking edit reveals textarea pre-filled with text; save emits the new text; cancel restores; delete fires the delete handler.
- `src/lib/CardForm.test.ts` *(new, component)* — empty / whitespace-only blocks submit; valid text calls the submit handler with the trimmed string and clears the textarea; Enter submits; Shift+Enter inserts a newline without submitting.
- `src/routes/r/[id]/page.test.ts` — extend the existing tests: with the gate passed, a card added via the (mocked) helper renders inside its column; a foreign card's edit/delete buttons are absent.
- `e2e/cards.spec.ts` *(new)* — two-context flow against the dev relay: A creates a room and adds a card under column 1; B opens the URL, joins, sees A's card with A's name; B adds a card under the same column; A sees B's card; A edits A's own card; B sees the update; A deletes; B sees it disappear; on B's view the buttons on A's card are absent.

## Test plan

- **Unit (Vitest):** `addCard` / `editCard` / `deleteCard` shape and idempotence; `cardsStore` snapshot contents change on Yjs mutations and on remote `applyUpdate`; `getAuthorId` stable + UUID v4 + SSR-safe.
- **Component (Vitest + `@testing-library/svelte`):** `Card.svelte` (ownership-gated affordances, inline edit cycle); `CardForm.svelte` (validation, Enter-submits, Shift+Enter-newline); room route renders cards under correct columns.
- **E2E (Playwright):** two-context create / add / sync / edit / delete; foreign-card buttons absent.
- **Manual verification:**
  1. `pnpm dev:all`, create a room, join from a second browser with a different name.
  2. Add a card from each browser under the same column — both see both, attributed correctly.
  3. Edit your own card — the other browser sees the new text within ~1s.
  4. Try to edit the other browser's card — no edit/delete buttons visible.
  5. Delete your own card — disappears from both browsers.
  6. DevTools → Network → "Offline" on browser A; add a card; come back online — card appears in B's view on reconnect.
  7. Reload browser A — its own cards are still there (IndexedDB), and the foreign cards reconcile via the relay.
  8. `pnpm check`, `pnpm lint`, `pnpm test:unit`, `pnpm test:e2e` all pass.

## Open questions

_None blocking — defaults locked in:_

- **Authorship:** stable per-browser `authorId` (UUID in `localStorage`) plus `author` display name on each card.
- **Visibility:** visible to everyone as written. The PRD's hide-until-reveal question is deferred to the *phases* feature.
- **Submit shortcut:** Enter submits; Shift+Enter inserts a newline.
- **Delete confirmation:** single click, no confirm. Lightweight retro ergonomics; revisit if users mis-click.
- **Card max length:** no hard cap; textarea auto-grows. Add a soft limit only if abuse becomes real.

## Rollout / commit plan

Each step a single, independently-reviewable commit:

1. **Promote `columns` to `Y.Array<Y.Map>`** with empty nested `cards` Y.Arrays in `seedRoom`. `readColumns` and `columnsStore` keep their existing public shape; the room route is unchanged. Existing tests pass; one new test asserts the internal Y.Map shape and the nested empty cards array.
2. **Extend `displayName.ts` with `getAuthorId`** + tests. Pure helper; lands before anything depends on it.
3. **Add `Card` type + `addCard` / `editCard` / `deleteCard` + `cardsStore` to `room.ts`** with unit tests covering shape, observe, and cross-doc sync via `applyUpdate`.
4. **Add `Card.svelte`** with component tests for ownership-gated affordances and the inline edit cycle.
5. **Add `CardForm.svelte`** with component tests for validation, Enter-submit, and Shift+Enter newline.
6. **Wire cards into the room route** — replace the `No cards yet.` placeholder with per-column `Card` list + `CardForm`; extend `page.test.ts`.
7. **Add e2e** (`e2e/cards.spec.ts`) — two-context add / edit / delete / ownership gating.
