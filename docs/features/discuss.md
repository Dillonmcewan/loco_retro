# Feature: Discuss view

## Context

The `voting` feature shipped ballots, aggregates, and the numeric `Votes: N` badge that already renders during Discuss/Closed. What's still missing from R7 is (a) sorting cards by vote total during Discuss and (b) a shared "discussed" indicator the facilitator can toggle as the team works through cards. With those landed, the *Collect → Vote → Discuss → Closed* loop is fully wired end-to-end and v1 of the PRD's retro flow is complete.

## Requirement traceability

- Maps to PRD section(s):
  - **R7 — Discuss view.** "During *Discuss*, cards are sorted by vote count (descending). The facilitator can mark a card as discussed; the indicator is visible to all."
  - **R8 — Local-first sync.** The `discussed` flag is one more field on the existing per-card `Y.Map`; toggles flow through the existing CRDT path with last-write-wins on the boolean — concurrent toggles converge to whichever fired last.
- Out of scope for this feature:
  - **Cross-column unified ranking.** Sorting is within each column, not a single global ranked list. (User-confirmed.)
  - **Sinking discussed cards or hiding them.** Discussed cards keep their rank and render visually de-emphasized in place. (User-confirmed.)
  - **Facilitator role.** Any participant can toggle `discussed`, matching the existing egalitarian model for phase advance and voting. (User-confirmed.)
  - **Editing the discussed marker after closing the room.** *Closed* is read-only across the board; the marker freezes with the rest of the state.
  - **Action items, notes, exports.** Out of v1 per the PRD non-goals.
  - **"Mark all discussed" / bulk operations.** No demand yet.
  - **Re-sorting during Vote.** Vote phase keeps the *Collect* order so participants aren't visually nudged by running tallies (consistent with the voting feature's choice to hide aggregates during Vote).

## Design

**Approach.** Add a single optional boolean field `discussed?: boolean` to the existing card `Y.Map`. A new helper `toggleDiscussed(doc, columnId, cardId)` flips the field inside `doc.transact`, gated to `phase === 'discuss'` (Closed is read-only; Collect/Vote shouldn't accumulate discussion state). `readCards` surfaces it; `cardsStore` re-emits via `observeDeep` (already in place). The room route computes a derived sorted view of cards per column when `phase === 'discuss' || phase === 'closed'`: stable sort by `voteTotal` descending, ties broken by `createdAt` ascending. `RetroCard.svelte` accepts `discussed: boolean` and an `onToggleDiscussed` callback; during Discuss it renders a check-toggle button in the footer next to the existing aggregate badge, and dims the card body when `discussed === true`. Closed phase still renders the dim/check state but disables the toggle button.

**Why this shape.**
- *`discussed` on the card map, not a separate `Y.Set`.* The card map is already the natural home for per-card state (text, author, editedAt). One more optional boolean costs nothing and keeps the schema cohesive. A separate top-level `discussed: Y.Set<cardId>` would need its own observer, its own cleanup when cards delete, and a second source of truth.
- *Derive sort in the view, not in the store.* `cardsStore` stays a flat columnId-keyed map; the route layer composes it with `voteTotalsStore` (already subscribed) to produce a sorted list during Discuss/Closed. No new store, no doubling up of observer wiring, and the sort cost is trivial at retro scale (3–15 participants × tens of cards).
- *Phase-gate the toggle, don't gate the field.* The CRDT happily stores `discussed` at any phase, but the helper refuses to write outside Discuss. This matches how `castVote` is gated to Vote: defense-in-depth at the data layer, no UI-only enforcement.

**Alignment with `docs/plan.md`.**
- *CRDT shape.* No new top-level shared types; `discussed` is an additional field inside the existing per-card `Y.Map` already enumerated in the plan's "Top-level shared types" note.
- *Stores backed by Yjs.* The existing `cardsStore` uses `observeDeep` on the columns array, so nested card-field writes already trigger re-emission. No new store is added.
- *Flat `src/lib/`, tests-next-to-code, TS strict.* All changes land in `room.ts` / `RetroCard.svelte` / their existing test files, plus one new e2e spec. No subfolder.
- *Design tokens.* The new "discussed" dim state and toggle button use existing `--color-muted`, `--color-success`, `--space-*`, `--font-size-*` tokens.

**Alternatives considered.**
- *Sort the persisted card array (move-on-write).* Rejected — Yjs `Y.Array.move` doesn't exist; you'd delete + reinsert per re-rank, churning the CRDT and risking authorship attribution edge cases. View-layer sort is free.
- *Unified single ranked list across columns.* Rejected by user — keeping the column grid is the smaller visual change and preserves the *what bucket?* context during discussion.
- *Sink discussed cards to the bottom.* Rejected by user — predictable in-place rendering wins.
- *Restrict the discussed toggle to a facilitator.* Rejected to stay consistent with the rest of the app's permission model; revisit with the PRD's facilitator-drop open question.
- *Hide the toggle during Closed.* Considered, but rendering it as a disabled button (instead of removing it) keeps the layout stable when stepping back to Discuss.

## File-level changes

**Modified**

- `src/lib/room.ts`
  - Extend `Card` type: add optional `discussed?: boolean`.
  - Extend `CardShape` (internal): add `discussed?: boolean` so `cardAcc.get/set` is typed.
  - Update `cardFromMap` to surface `discussed` when present (omit when `false`/missing for snapshot tidiness, *or* always surface — choose during impl to match the editedAt pattern; `editedAt` is omitted when missing, so do the same).
  - Add `toggleDiscussed(doc, columnId, cardId): boolean` — finds the card via existing `findColumn` + linear scan (matching `editCard`/`deleteCard`), short-circuits when `getPhase(doc) !== 'discuss'`, toggles inside `doc.transact`, returns `true` on success and `false` otherwise.
  - Do *not* touch `deleteCard` — deleting a card during Collect also drops its `discussed` field naturally (the whole map goes away); ballots refund continues to work as is.
- `src/lib/RetroCard.svelte`
  - New props: `discussed?: boolean` (default `false`) and `onToggleDiscussed?: () => void`.
  - Render a check-toggle button inside `.footer-right` whenever `phase === 'discuss' || phase === 'closed'` (sits next to the existing `Votes: N` badge). Use `lucide-svelte/icons/check-circle-2` for the toggled-on state and `circle` (or `circle-dashed`) for off, mirroring the existing icon-button pattern.
  - When `phase === 'closed'`, the toggle renders but is `disabled` (read-only); no callback fires.
  - When `discussed === true`, add a `discussed` class on the outer `Card` container (or on the text/author block) that drops opacity and/or strikes through the text. Use `--color-muted` for the dim and an existing token-only opacity step; no raw literals.
  - Continue to suppress edit/delete affordances outside *Collect* (already the case).
- `src/routes/r/[id]/+page.svelte`
  - Import `toggleDiscussed` from `$lib/room` and add a `handleToggleDiscussed(columnId, cardId)` wrapper.
  - Compute a derived `displayedCards: CardsByColumn` that, when `phase === 'discuss' || phase === 'closed'`, returns a per-column copy sorted by `voteTotals[card.id] ?? 0` descending, tie-broken by `card.createdAt` ascending. In all other phases, return `cards` unchanged. Implement as a `$derived` from `cards`, `voteTotals`, and `phase`.
  - Use `displayedCards` in the `{#each cardsFor(column.id)}` loop (rename `cardsFor` to read from `displayedCards`, or replace the helper).
  - Pass `discussed={card.discussed ?? false}` and `onToggleDiscussed={() => handleToggleDiscussed(column.id, card.id)}` into `<RetroCard>`.
  - No header changes — phase pill and budget chip behavior stays as-is.

**Tests**

- `src/lib/room.test.ts` — extend with:
  - `toggleDiscussed` outside *Discuss* phase (collect/vote/closed) is a no-op, returns `false`, leaves the card untouched.
  - `toggleDiscussed` in *Discuss* flips `false → true → false` and propagates via `Y.applyUpdate` to a second doc.
  - `readCards` returns `discussed: true` only after a toggle; omitted when never set (matches `editedAt` pattern).
  - `cardsStore` re-emits when `discussed` flips on a card.
  - Stepping from Discuss back to Vote leaves the `discussed` flag intact on cards (no clean-up).
- `src/lib/RetroCard.test.ts` — extend with:
  - With `phase='discuss'`, the toggle button renders and clicking it calls `onToggleDiscussed`.
  - With `discussed=true`, the card has the dim/discussed class hook (assert on class, not on color).
  - With `phase='closed'`, the toggle renders but is disabled; clicks don't fire the callback.
  - With `phase='collect'` or `'vote'`, the toggle does not render.
- `src/routes/r/[id]/page.test.ts` — extend with:
  - In Discuss with two cards in the same column where card B has more votes than card A, the rendered order is B before A (sorted DOM order, by querying `<RetroCard>` instances inside the column).
  - In Collect, the same data renders in insertion order (no sort).
  - Clicking the discussed toggle on a card during Discuss calls through to `toggleDiscussed` and flips the card's class on the next render.
- `e2e/discuss.spec.ts` *(new, Playwright)* — two-context flow:
  1. A creates a room, adds three cards in the same column (`c1`, `c2`, `c3`), advances to Vote.
  2. A votes 2 on `c2`, 1 on `c3`. B joins, votes 1 on `c1`.
  3. A advances to Discuss. Both clients render the column in order `c2 (3), c3 (1), c1 (1)` (B's vote on `c1` ties with `c3`; `c3` has earlier `createdAt`, so it wins). Aggregate badges visible; no vote controls; no budget chip.
  4. A clicks the discussed toggle on `c2`; B sees `c2` render in the dim/discussed state (assert on class or aria-pressed) in its position at the top of the column.
  5. A advances to Closed; the discussed toggle on `c2` is now disabled in both browsers; clicking on `c1`'s toggle in B does nothing.

**Manual verification**

- `pnpm dev:all`, create a room with `votesPerParticipant = 3`, add 4–5 cards across two columns, advance through Vote (cast a few votes), then Discuss.
  - Cards in each column render top-to-bottom in vote-descending order.
  - Click the toggle on the highest-voted card; it dims in place and a checked icon appears.
  - Open the URL in a private window; the dim and checked state replicate.
  - Step back to Vote; the dim disappears (toggle is hidden but underlying `discussed` flag persists — confirm via DevTools/IndexedDB).
  - Re-advance to Discuss; the toggle returns and previously-discussed cards are still marked.
  - Advance to Closed; toggle button is visible but disabled; cards remain dimmed.
- `pnpm check`, `pnpm lint`, `pnpm test:unit`, `pnpm test:e2e` all pass.

## Open questions

_All resolved during planning:_

- **Layout in Discuss** → Sort within each column (existing column grid preserved).
- **Discussed cards** → Stay in place, visually de-emphasized (dim + check icon).
- **Permission to toggle** → Any participant, matching phase-advance permission model.
- **Tie-break for equal vote totals** → `createdAt` ascending (oldest first). Stable, deterministic, and matches the visual order from the Collect phase for tied-zero cards.

## Rollout / commit plan

Each step a single, independently-reviewable commit:

1. **`feat(room): persist discussed flag on cards`** — extend `Card` / `CardShape` / `cardFromMap`; add `toggleDiscussed` helper with phase gating; unit tests for state + cross-doc sync. No UI change yet.
2. **`feat(retro-card): discussed toggle + dim state`** — props, button (Discuss + Closed render rules), dim class hook; component tests. Still not wired into the room route.
3. **`feat(room-page): sort cards by votes during discuss`** — derived `displayedCards`, use it in the column loop; page-level test for sort order and clicking the toggle.
4. **`test(e2e): discuss-phase sort + discussed toggle`** — Playwright spec covering the two-context flow.
