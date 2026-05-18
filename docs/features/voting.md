# Feature: Dot voting

## Context

`phases` shipped the *Collect → Vote → Discuss → Closed* state machine but left the *Vote* phase as a read-only view of cards with no voting affordance. This feature fills that gap: during *Vote*, every participant gets a configurable budget of votes (default 5) to spread across cards, can put multiple votes on a single card, and can adjust freely until the facilitator advances to *Discuss*. Aggregate counts are visible to all; individual ballots are not surfaced in the UI. This is the last requirement R7 (discuss view) depends on.

## Requirement traceability

- Maps to PRD section(s):
  - **R6 — Dot voting.** During *Vote*, each participant has N votes (default 5, configurable by the facilitator at room creation) to allocate across cards. Aggregate vote counts are visible to everyone; individual ballots are private.
  - **R8 — Local-first sync.** Ballots are persisted Yjs state — offline +/− mutations queue locally and merge on reconnect with no double-count, because each author owns a single keyed `Y.Map` entry rather than incrementing a shared counter.
- Out of scope for this feature:
  - **R7 discuss view.** Sort-by-votes ordering and the "discussed" marker land separately and consume the aggregate exposed here.
  - **Cryptographic ballot secrecy.** Ballots are stored in the shared `Y.Doc` keyed by `authorId`; privacy is a UI convention (only your own ballot + aggregates rendered), not enforced at the CRDT layer. A determined participant inspecting raw Yjs state could read others' ballots. The PRD's "private" is interpreted as private in the product UI.
  - **Changing `votesPerParticipant` after room creation.** Configured once at seed time.
  - **Re-opening / resetting votes.** Stepping back from Vote → Collect keeps ballots intact. There is no "clear votes" button.
  - **Per-author "voting complete" indicator.** No submit step — votes are live as they change.
  - **Negative votes / weighted votes / approval voting.** Plain dot voting only.

## Design

**Approach.** Add a `votesPerParticipant` numeric field (positive integer, default 5, no upper bound) to the create-room form and persist it on `meta` at seed time. Introduce a top-level shared `ballots` `Y.Map<string, Y.Map<string, number>>` on the room `Y.Doc`: outer key is `authorId`, inner map keys are `cardId`, values are the count of votes that author has placed on that card. Three new helpers — `castVote(doc, cardId)`, `retractVote(doc, cardId)`, `clearVote(doc, cardId)` — wrap the writes in `doc.transact(...)`, gate on `phase === 'vote'`, and (for `castVote`) refuse the write if the author has already spent their full budget. Two new stores: `myBallotStore(doc, authorId): Readable<Record<cardId, number>>` for the local viewer's allocation and `voteTotalsStore(doc): Readable<Record<cardId, number>>` for the derived aggregate. UI lives in a small `VoteControls.svelte` — per card, a `−` button, a numeric readout of the viewer's current allocation on that card, and a `+` button — plus a budget chip in the room header showing `X / N votes remaining`. During *Vote*, each participant sees only their own per-card allocation and their remaining budget — no aggregates. Aggregate vote totals render as a numeric badge (e.g. `Votes: 4`) only from *Discuss* onward, so voting isn't biased by visible running totals. **No pip/dot rendering anywhere** — totals and per-author allocations are always numeric, which keeps the UI sane at high vote budgets.

**Card deletion + vote reclamation.** When a card is deleted (only possible in *Collect*, where ballots normally don't change), `deleteCard` also strips every author's entry for that `cardId` inside the same `doc.transact(...)`. The effect is that the deleted card's votes are atomically refunded to whichever authors had spent them — `myBallotStore` re-emits a smaller record, `voteTotalsStore` drops the key, and the budget chip recovers the freed votes automatically. This keeps the invariant `spent = sum(myBallot values)` always true; there's no orphan state to garbage-collect later.

**Privacy.** Per the resolved design question, ballots live in the persisted CRDT keyed by `authorId`. Only the local viewer's ballot is bound to UI; everyone else's per-card allocation is never rendered. Aggregates are derived in the store, not stored separately — there is no counter to fall out of sync.

**Alignment with `docs/architecture.md`.**
- *CRDT shape.* Ballots are a new top-level shared Yjs type on the existing per-room `Y.Doc`, mirrored to IndexedDB by `y-indexeddb` and synced via `y-websocket` with no transport changes.
- *Store conventions.* Reads route through new Svelte stores (`myBallotStore`, `voteTotalsStore`) that subscribe to Yjs observers; writes mutate Yjs directly via helpers, matching `addCard`/`setPhase`/etc.
- *Flat lib structure.* New files (`VoteControls.svelte`, `VoteBudget.svelte`) live under `src/lib/` alongside `RetroCard.svelte`, `CardForm.svelte`, `PhaseControls.svelte`. No subfolder yet.
- *Design tokens.* All new component CSS uses `--space-*`, `--font-size-*`, color/radius/shadow variables from `src/app.css`.
- *Testing.* Vitest unit tests for helpers next to `room.ts`; component tests next to each new component; a single Playwright spec covers the end-to-end voting flow.

**Alternatives considered.**
- *Ballot in localStorage + shared aggregate counter.* Stronger privacy but breaks R8 — concurrent +1 increments on a single counter race; a participant on two devices double-counts; offline changes can't merge cleanly. Rejected.
- *Awareness (ephemeral) ballots.* Disconnects drop votes — violates R8 explicitly. Rejected.
- *Submit-then-lock ballots.* More ceremony, requires a per-author "submitted" flag and an edit-mode toggle. Rejected as out of scope; current PRD doesn't ask for it.
- *Clear ballots on Vote → Collect step-back.* Punishes mis-clicks; not symmetric with the rest of the phase machine. Rejected.
- *Pip/dot rendering of allocations and totals.* Visually intuitive at low counts but breaks down quickly above ~10. Numeric throughout keeps the UI uniform regardless of the configured budget.

## File-level changes

- `src/lib/room.ts` — extend `SeedParams` and `seedRoom` to accept `votesPerParticipant` (positive integer, default 5) and write it to `meta`. Extend `RoomMetaSnapshot` and `readRoomMeta`. Add ballot types (`type Ballot = Record<string, number>`), `ballotsAcc` typed access helper. Add helpers `castVote`, `retractVote`, `clearVote` (phase-gated to `'vote'`, budget-enforced). Add `readMyBallot(doc, authorId)`, `readVoteTotals(doc)`. Add stores `myBallotStore(doc, authorId)`, `voteTotalsStore(doc)`. Initialize empty `ballots` Y.Map inside `seedRoom`. **Extend `deleteCard`** to also strip every author's `ballots[*][cardId]` entry inside the same `doc.transact(...)`, refunding the freed votes to each author's remaining budget.
- `src/lib/room.test.ts` — unit tests for the new helpers and stores (see Test plan).
- `src/routes/+page.svelte` — add a numeric input for *Votes per participant* (min 1, no max, default 5; integer; validate non-empty and ≥ 1), pass into `seedRoom`.
- `src/routes/+page.test.ts` (or existing create-form test file) — assert the input renders, validates bounds, and feeds `seedRoom`.
- `src/lib/VoteControls.svelte` (new) — per-card `−` and `+` buttons + numeric readout of viewer's current allocation. Props: `cardId`, `myCount`, `canIncrement`, `onIncrement`, `onDecrement`. Pure presentational; parent wires store reads.
- `src/lib/VoteControls.test.ts` (new) — component tests (see Test plan).
- `src/lib/VoteBudget.svelte` (new) — small budget indicator: `X / N votes remaining`. Props: `remaining`, `total`.
- `src/lib/VoteBudget.test.ts` (new) — component tests.
- `src/lib/RetroCard.svelte` — accept new optional props `voteTotal: number` and a `votingSlot` snippet (Svelte 5 snippet) so the Vote-phase render can inject `<VoteControls>` without coupling RetroCard to ballot state. Aggregate badge renders as a numeric label (e.g. `Votes: 3`) whenever `voteTotal > 0` and phase is `discuss` or later — **hidden during Vote** so participants aren't influenced by running totals.
- `src/lib/RetroCard.test.ts` — add cases for the aggregate badge and the snippet slot.
- `src/routes/r/[id]/+page.svelte` — in the Vote phase: render `<VoteBudget>` in the header, render `<VoteControls>` per card inside the existing column body (no aggregate badges). In Discuss + Closed phases: render aggregate badges on each card (no controls, no budget chip). Subscribe to `myBallotStore` in Vote, `voteTotalsStore` from Discuss onward.
- `src/routes/r/[id]/+page.test.ts` — extend to cover header budget visibility per phase and that VoteControls only render in Vote phase.
- `e2e/voting.spec.ts` (new) — two-client end-to-end flow (see Test plan).
- `docs/architecture.md` — note in the CRDT-shape section that `ballots` is now a top-level shared type on the room doc; note the privacy-is-UI-layer convention.

## Test plan

**Unit (Vitest, `src/lib/room.test.ts`):**
- `seedRoom` writes `votesPerParticipant` to `meta` (default 5; explicit value honored).
- `seedRoom` initializes an empty `ballots` map; second call on the same doc is idempotent.
- `castVote` outside *Vote* phase (in collect/discuss/closed) is a no-op returning `false`; ballot unchanged.
- `castVote` in Vote phase increments `ballots[authorId][cardId]` from 0 → 1, then 1 → 2.
- `castVote` refuses when the author has already spent their budget; returns `false`; aggregate unchanged.
- `retractVote` decrements; clamps at 0 (no negative); removes the cardId key when count hits 0 (kept clean).
- `retractVote` outside Vote phase is a no-op.
- `clearVote` zeros all entries for the author (used by tests/manual reset; not bound to UI yet).
- `readVoteTotals` sums across all authors and returns `Record<cardId, number>`, omits cards with 0.
- `readMyBallot` returns the local author's record only.
- `voteTotalsStore` emits a new snapshot on cast/retract from a remote author (simulated by writing through a second doc + applying update).
- `myBallotStore` emits on local writes; ignores remote authors' writes (snapshot stays equal-by-value).
- Stepping back from Vote → Collect via `stepBackPhase` leaves the `ballots` map untouched.
- `deleteCard` removes every author's entry for that `cardId` from `ballots`; `voteTotalsStore` drops the key; each affected author's remaining budget (computed as `votesPerParticipant - sum(myBallot)`) increases by the refunded amount.
- `deleteCard` on a card with zero votes leaves `ballots` untouched (no spurious writes).

**Component (Vitest + Testing Library):**
- `VoteControls.test.ts`: shows current `myCount`; `+` calls `onIncrement` when `canIncrement`; `+` is disabled and does not call when `!canIncrement`; `−` calls `onDecrement` only when `myCount > 0`; `−` disabled at 0.
- `VoteBudget.test.ts`: renders `X / N votes remaining`; reaches 0; visually flags depletion (class hook, not asserted on colors).
- `RetroCard.test.ts`: aggregate badge renders only when `voteTotal > 0` and phase ≥ vote; voting snippet slot renders when provided.
- `+page.test.ts` (create form): votes input defaults to 5; min 1 enforced (rejects 0 / negative / empty); accepts large values (e.g. 50) without truncation; submitted value passed to `seedRoom`.
- `[id]/+page.test.ts`: in Vote phase, header shows `<VoteBudget>`, each card shows `<VoteControls>`, **no aggregate badges**; in Collect phase none of voting UI is rendered; in Discuss phase, aggregate badges render but no controls and no budget chip.

**E2E (Playwright, `e2e/voting.spec.ts`):**
- Two-browser-context flow. Client A creates a room with `votesPerParticipant = 3` and the *Start / Stop / Continue* preset; A adds two cards across two columns; A advances to *Vote*. B joins via the URL and waits for both cards to appear. Both clients cast votes: A casts 2 on card 1, 1 on card 2; B casts 3 on card 2. During Vote, each client sees only its own per-card numbers and budget chip — no aggregate badges visible. A attempts a 4th vote — `+` is disabled. A retracts one from card 2 and re-allocates to card 1. Advance to *Discuss*; controls and budget chip disappear in both browsers; aggregate badges now appear and both clients agree (card 1: 3, card 2: 3).
- Vote reclamation. With A and B mid-vote (say A has 2 on card 1), A steps back to *Collect* and deletes card 1; A's budget chip recovers the freed votes the next time A advances to *Vote*; `Votes:` badge for the deleted card is gone everywhere.

**Manual verification:**
- Create a room with `votesPerParticipant = 5`, advance to Vote, allocate votes, refresh the tab — ballot persists (IndexedDB).
- Open the same URL in a private window; allocate votes there; first window sees aggregate update live; neither window renders the other's per-card allocation.
- Disconnect the relay process; cast votes in both windows; reconnect; aggregates converge with no double-count.
- Step back Vote → Collect; ballots intact when stepping forward again.

## Open questions

_All resolved — see commit history of this file for the trail._

- **Vote-budget bounds:** any positive integer, default 5, no upper cap.
- **Aggregates during Vote:** hidden. Each participant sees only their own per-card allocation and remaining budget. Aggregates appear from *Discuss* onward.
- **Card deletion + vote reclamation:** `deleteCard` strips the card's ballot entries across all authors in the same transaction, refunding the freed budget automatically.

## Rollout / commit plan

1. **`feat(room): persist votesPerParticipant in meta`** — extend `SeedParams`, `seedRoom`, `RoomMetaSnapshot`, `readRoomMeta`; unit tests; no UI yet.
2. **`feat(create): votes-per-participant input on create form`** — wire the new input into `+page.svelte`; component test; default 5.
3. **`feat(room): ballots shared type + vote helpers`** — add `ballots` Y.Map, `castVote`/`retractVote`/`clearVote`/`readVoteTotals`/`readMyBallot`; phase + budget gating; extend `deleteCard` to refund votes; unit tests. Stores still absent; ballots inert.
4. **`feat(room): vote stores`** — `myBallotStore`, `voteTotalsStore`; observer-driven snapshots; unit tests for emission.
5. **`feat(ui): VoteControls + VoteBudget components`** — pure presentational components + tests; not yet wired into the room page.
6. **`feat(retro-card): aggregate badge + voting snippet slot`** — surface `voteTotal` on `RetroCard.svelte`; render badge from Vote phase onward; tests.
7. **`feat(room-page): wire voting UI during Vote phase`** — header budget chip, per-card VoteControls, store subscriptions; page-level tests.
8. **`test(e2e): two-client dot voting flow`** — Playwright spec end to end.
9. **`docs(plan): note ballots top-level shared type + UI-layer privacy`** — update `docs/architecture.md` CRDT-shape section.
