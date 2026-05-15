# Feature: End-of-retro CTA modal

## Context

When a retro transitions into the *Closed* phase, `ClosedCelebration.svelte` plays a 6.5-second over-the-top show (or, under reduced-motion, a static banner). When it finishes, the user is left on a read-only board with no obvious next step. The retro is *done* — that's exactly the moment to nudge them to **save the artifact** (R12 export) or **head back to the dashboard** (R11) to start the next one.

This feature surfaces those two actions in a small modal that pops up after the celebration ends. Like the celebration itself, the modal must only appear on a **live phase transition** observed by this client — never when the page loads directly into a room that was already closed. We piggyback on the celebration's existing transition detection rather than duplicating the bookkeeping: the celebration fires an `onDismiss` callback at the end of its show (or on backdrop click), and that callback flips the modal open.

## Requirement traceability

- Maps to **PRD R13** (`docs/prd.md:50`): _"When the local client observes a live phase transition into Closed, the user is shown a modal — after the closing celebration finishes — prompting them to export the retro or return to the dashboard. The prompt is suppressed when the client loads directly into an already-closed room. The user may dismiss the prompt without taking either action."_
- Reuses **PRD R12** (export) — the "Export" CTA opens the existing `ExportModal` rather than re-implementing format selection.
- Reuses **PRD R11** (dashboard) — the "Back to dashboard" CTA navigates to `/`.
- Out of scope for this feature:
  - A CTA on initial page load into a closed room (PRD R13 explicitly excludes this).
  - Auto-triggering an export without user confirmation (would violate R12's "any participant can download" — opt-in remains required).
  - Persisting "user dismissed" state across reloads — the modal is a one-shot per live transition.
  - Marketing-style upsell content. The encouraging copy stays brief and functional.
  - Changes to the celebration's content, timing, or variants.

## Design

**Approach.** Two small changes plus one new component:

1. **Extend `ClosedCelebration.svelte`** with a single optional `onDismiss` callback prop, invoked from both dismissal paths it already has (the auto-timeout at line 20-23, and the backdrop-click handler `dismiss()` at line 42-48). No change to the `$effect.pre` transition gate — `onDismiss` simply never fires for the mount-into-closed case because no celebration was scheduled.
2. **New `ClosedCelebrationCTA.svelte`** — a controlled `<dialog>` modal with two action buttons, mirroring the structure of `ExportModal.svelte`. Props: `open: boolean`, `onClose: () => void`, `onExport: () => void`. The dashboard action uses `goto('/')` from `$app/navigation` directly inside the component.
3. **Wire both into `src/routes/r/[id]/+page.svelte`** alongside the existing celebration render (line 511-513). Adds a single `showClosedCTA = $state(false)` and two callback props that flip the flag and chain into the existing `showExportModal` flow.

Because the CTA's appearance is *driven by* `onDismiss`, the transition-only semantic is inherited for free: if the celebration didn't play, the CTA can't open. No duplicate `prevPhase` tracking, no race with celebration timing, no concern about z-index conflict with the celebration's `z-index: 1100` overlay.

**Modal content.** Header, short subtext, two equal-width buttons in an action row, and an X close in the corner.

- Heading: **"Great work!"**
- Subtext: _"Export your retro for analysis, or head back to your dashboard."_
- Primary button: `Download` icon + **"Export retro"** → calls `onExport()` (parent closes CTA, opens `ExportModal`).
- Secondary button: `Home` icon + **"Dashboard"** → calls `goto('/')`.
- Close button: `X` icon top-right → `dialogEl.close()` → triggers the dialog's `onclose` → `onClose()`. ESC and backdrop click route through the same `onclose` path.

**How it aligns with `docs/plan.md`:**

- *Phase-transition gating with `$effect.pre`* (plan.md:43): satisfied via the celebration's existing gate — we don't add a second one.
- *Flat `src/lib/` structure* (plan.md:38): `ClosedCelebrationCTA.svelte` + `ClosedCelebrationCTA.test.ts` live at the top of `src/lib/`, prefix-grouped with `ClosedCelebration.*`.
- *Design tokens* (plan.md:39): the modal's CSS reuses `--color-surface`, `--space-*`, `--radius-lg`, `--shadow-card`, `--font-size-*`, `--color-primary`, `--color-border` — same tokens as `ExportModal.svelte`. No raw literals.
- *Tooltip portal target* (plan.md:42): N/A — the modal has no tooltips inside it.
- *Reduced-motion gating* (plan.md:41): the dialog has no entry animation, so no `prefers-reduced-motion` rule is required. The celebration's own reduced-motion fallback still runs upstream of the CTA.
- *Icons*: per-icon `lucide-svelte/icons/<name>` imports — `Download`, `Home`, `X`.

**Alternatives considered:**

- **Independent `$effect.pre` in the CTA with its own `setTimeout(TOTAL_MS)`** — fully decouples the CTA from the celebration. Rejected: if a user backdrop-dismisses the celebration at 2s, the CTA still waits until 6.5s, leaving dead air. The callback approach gives correct behaviour in all dismissal paths at the cost of one prop on the celebration.
- **Inline format buttons in the CTA (PDF / CSV / Markdown directly)** — fewer clicks to export. Rejected: duplicates the format-picker UI already in `ExportModal`, and the CTA's primary job is the *prompt to export*, not the export itself. Two-step keeps each modal single-purpose.
- **Default to a single format (e.g. PDF) on the Export button** — one click to export. Rejected: removes user choice for the action whose whole point is choice.
- **Bake the CTA *into* `ClosedCelebration.svelte`** as a final scene of the show. Rejected: muddles the celebration's role (an animation) with the CTA's role (a decision affordance), complicates testing each in isolation, and makes the celebration's reduced-motion path harder to keep simple.
- **No close button, only the two CTAs** — forces a decision. Rejected: feels coercive; the user can always export later via the existing Download button, and the dashboard is one click away in the header.

## File-level changes

**New:**
- `src/lib/ClosedCelebrationCTA.svelte` — controlled `<dialog>` modal with heading, subtext, two CTAs, and an X close. Mirrors `ExportModal.svelte`'s open/close `$effect`, `onclose` handler, and styling.
- `src/lib/ClosedCelebrationCTA.test.ts` — Vitest + Testing Library: does not open at `open=false`; opens on `open=true`; ESC / backdrop / X fire `onClose`; "Export retro" fires `onExport`; "Back to dashboard" calls `goto` (mocked from `$app/navigation`).

**Modified:**
- `src/lib/ClosedCelebration.svelte` — add `onDismiss?: () => void` to the props destructure (line 5); invoke `onDismiss?.()` inside the setTimeout callback (line 20-23) and inside `dismiss()` (line 42-48). No other changes.
- `src/lib/ClosedCelebration.test.ts` — add assertions: `onDismiss` is called once after `TOTAL_MS` advances; `onDismiss` is called when the backdrop button is clicked; `onDismiss` is NOT called when the component is mounted directly into `phase='closed'`; `onDismiss` is NOT called on the mount-into-non-closed branch.
- `src/routes/r/[id]/+page.svelte` — import `ClosedCelebrationCTA`; add `let showClosedCTA = $state(false)`; replace the existing `<ClosedCelebration ... />` block (line 511-513) with the celebration (now passing `onDismiss`) plus the new `<ClosedCelebrationCTA>` below it, both inside the same `{#if meta}` guard. On `onExport`, set `showClosedCTA = false` and `showExportModal = true` — chains into existing `handleExport` flow without changes there.

**Reused (no changes):**
- `src/lib/ExportModal.svelte` and the existing `handleExport(format)` flow at `+page.svelte:306-330` — the CTA's Export button just flips `showExportModal = true`.
- `src/lib/exporters.ts` — exercised transitively via the existing export flow.
- `goto` from `$app/navigation` — same target (`/`) as the existing back link at `+page.svelte:376`.
- `lucide-svelte/icons/{download,home,x}` — first two already imported in `+page.svelte`; the CTA component imports its own.

## Test plan

**Component (Vitest + Testing Library) — `src/lib/ClosedCelebrationCTA.test.ts`:**
- Renders nothing visible when `open=false`.
- Calls `HTMLDialogElement.showModal` (polyfilled in `src/setup-tests.ts`) when `open` flips to `true`.
- Heading text "Nice retro." is present.
- Clicking "Export retro" fires `onExport` exactly once and does NOT fire `onClose`.
- Clicking "Back to dashboard" calls `goto` with `'/'` (mock `$app/navigation`); does NOT fire `onClose`.
- Clicking the X close button fires `onClose`; pressing `Escape` (simulating the dialog's `cancel` → `close` flow) fires `onClose`.
- When `open` flips back to `false`, calls `HTMLDialogElement.close`.

**Component (Vitest) — additions to `src/lib/ClosedCelebration.test.ts`:**
- `onDismiss` is called after `vi.advanceTimersByTime(6500)` following a non-closed → closed transition.
- `onDismiss` is called when the backdrop dismiss button is clicked mid-celebration.
- `onDismiss` is NOT called when the component mounts with `phase='closed'`.
- `onDismiss` is NOT called when the component is mounted in a non-closed phase and never transitions.

**E2E (Playwright) — extension to `e2e/` (likely a new `e2e/closed-cta.spec.ts`):**
- Create a room, add a card, advance through phases to *Closed*. After ~6.5s the CTA modal becomes visible. Assert the heading and both action buttons.
- Click "Export retro" → CTA closes, `ExportModal` opens with the three format cards. (Doesn't need to complete the download; coverage for that lives in `e2e/export.spec.ts`.)
- Reset: create a room, immediately close it from another tab (or via a helper that advances phases), then reload the page directly into the closed state. Assert the CTA modal is NOT visible.
- Repeat the first flow, dismiss the CTA with ESC. Assert it closes and stays closed; assert the underlying read-only board is interactable (no leftover backdrop).

**Manual verification:**
1. `pnpm dev:all`; create a room, add at least one card.
2. Advance Collect → Vote → Discuss → Closed. Celebration plays. After it ends, the CTA modal should appear.
3. Click "Export retro" → CTA closes, `ExportModal` opens. Pick CSV, confirm — file downloads as today.
4. Repeat: close another room, this time click "Back to dashboard" → routes to `/`.
5. Repeat: dismiss the celebration early by clicking its backdrop → CTA should appear immediately.
6. Repeat: dismiss the CTA via ESC, X, and clicking the backdrop — all close cleanly.
7. Reload while the retro is already closed → no celebration, no CTA.
8. With OS-level "reduce motion" enabled, repeat the live transition: static banner for 6.5s, then CTA appears.

## Open questions

_Resolved at plan time:_

1. **Export action** — opens the existing `ExportModal` rather than inlining format buttons.
2. **Timing** — CTA appears as soon as the celebration finishes (auto-timeout OR backdrop click), via an `onDismiss` callback added to `ClosedCelebration`.
3. **Dismissal** — standard `<dialog>` semantics: X button, ESC, and backdrop click all close.
4. **Copy** — heading "Nice retro." + subtext "Save it for next time, or head back to your dashboard." Adjust if usability feedback suggests it's too curt.

## Rollout / commit plan

Each commit is independently reviewable; tests land with the code they cover.

1. **`feat(closed-cta): add onDismiss callback to ClosedCelebration`** — modifies `src/lib/ClosedCelebration.svelte`; updates `src/lib/ClosedCelebration.test.ts` with the four new assertions. No UI behaviour change yet (no caller passes `onDismiss`).
2. **`feat(closed-cta): add ClosedCelebrationCTA modal component`** — new `src/lib/ClosedCelebrationCTA.svelte` + `src/lib/ClosedCelebrationCTA.test.ts`. Standalone; not yet wired up.
3. **`feat(closed-cta): wire CTA modal into room page after celebration`** — modifies `src/routes/r/[id]/+page.svelte`. End-to-end flow lights up.
4. **`test(closed-cta): e2e flow for live close → CTA → export`** — new `e2e/closed-cta.spec.ts`.
5. **`docs(prd): R13 — end-of-retro prompt`** — already landed alongside this feature doc; included here for traceability.
