# Feature: Phase progression

## Context

`create-and-join-room` and `cards` shipped a room that is implicitly in *Collect* forever — anyone can add, edit, or delete cards at any time. This feature introduces the explicit phase machine the PRD calls for: *Collect → Vote → Discuss → Closed*. It is the scaffolding that R6 (dot voting) and R7 (discuss view) plug into, and its terminal state is also how R9 (close room) is satisfied — there is no separate "close" action, closing is just advancing past *Discuss*.

This feature ships the state machine, the shared phase indicator, the advance/back controls, and the gating that suppresses card mutations outside *Collect*. It deliberately does not ship voting UI or discuss-view sorting — those land in their own features and consume the phase signal exposed here.

## Requirement traceability

- Maps to PRD section(s):
  - **R5 — Phase progression.** The room moves through *Collect → Vote → Discuss → Closed*. The facilitator advances the phase; phase is shared state and UI affordances change accordingly.
  - **R9 — Room lifecycle.** Reaching *Closed* makes the room read-only but still viewable. This feature ships the closed-state behavior (read-only across the board); cross-session viewability is already covered by `y-indexeddb` + the relay's best-effort cache.
  - **R8 — Local-first sync.** Phase is one more shared field on `meta`; phase changes sync through the existing CRDT path.
- Out of scope for this feature:
  - **R6 dot voting.** Vote allocation, ballots, aggregate counts — entire feature lands later. The *Vote* phase here just suppresses card mutations and renders a placeholder where voting controls will go.
  - **R7 discuss view.** Vote-sorted ordering and the "discussed" marker — entire feature lands later. The *Discuss* phase here renders cards read-only in their existing column order.
  - **Facilitator role / drop handling.** The PRD has an open question about what happens if the facilitator drops. This feature treats every participant as equally privileged: any participant can advance or step back the phase. Revisit if abuse becomes real.
  - **Reopening a closed room** programmatically. Once closed, the room is read-only; there is no "reopen" affordance in v1. (Manual reopen via DevTools is possible but unsupported.)
  - **Confirmation modal for advance / close.** Single-click advance with a clear visual phase indicator. Add a confirm only if users mis-click during real retros.
  - **Per-phase timers / countdowns.** Out of scope.
  - **Hide-until-reveal sub-phase** during *Collect* (PRD open question) — still deferred.

## Design

**Approach.** Add a single `phase` field to the existing `meta` `Y.Map` alongside `name` and `templateId`. `seedRoom` initializes it to `'collect'`. A small state-machine helper (`PHASE_ORDER`, `nextPhase`, `prevPhase`, `advancePhase`, `setPhase`) wraps the writes; `roomMetaStore` already observes `meta` so the phase change propagates with no new store. Card mutation helpers (`addCard`, `editCard`, `deleteCard`) gate on the current phase — only `'collect'` accepts writes, every other phase makes them no-ops returning `null`/`false`. UI consumes the phase from `roomMetaStore` and renders a phase indicator + advance/back buttons in the room header; the existing column body conditionally hides the `<CardForm>` and the per-card edit/delete affordances when phase ≠ collect.

The phase machine is a flat enum (`'collect' | 'vote' | 'discuss' | 'closed'`) with a fixed forward order. There is no implicit transition — every change is an explicit user action persisted via Yjs. Because the helpers gate at the data layer, a stale tab whose phase observer hasn't updated yet still cannot corrupt state on a closed room.

**Alignment with `docs/plan.md`.**
- *Architecture — CRDT.* `phase` lives on the same `meta` `Y.Map` we already seed and observe; no new shared types, no transport changes.
- *Architecture — Svelte stores backed by Yjs.* `roomMetaStore` already subscribes to `meta.observe`; promoting `RoomMetaSnapshot` to include `phase` reuses the existing pipe. The plan's note in `room.ts` ("if meta ever gains nested Y types … switch to `observeDeep`") still doesn't apply — phase is a flat string.
- *Conventions — flat `src/lib`, tests-next-to-code, TS strict.* New `Phase` type, helpers, and `PhaseControls.svelte` component all colocate.
- No dev-plan amendments required.

**Alternatives considered.**
- *Separate `phase` `Y.Map` (or top-level shared field) instead of a `meta` field.* Rejected — `meta` is exactly the home for room-level scalars (name, templateId already). One more string is not enough to justify a second shared type and a second observer.
- *Split "advance to closed" into a distinct R9 close-room feature.* Rejected — *Closed* is structurally the terminal phase, not a separate concept. Modeling it as one button vs. a different button is incidental UI; the underlying state and gating are identical.
- *Restrict phase advance to a designated facilitator (the room creator).* Rejected for v1. The PRD has an open question about facilitator drop, and stamping a `facilitatorAuthorId` at seed time would force us to answer it now (auto-promotion? manual claim?). Egalitarian advance is the cheapest defensible default; a facilitator role can land later without a CRDT migration (it's an additive `meta` field).
- *Gate card mutations only at the UI layer.* Rejected — defense in depth is one extra `if` per helper and prevents stale tabs or programmatic clients from corrupting closed rooms.
- *Reverse order / skip-to-phase controls.* The state machine helpers support `prev` (a single back step) so a facilitator can recover from a mis-click. Arbitrary jumps are out of scope; the linear retro flow is the design.

## File-level changes

**Modified**

- `src/lib/room.ts` — add `Phase` type (`'collect' | 'vote' | 'discuss' | 'closed'`) and exported `PHASE_ORDER` tuple; extend `RoomMetaSnapshot` with `phase: Phase`; `seedRoom` writes `meta.set('phase', 'collect')` inside its existing transact block; `readRoomMeta` reads and validates the field (defaults to `'collect'` if a pre-phase doc is loaded — defensive only, no real persisted state predates this); add `getPhase(doc)`, `setPhase(doc, phase)`, `advancePhase(doc)`, `stepBackPhase(doc)` helpers, each wrapping the meta write in `doc.transact`; `addCard` / `editCard` / `deleteCard` short-circuit when `getPhase(doc) !== 'collect'`. `roomMetaStore` keeps its existing observer; the broadened snapshot type flows through automatically.
- `src/routes/r/[id]/+page.svelte` — read `meta.phase` from the existing `roomMetaStore` subscription; render a new `<PhaseControls>` in the header (current phase pill + back/advance buttons); pass the phase into the column section so `<CardForm>` is hidden when `phase !== 'collect'`; pass `phase` into `<RetroCard>` so it can suppress edit/delete affordances outside *Collect*. When `phase === 'closed'`, also hide the `<PhaseControls>` advance button (terminal state). Visual phase pill placement: between the room title and participants list.
- `src/lib/RetroCard.svelte` — accept a `phase: Phase` prop; edit/delete buttons render only when `phase === 'collect' && card.authorId === currentAuthorId`. Existing ownership gating stays — phase gating layers on top.

**New**

- `src/lib/PhaseControls.svelte` — receives `{ phase: Phase, onAdvance: () => void, onBack: () => void }`. Renders a phase pill (label + step indicator like *2 of 4*) and two buttons: *Back* (disabled when phase is `'collect'`) and *Advance* (label changes to *Close room* on the *Discuss* step; hidden when phase is `'closed'`). Pure presentational — wiring lives in the room route.

**Tests**

- `src/lib/room.test.ts` — extend with: seeding sets `phase` to `'collect'` and `readRoomMeta` returns it; `advancePhase` walks Collect → Vote → Discuss → Closed and is a no-op past Closed; `stepBackPhase` is a no-op at Collect and walks back otherwise; `setPhase` rejects unknown values (throws); `addCard`/`editCard`/`deleteCard` return their no-op sentinel and do not mutate the doc when phase ≠ collect; cross-doc sync via `applyUpdate` propagates phase changes to a second doc and a `roomMetaStore` snapshot reflects them.
- `src/lib/PhaseControls.test.ts` *(new, component)* — phase pill renders correct label and step number for each phase; *Back* disabled at Collect, enabled elsewhere; *Advance* label is *Advance* on Collect/Vote, *Close room* on Discuss, hidden on Closed; clicks fire the right callbacks.
- `src/lib/RetroCard.test.ts` — extend: with phase=`'collect'` and matching authorId, edit/delete render (existing case); with phase=`'vote'` (or any non-collect) the buttons are absent even when authorId matches.
- `src/routes/r/[id]/page.test.ts` — extend: `<PhaseControls>` renders with the seeded *Collect* state; `<CardForm>` is present in *Collect* and absent in *Vote*/*Discuss*/*Closed*; clicking *Advance* moves through phases and updates the indicator.
- `e2e/phases.spec.ts` *(new)* — two-context flow: A creates a room, adds a card, advances to *Vote*; B sees the phase change and the card form disappear in their own UI; A advances to *Discuss*, then closes; B sees the room render read-only across the board (no add form, no edit/delete affordances on cards they own).

## Test plan

- **Unit (Vitest):** state-machine traversal (`advancePhase`, `stepBackPhase`, idempotent at the ends); `seedRoom` initializes phase; `readRoomMeta` reflects phase changes; gating of `addCard` / `editCard` / `deleteCard` outside Collect; cross-doc sync of phase changes via `applyUpdate`.
- **Component (Vitest + `@testing-library/svelte`):** `PhaseControls` label + step + button visibility/disabled per phase + click callbacks; `RetroCard` ownership × phase matrix for edit/delete affordances; room route shows/hides `<CardForm>` based on phase and walks through phases on advance clicks.
- **E2E (Playwright):** two-context phase advance — both clients see indicator update, mutation affordances disappear in non-collect phases, closed state is read-only on both sides.
- **Manual verification:**
  1. `pnpm dev:all`, create a room, add a few cards.
  2. Click *Advance* — phase pill flips to *Vote*; card form disappears; existing cards stay visible; edit/delete buttons are gone.
  3. Open the same URL in a second browser — phase indicator matches; same read-only behavior.
  4. *Back* in browser A returns to *Collect*; mutation affordances reappear in both browsers.
  5. Advance through *Vote* → *Discuss* → *Closed*. *Closed* hides the *Advance* button entirely; the room renders fully read-only; the URL is still openable in a fresh window.
  6. DevTools → Network → "Offline" on browser A; advance phase; come back online — browser B sees the phase update on reconnect.
  7. Reload browser A in *Closed* state — phase persists from IndexedDB; room still read-only.
  8. `pnpm check`, `pnpm lint`, `pnpm test:unit`, `pnpm test:e2e` all pass.

## Open questions

_None blocking — defaults locked in:_

- **Who can advance the phase?** Any participant. Facilitator role is deferred until the PRD's drop-handling open question forces it.
- **Confirm before closing?** No confirm in v1; single click. Revisit if mis-clicks become a problem.
- **Reopening a closed room?** Not in v1.
- **Per-phase timers?** Not in v1.
- **Hide-until-reveal during Collect?** Still deferred — independent PRD open question.

## Rollout / commit plan

Each step a single, independently-reviewable commit:

1. **Add `Phase` type, `PHASE_ORDER`, and seed phase in `meta`.** Extend `RoomMetaSnapshot`, update `seedRoom` and `readRoomMeta`. Existing tests pass; one new test asserts the seeded phase. No UI change yet.
2. **Add `getPhase` / `setPhase` / `advancePhase` / `stepBackPhase`** with unit tests for the state machine + cross-doc sync via `applyUpdate`.
3. **Gate `addCard` / `editCard` / `deleteCard` on phase** with unit tests covering the no-op behavior outside Collect.
4. **Add `PhaseControls.svelte`** with component tests for label/step/visibility/click behavior.
5. **Wire phase into the room route**: render `<PhaseControls>` in the header, gate `<CardForm>` and `<RetroCard>` affordances on phase; extend `page.test.ts`.
6. **Add e2e** (`e2e/phases.spec.ts`) for two-context phase progression and closed read-only.
