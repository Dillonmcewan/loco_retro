# Feature: Chris mode

## Context

Some facilitators (and Chris in particular) don't want vote-budget scarcity to shape which cards bubble up — they'd rather every participant vote on everything they care about and let signal emerge from the totals. The original `voting` feature pinned `votesPerParticipant` to a positive integer ≥ 1 (validated in `isValidVoteCount`, `src/lib/room.ts`); `castVote` refuses to write past the budget. "Done voting" was implicit: when each author's spend equals the budget, the participant chip auto-flips to green and the facilitator's *Advance* glow lights up.

This feature adds a **Chris mode** option at room creation that uncaps the per-participant budget for that retro, displays an `∞` indicator instead of `X / N`, and gives each participant an interactive "I'm done" toggle (the only way to signal completion when there's no budget to deplete). Normal-mode retros are unchanged.

## Requirement traceability

- Maps to **R6 — Dot voting.** R6 says "default 5, configurable by the facilitator at room creation, … with an optional Chris mode that removes the per-participant cap entirely (uncapped voting; participants signal 'I'm done' manually)." This feature lands the Chris-mode extension.
- Out of scope:
  - **Toggling Chris mode mid-retro.** Set once at seed time, same lifecycle as `votesPerParticipant`. No mid-room facilitator override.
  - **Per-participant override.** It's a room-level switch; everyone in the room shares the same mode.
  - **Surfacing Chris mode on the dashboard tile.** Not requested; the tile already shows template + phase, which is enough for v1.
  - **Renaming `chrisMode`.** The joke stays.

## Design

**Storage — `chrisMode: boolean` on `meta`.** Added alongside `votesPerParticipant` in the Yjs `meta` map. `votesPerParticipant` keeps its existing validation (positive integer required) and persisted value; when `chrisMode` is true the modal disables the input visually and `castVote` consults the flag to skip the `spent >= budget` check. `retractVote` is unaffected (no cap to bypass). `readRoomMeta` defaults a missing `chrisMode` to `false` so pre-existing rooms don't need a migration.

**Create-modal UI.** A native `<input type="checkbox">` labeled "Chris mode" sits in the right half of a two-column grid alongside the votes input. When checked, the number input becomes `disabled` and an `∞` glyph overlays the field. The checkbox label carries a tooltip via the `tooltip` action — *"Everything's made up and the points don't matter"*. (The modal-aware tooltip portal target, documented as a convention in `docs/architecture.md`, keeps the tip above the modal's backdrop.)

**Vote-phase UI — `VoteBudget` is mode-conditional.**

- **Normal mode (`unlimited === false`).** Passive `<span class="budget">` showing `X / N votes remaining`, flipping to green `Done voting!` when `remaining <= 0`. No click handler, no `aria-pressed` — same as the pre-Chris-mode behavior.
- **Chris mode (`unlimited === true`).** Interactive `<button class="budget">` with the toggle pattern `○ I'm done · ∞ votes` ↔ `✓ Done voting!`. `aria-label` is action-describing (`"Mark voting complete"` / `"Mark voting incomplete"`). Clicking calls `onToggleDone`, which sets the awareness `ready` flag — the same flag the Collect-phase "I'm done" toggle already drives.

**"Done voting" state — reuses the awareness `ready` flag.** No new awareness field. To prevent leakage between phases (e.g. a user marked ready in Collect shouldn't enter Vote already "done"), `+page.svelte` carries a `$effect.pre` that clears `localReady` (and the awareness `ready`) on every phase transition, with the standard `prevPhase !== undefined` guard so initial mount is a no-op (see the Phase-transition gating convention in `docs/architecture.md`).

The Vote-phase branch of `doneByClientId` splits cleanly by mode:

```ts
} else if (phase === 'vote') {
  if (chrisMode) {
    out.set(p.clientId, p.ready);                        // manual only
  } else {
    const spent = p.authorId ? (votesSpentByAuthor[p.authorId] ?? 0) : 0;
    out.set(p.clientId, p.authorId !== '' && spent >= votesTotal);  // auto-done
  }
}
```

**Sync surface.** `chrisMode` is persisted on the `meta` Y.Map → automatically replicated by Yjs / `y-partyserver`. The `ready` flag is awareness as before (ephemeral). No new top-level shared types, no transport changes.

**Why these shapes.**
- *Flag on `meta`, not a sentinel `votesPerParticipant = -1`.* Conflates "how many" with "unlimited"; would invalidate `isValidVoteCount`'s positive-integer invariant and force every reader to special-case the sentinel.
- *Conditional button vs span, not a single button in both modes.* The first iteration made the chip interactive in both modes. Review caught an irreversibility bug: when normal-mode auto-done was true, clicking the chip silently set `localReady = true` but the green state stayed (depletion dominated), and after retracting a vote the user got stuck "done." Splitting the modes removes the overlap — each path has one source of truth.
- *Reuse `ready`, not a new `doneVoting` field on awareness.* The semantic is "I'm done with the current phase." Generalizes; one less name to coin.

**Alignment with `docs/architecture.md`.**
- *CRDT shape.* `chrisMode` is one more field in `meta`, already enumerated in the plan's "Top-level shared types" note.
- *Stores backed by Yjs.* `roomMetaStore` already observes the meta map; component code reads `meta.chrisMode` like any other field.
- *Flat `src/lib/`, tests-next-to-code, TS strict.* All changes land in existing files plus the e2e suite. No new subfolder.
- *Design tokens.* New CSS uses existing `--color-primary`, `--color-success`, `--color-success-soft`, `--space-*`, `--font-size-*`, `--icon-size-sm`. The checkbox dimensions (`1rem`) are a fixed-primitive carve-out per the design-token rule.
- *Phase-transition gating with `$effect.pre`.* The new `localReady` reset uses the documented `prevPhase !== undefined` pattern.

## File-level changes

- `src/lib/room.ts` — `SeedParams.chrisMode?: boolean`; `MetaShape` + `RoomMetaSnapshot` carry `chrisMode: boolean`; `seedRoom` writes it; `readRoomMeta` defaults missing flag to `false`; private `readChrisMode(doc)` helper; `castVote` skips the budget check when set.
- `src/lib/CreateRoomModal.svelte` — Chris-mode `<input type="checkbox">` with tooltip; disables the votes input + overlays `∞` when checked; prefills `Retro YYYY-MM-DD` into the room name and focus-and-selects it on open (small adjacent UX upgrade landed in the same pass).
- `src/lib/VoteBudget.svelte` — mode-conditional render: passive span in normal mode (auto-done at depletion), interactive button in Chris mode (manual toggle with action-describing `aria-label`).
- `src/routes/r/[id]/+page.svelte` — `chrisMode` and `voteDone` derivations; mode-split `doneByClientId` Vote branch; phase-transition `$effect.pre` resets `localReady`.
- `src/lib/tooltip.ts` — appends the tip to the nearest open `<dialog>` ancestor so tooltips on controls inside modals clear the top layer. Falls back to `<body>` when no dialog is present. New project-wide convention; documented in `docs/architecture.md`.
- `src/lib/room.test.ts`, `src/lib/VoteBudget.test.ts`, `src/lib/CreateRoomModal.test.ts`, `src/routes/r/[id]/page.test.ts`, `e2e/voting.spec.ts` — unit + e2e coverage (see Test plan).
- `docs/architecture.md` — meta-shape enumeration + tooltip-portal convention bullet.
- `docs/prd.md` — R6 amendment.

## Test plan

**Unit (Vitest):**
- `room.test.ts` — `seedRoom` persists `chrisMode`; `readRoomMeta` defaults missing flag; `castVote` bypasses budget in Chris mode but still rejects outside Vote; **encode/decode round-trip** preserves `chrisMode` (locks the CRDT-persistence promise).
- `VoteBudget.test.ts` — normal mode renders a passive span (no button); flips to "Done voting!" with the `.done` class when `done` is true; Chris mode renders a button, exposes "I'm done" affordance, swaps an ∞ icon for the count, fires `onToggleDone` on click, reflects `done` in both `aria-pressed` and the action-describing `aria-label`.
- `CreateRoomModal.test.ts` — Chris-mode checkbox toggle disables the votes input and submits `chrisMode: true`; the off path submits `chrisMode: false`. Helper `renderAndOpen` waits a frame so the autofocus rAF doesn't race with `user.type`.
- `routes/r/[id]/page.test.ts` — **phase-transition reset:** mark ready in Collect, advance to Vote, assert awareness `ready` flips back to `false`.

**E2E (Playwright, `e2e/voting.spec.ts`):**
- The original two-client dot-voting flow still passes — normal-mode behavior is unchanged.
- New Chris-mode flow: two clients create a Chris-mode retro; the chip shows `I'm done · ∞ votes` and no `X / N`; client A casts > 10 votes on one card with no refusal; A clicks the chip → green `Done voting!`, `aria-pressed=true`, `aria-label="Mark voting incomplete"`; A clicks again → un-marks.

**Manual verification (`pnpm dev:all`):**
- Open `/`, create a normal retro, advance to Vote, cast all votes → chip auto-flips to green `Done voting!`, no click affordance.
- Create a Chris-mode retro → number input disabled, ∞ visible; advance to Vote; click chip → green; click again → un-marks. Open in a second browser context; mark both done → the *Advance* button glows green.
- Hover the Chris-mode checkbox while the create-retro modal is open; the tooltip *"Everything's made up and the points don't matter"* renders above the modal backdrop.

## Rollout

Implemented on `feature/chris-mode`. Initial slice (commits `5b560f7`..`8405e26`) shipped the feature; the second slice (commits `09a8aab`..`HEAD`) addressed `pr-reviewer` feedback — split VoteBudget by mode, fixed test selectors, added the two coverage tests, and wrote this feature plan.
