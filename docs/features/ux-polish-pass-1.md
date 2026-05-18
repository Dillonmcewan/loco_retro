# Feature: UX polish pass 1

## Requirement traceability

This feature is **cross-cutting polish**, not a new PRD requirement. It tightens UX of features already shipped:

- **R1 / R2 / R11 — Create / Join / Dashboard.** Tab title, favicon, brand wordmark, dashboard top bar, layout stability across empty/populated states. The dashboard feature plan (`docs/features/dashboard.md`) explicitly noted phase badges as "trivially re-addable later by extending `RoomIndexEntry`" — that's the hook we use here.
- **R3–R8 — Card lifecycle / phases / voting / discuss.** Layout stability on the retro page: cards keep a constant height across editing and across phases; columns keep a constant height when the vote budget appears/disappears; "discussed" gets a stronger visual cue.

No PRD requirements are added or changed.

## Design

Single polish pass, three groupings:

### A. Global theme + brand

- **Brand**: "LocoRetro" everywhere user-facing. The `loco_retro` wordmark (lowercase, underscored) is replaced by a two-tone "Loco | Retro" treatment in a new `src/lib/Wordmark.svelte`.
- **Tab title**: `LocoRetro` default (in `app.html`), overridden per page via `<svelte:head>`: `LocoRetro` on the dashboard, `{retro name} · LocoRetro` on the retro page.
- **Favicon**: new `static/favicon.svg` (SVG-only — universally supported in evergreen browsers, no PNG fallback). Linked from `app.html`.
- **Palette**: keep the warm cream + coral primary. Add two new accents (teal secondary, mustard tertiary) and four phase-specific tokens so retro tiles can be color-coded by current phase. All new colors land as `--color-*` tokens in `src/app.css` per the design-token discipline in `docs/architecture.md`.

### B. Dashboard polish

- **Top bar**: a slim header at the top of the page with the wordmark on the left. The existing `<h1>Your retros</h1>` stays as a section header below.
- **No layout swap on empty state**: drop the `main.empty { max-width: 36rem }` rule and the centered `.hint` paragraph. Grid renders identically whether you have 0 or 50 retros.
- **Placeholder tiles**: when `rooms.length === 0`, render two decorative placeholder tiles (dashed border, sample names, helper copy). Purely visual — no click handlers. They disappear the moment a real retro exists.
- **Phase-aware tiles**: `RoomTile` gets a left edge stripe colored by `entry.phase`, plus a small phase icon next to the template label. Requires `RoomIndexEntry.phase?: Phase` — written on every retro-page meta update via the existing `upsertRoom` call. Missing field defaults to `collect`.
- **Invert tile hover**: today the tile is shadowed by default and goes flat-ish on hover; flip to flat default + elevated on hover. This matches user expectation that hover lifts a card off the page.

### C. Retro page polish

- **Per-page title** via `<svelte:head>`.
- **Back to dashboard**: an `ArrowLeft` link to `/` in the retro header.
- **Constant-height cards** (`src/lib/RetroCard.svelte`):
  - Current root cause: edit mode swaps `<p>` for `<textarea>` and replaces the footer with a separate `.actions` row; phase changes mount/unmount vote total badge, VoteControls, discussed toggle, and edit/delete buttons. The card structure literally changes between phases.
  - Fix: the card structure stays constant. Footer is always rendered. Edit-mode save/cancel buttons live in the same footer position (replacing the owner-actions slot). Vote total, VoteControls, and discussed toggle are always-mounted slots — when not active for the current phase, they render an empty placeholder element with the same dimensions. Textarea gets `min-height` matched to a single-line `<p>` height so entering edit on a short card doesn't grow it.
- **Constant-height columns**: a min-height slot inside `.phase-stack` reserves vertical space across phases. The slot hosts `CollectStatus` during Collect (the self-reported ready toggle — see Addendum) and `VoteBudget` during Vote / Discuss / Closed. The slot's `min-height` keeps the header the same height even when neither component renders content of its own.
- **Stronger "discussed" indicator**: the whole card gets a faint green tint (`--color-success-soft` background + matching border) on top of the existing strikethrough — visible even when the card text is one short word.
- **Better empty-column placeholder**: replace `<p>No cards yet.</p>` with a centered icon + short copy ("Drop your first card."). Fixed height so it doesn't affect column sizing.

### Out of scope (deferred)

- Create-retro modal redesign (user said "looks pretty good, improve later").
- Light/dark mode.
- Animated phase transitions.
- Column header accent bars / custom illustrations.
- Mobile-specific tweaks.

## Alternatives considered

- **Sidecar phase via observed Yjs across all docs**: would mean opening every retro's `Y.Doc` on dashboard mount. Rejected for the same reason `docs/features/dashboard.md` rejected enumerating IndexedDB — too expensive. The sidecar field stays "best-effort, refreshed on open" exactly as the existing `lastOpenedAt` field.
- **CSS containment + intrinsic sizing for card stability**: doesn't help because the elements actually mount/unmount. The fix has to be at the template level (always-render + visibility).
- **PNG favicon fallback**: rejected — every browser this app targets handles SVG favicons; adding a PNG doubles the asset count for no real coverage gain.

## File-level changes

**New files**:
- `static/favicon.svg` — two-tone monogram (coral + teal).
- `src/lib/Wordmark.svelte` — two-tone "Loco | Retro" inline mark.
- `docs/features/ux-polish-pass-1.md` — this doc.

**Modified files**:
- `src/app.html` — default `<title>`, favicon `<link>`.
- `src/app.css` — new `--color-secondary*`, `--color-tertiary*`, `--color-phase-*` tokens.
- `src/lib/rooms.ts` — `RoomIndexEntry.phase?: Phase`; `isEntry` accepts (but doesn't require) it.
- `src/routes/+page.svelte` — top bar + Wordmark; svelte:head; placeholder tiles in empty state; drop `.hint` and `main.empty` width swap.
- `src/lib/RoomTile.svelte` — left phase stripe, phase icon, inverted hover, `entry.phase` consumption.
- `src/routes/r/[id]/+page.svelte` — svelte:head with retro name; back-to-dashboard link; phase-aware min-height slot (`CollectStatus` during Collect, `VoteBudget` otherwise); write `phase` to room index when meta changes; better empty-column placeholder.
- `src/lib/RetroCard.svelte` — keep footer always rendered; always-mounted vote-total / vote-controls / discussed-toggle / owner-actions slots with placeholder fallbacks; textarea min-height; stronger discussed tint.
- `src/routes/page.test.ts`, `e2e/dashboard.spec.ts` — replace assertions on the removed "show up here" hint with assertions on the new placeholder copy.

## Update to `docs/architecture.md`

The original plan items needed no architectural change. The addendum scope below introduced three reusable patterns (reduced-motion gating, `$effect.pre` transition gating, deterministic per-room registry pick) that have been captured under the Conventions section of `docs/architecture.md`.

## Addendum: scope that landed beyond this plan

Several pieces were added during implementation that weren't in the original plan above. Recording them here for traceability; future cross-cutting work on any of these should branch off into its own feature plan rather than accreting more onto this one.

- **Closed-phase celebration system** — `src/lib/ClosedCelebration.svelte`, `src/lib/celebrations.ts`, `src/lib/celebrations/RocketShow.svelte`, `src/lib/celebrations/DiscoShow.svelte`. Over-the-top "you finished a retro" moment when phase transitions to `closed`. Variant is picked deterministically per `roomId`; `?celebration=<id>` overrides for deliberate testing. Auto-dismisses after 6.5s or on backdrop click. Reduced-motion fallback shows a static banner mirroring the variant's text.
- **Self-reported ready toggle in Collect** — `src/lib/CollectStatus.svelte`. Replaces the previous static vote-budget slot during Collect with an "I'm done adding cards" / "Done adding cards" toggle. Drives the advance-arrow ready glow below via awareness `ready` field.
- **Advance-ready glow on `PhaseControls`** — `advanceReady` prop lights up the next-phase arrow when (a) every participant is ready in Collect or (b) every participant has spent their full budget in Vote.
- **`VoteBudget` depleted state** — `remaining === 0` flips the badge to a success-tinted "Done voting!" pill.
- **Per-card discussed celebration on `RetroCard`** — confetti + stamp animation when a card is marked discussed; gated by the `$effect.pre` transition pattern so it never plays on initial render.
- **Deterministic empty-state placeholders** — `src/lib/emptyPlaceholders.ts` + `src/lib/hash.ts`. Each empty column shows an icon + copy picked deterministically from a curated pool by `(roomId, columnId)`, with accent-color rotation across the columns of a room.

The "deferred / out of scope: animated phase transitions" item above is in spirit relaxed by the closed-phase celebration — but the rest of that list (modal redesign, light/dark, column accents, mobile) still stands.

## Verification

`pnpm dev:all`, navigate to `http://localhost:5173`:

- Tab title `LocoRetro`; favicon visible.
- Dashboard empty: grid shows "+ New retro" tile + two decorative placeholder tiles. Layout identical to populated state.
- Create a retro → layout doesn't shift.
- Tile hover lifts up (default flat, hover elevated).
- Each populated tile shows a colored left stripe + phase icon matching the retro's current phase.
- Retro page tab title shows the retro name.
- Back arrow in the retro header returns to `/`.
- Add a card, edit it: card height unchanged on entering/leaving edit mode.
- Step through phases (collect → vote → discuss → closed): card heights constant, column heights constant. VoteBudget reserves space in all phases.
- Mark a short card discussed → whole card visibly tints green; strikethrough still applies.
- Empty column shows the iconified empty state instead of bare text.

Automated:

- `pnpm check` — no TS errors.
- `pnpm test:unit` — passes after updating `page.test.ts` to the new empty-state copy.
- `pnpm test:e2e` — passes after updating `dashboard.spec.ts` empty-state assertion.
