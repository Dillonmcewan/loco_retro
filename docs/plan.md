# loco_retro — Development Plan

> **Source of truth for *how* we're building it.** Architecture, conventions, tooling, testing.
> Re-read the relevant section of this doc before touching code on any feature.
> Update this doc in the same commit whenever a non-trivial decision changes.

## Tech stack (pinned)

- **Framework:** SvelteKit (TypeScript) — full-stack, using SvelteKit endpoints for server logic.
- **Package manager:** pnpm.
- **Tests:**
  - Unit & component: Vitest (+ `@testing-library/svelte` for components).
  - End-to-end: Playwright.
- **Lint / format:** ESLint + Prettier (SvelteKit defaults).
- **Icons:** `lucide-svelte` — per-icon imports (`lucide-svelte/icons/<name>`) keep the bundle tree-shaken.
- **State / persistence:** **Yjs** (CRDT) + **`y-indexeddb`** for local persistence. The browser holds the authoritative copy of every retro it has touched.
- **Realtime transport:** **`y-partykit`** over WebSocket. The room "server" is a Cloudflare Durable Object defined in `party/main.ts`; its `onConnect` delegates to `y-partykit`'s built-in Yjs sync helper with `persist: { mode: 'snapshot' }`, so the latest Yjs state survives DO hibernation and unsticks late-joiner bootstrap. We (the team) operate no server — Cloudflare runs the DO. The client's PartyKit host is required from `VITE_PARTYKIT_HOST`, loaded by Vite from committed env files: `.env` for dev defaults (`localhost:1999`) and `.env.production` for the prod host (baked in at `vite build` time). No source-level fallback — if the env var is missing the client throws at module load.
- **Deployment adapter:** **`@sveltejs/adapter-cloudflare`**. SvelteKit deploys to Cloudflare Pages; the PartyKit worker deploys via `partykit deploy` to the same Cloudflare account.

## Architecture

- **Local-first sync model — CRDT (Yjs).** Each room is a `Y.Doc` named by its room id. Persistent state (room name, columns, cards, ballots) lives in shared Yjs types inside that doc and is mirrored to IndexedDB by `y-indexeddb`. Conflicts merge automatically; no manual conflict resolution code.
  - **Top-level shared types on the room doc:** `meta` (`Y.Map`, carrying `{ name, phase, votesPerParticipant, chrisMode }`), `columns` (`Y.Array<Y.Map>`, the sole source of truth for room shape — column titles and ids live here, not in `meta`), and `ballots` (`Y.Map<authorId, Y.Map<cardId, number>>`). Each author owns their own keyed entry in `ballots`, so concurrent +1 / −1 mutations from different authors never race on a shared counter. Templates are a pure presentation concept (presets + the user's local retro history) — there is no persisted `templateId`.
  - **Ballot privacy is a UI convention, not a CRDT property.** Ballots are stored unencrypted in the shared doc; only the local viewer's per-card allocations are bound to the UI. A determined participant who inspects raw Yjs state could read others' ballots — "private" in the PRD means "private in the product UI," not cryptographically secret.
- **Realtime transport — `y-partykit`.** Each client opens a `YPartyKitProvider` against the PartyKit host (`VITE_PARTYKIT_HOST`; `localhost:1999` in dev, `<project>.<account>.partykit.dev` in prod). The Durable Object hosting the room runs `y-partykit`'s `onConnect` helper with snapshot persistence, so the latest Yjs state survives DO hibernation. Offline edits queue locally and replay on reconnect; late joiners can bootstrap from the DO even when no peer is online.
- **Identity / room model — anonymous + shareable URL.** A room is created with a fresh UUID v4; the URL `/r/<id>` is the share artifact. There are no accounts. A participant's display name is stored in `localStorage` and prefilled on subsequent visits. **Presence** (who is currently in the room) is carried on the Yjs **awareness** channel — ephemeral, not part of the persisted CRDT, so it doesn't need clean-up logic.
- **Client state management — Svelte stores backed by Yjs.** Component code reads from thin Svelte stores that subscribe to Yjs observers and to the awareness channel; writes mutate the Yjs types directly. The whole room layer (id helpers, doc factory, seed, session singleton, derived Svelte stores) lives in a single `src/lib/room.ts`.

Routes that touch CRDT state are client-rendered (`ssr=false`) — Yjs and IndexedDB are browser-only in v1.

## Conventions

- **Plan mode default.** Every Claude Code session starts read-only; implementation only after a plan is accepted.
- **Commit frequently.** Small, focused commits — the diff is the review surface.
- **Feature-plan first.** No application code without a corresponding `docs/features/<name>.md` traced back to a PRD requirement.
- **Tests live next to code** (`*.test.ts` for unit, `*.spec.ts` under `e2e/` for Playwright) — concrete layout TBD when the SvelteKit app is initialized.
- **TypeScript strict mode** on from day one.
- **Flat `src/lib/` structure.** `.ts` utilities and `.svelte` components live alongside each other in `src/lib/`, prefix-disambiguated (`Card.svelte` vs `RetroCard.svelte`). Matches the SvelteKit reference apps (sveltejs/realworld, PocketBase admin) and the dominant community advice — keep `$lib` small, colocate to routes when possible. Promote a group to its own subfolder (e.g. `lib/voting/`) only when it has its own internal structure (5+ files); never split by *type* (`components/`, `utils/`, `stores/`) because that fragments cohesive features.
- **Design tokens.** All component CSS uses CSS variables from `src/app.css` for colors, radii, shadows, **spacing (4px scale: `--space-1`…`--space-24`)**, **font sizes (`--font-size-xs`…`--font-size-2xl`)**, and **icon sizes (`--icon-size-sm`, `--icon-size-md`, `--icon-size-lg`)** for SVG glyphs sized alongside text and clickable icon-button glyphs. Raw `rem`/`px` literals in `padding` / `margin` / `gap` / `font-size` belong only to dimensions of fixed-size primitives (icon-button hit targets, standalone brand/CTA glyphs, container `max-width` / `height`). Add new tokens at the `:root` block before introducing a new literal value.
- **Interactive card surfaces — compose, don't reinvent.** Two tiers: a base that owns *shape* and a specialized layer that owns *generic selectable-card layout*. **`CardSurface.svelte`** is the base — it owns only border, radius, shadow, hover-lift, focus-visible ring, active, and reduced-motion. It does *not* set padding, text-align, or any other content-layout property; the shared `--card-*` tokens in `src/app.css` (`--card-radius`, `--card-border-width`, `--card-shadow-rest`/`-hover`, `--card-lift`, `--card-accent`, `--card-transition`) drive its visual language. **`CardSelector.svelte`** wraps `CardSurface` and owns *generic selectable-card layout*: the column flex + padding for a selectable tile, the `.is-selected` highlight, the centered/dashed layout that pairs with `variant="dashed"`, and the `--card-selector-accent` CSS variable (muted by default, `--color-primary` when selected) that consumers can read inside their own scope to recolor child glyphs without reaching across the boundary. Used by `CreateRoomModal`, `TemplatePickerModal`, and `ExportModal`. **Callers own their content layout** — e.g. `CreateRoomModal`/`TemplatePickerModal` style their `.template-name` and template-card content in their own component scope, and `ExportModal` styles its `.format-card-body` (icon-over-label) the same way. `RoomTile.svelte` owns its phase-stripe layout and sets `--card-accent: var(--color-phase-X)` inline per phase. Dashboard CTAs (`.new-tile`) compose `CardSurface` directly with their own consumer-side padding/flex. **Rule of thumb:** if you find yourself adding `padding` or `text-align` to `CardSurface`, route it through `CardSurface` → `CardSelector` → caller-scoped content styles instead — CardSurface's scoped selector outranks consumer `:global()` rules on specificity, so layout properties on the base silently override consumer overrides. Content cards (`RetroCard.svelte`) are a separate visual category and stand outside this system.
- **Modal primitive — compose, don't reinvent.** `src/lib/Modal.svelte` is the shared `<dialog>` wrapper. It owns the dialog shell (backdrop, padding, radius, shadow, border, max-width via `--modal-max-width`), the `showModal()` / `close()` lifecycle, the optional X-close button, and the optional backdrop-click dismissal — so every modal in the app inherits one shape and one set of close paths. **Dismiss policy by purpose, two crisp shapes:** (1) **form modals** (data-loss risk on accidental dismiss — `CreateRoomModal`, `TemplatePickerModal` while its `ColumnEditor` is open) — no X, no backdrop dismiss; the user must click an explicit **Cancel** / **Back** button (or press ESC). (2) **decision / info modals** (no in-progress user input — `ExportModal`, `TemplatePickerModal` browse mode, `ClosedCelebrationCTA`) — X close button **and** backdrop dismiss, no Cancel button. Set `dismissOnBackdrop` and `showCloseButton` together for info modals; leave both off (and add a Cancel button wired to the snippet's `close` callback) for form modals. Modal's `children` snippet receives a `close` callback — Cancel buttons must call it (not the parent's `onClose` prop) so every close path routes through the single `<dialog>`-`onclose` event and `onClose` fires exactly once.
- **Reduced-motion gating.** Animated components carry a marker class on their root (e.g. `.celebration-variant`) and a `@media (prefers-reduced-motion: reduce)` rule hides the animated body in favor of a static fallback (text banner, no-animation state). See `RetroCard.svelte`, `PhaseControls.svelte`, `+page.svelte`, `ClosedCelebration.svelte`.
- **Tooltip portal target.** The `tooltip` action in `src/lib/tooltip.ts` appends its tip to the nearest open `<dialog>` ancestor so the tip joins the dialog's top-layer stacking context (otherwise body-level tips render *behind* a modal). Falls back to `<body>` when no open dialog is present. Required when adding tooltips on controls inside `<dialog>` modals.
- **Phase-transition gating with `$effect.pre`.** When an effect should fire only on a *transition* (not on initial mount — e.g. mounting into an already-closed room must not replay the celebration), keep a `prev` local at module scope and skip the first observation by checking `prev !== undefined`. Reference: `RetroCard.svelte:43-52`, `ClosedCelebration.svelte:16-27`.
- **Deterministic per-room registry pick.** Map a `roomId` to one entry in a registry via `hashString(roomId) % REGISTRY.length` so the same room always lands on the same item while different rooms spread. Used by the closed-phase celebration registry and the per-column empty-state placeholders. Reference: `lib/hash.ts`, `lib/celebrations.ts`, `lib/emptyPlaceholders.ts`.
- **Exporters: one snapshot, many formats.** Local-only export flow lives in `src/lib/exporters.ts`: `buildSnapshot(doc)` walks the existing `readRoomMeta` / `readColumns` / `readCards` / `readVoteTotals` helpers into a single POJO; `buildCsv` and `buildMarkdown` are pure functions over that snapshot; `downloadBlob` is the only DOM side-effect. PDF reuses the snapshot via a dedicated print route. Add new export formats by writing another pure builder against `ExportSnapshot` — never a second walker of the Y.Doc.
- **Print-style sub-routes.** Routes that render a Y.Doc-backed page for printing live under `/r/[id]/export/print` (and similar). They set `export const ssr = false` and `export const prerender = false`, reuse the room's `isRoomId` guard, mount via `ensureRoom`, await `persistence.whenSynced` before snapshotting, and call `window.print()` on first paint. A visible `Print` button stays in the DOM (hidden under `@media print`) for re-triggering after a dismissed dialog.

## Standard commands

| Purpose                | Command              |
| ---------------------- | -------------------- |
| Install                | `pnpm install`       |
| Dev (app + PartyKit)   | `pnpm dev:all`       |
| Dev server (app only)  | `pnpm dev`           |
| PartyKit dev server    | `pnpm party:dev`     |
| PartyKit deploy        | `pnpm party:deploy`  |
| Deploy app (Pages)     | `pnpm deploy:app`    |
| Deploy everything      | `pnpm deploy`        |
| Type-check             | `pnpm check`         |
| Lint                   | `pnpm lint`          |
| Format                 | `pnpm format`        |
| Unit tests             | `pnpm test:unit`     |
| E2E tests              | `pnpm test:e2e`      |

`pnpm dev:all` is the recommended local dev command — it runs Vite and `partykit dev` together via `concurrently`, with `VITE_PARTYKIT_HOST=localhost:1999` injected.

## Deploy

Two deployable units, always shipped in this order: the **PartyKit worker first** (because its public host is baked into the SvelteKit build), then the **SvelteKit app**. Both target Cloudflare under a single account; we operate no servers ourselves.

### One-time bootstrap (run on the host, not in the dev container)

The PartyKit and Wrangler login flows both want to open a browser; the dev container is headless, so run these on your host machine where they Just Work. After login, deploys can run from anywhere — but for simplicity, deploy from the host too.

1. `pnpm dlx partykit login` — OAuth to Cloudflare (PartyKit's session).
2. `pnpm dlx wrangler login` — OAuth to Cloudflare (Wrangler's session, separate from PartyKit's).
3. `pnpm party:deploy` — first deploy of the worker. The CLI prints the host: `loco-retro.<account>.partykit.dev`.
4. Replace `<account>` in `.env.production` with the value from step 3 and commit. Vite reads this file during `vite build` and bakes the host into the client bundle.
5. `pnpm dlx wrangler pages project create loco-retro --production-branch=main` — create the Pages project once.

### Steady-state deploy (run on the host)

`pnpm deploy` ships both targets in order: `partykit deploy` → `vite build` (using `.env.production`) → `wrangler pages deploy .svelte-kit/cloudflare --project-name=loco-retro --branch=main`. The composed script lives in `package.json`; `wrangler` is a pinned `devDependency` so the deploy command is hermetic and doesn't depend on a global install.

- **App URL:** `https://loco-retro.pages.dev` (plus any custom domain attached in the Pages dashboard).
- **Worker URL:** `https://loco-retro.<account>.partykit.dev`.
- Manual `pnpm deploy` from a maintainer laptop is still supported as a fallback when CI is unavailable.

### Rollback

- **Pages:** promote a previous deployment from the Cloudflare Pages dashboard (Pages retains build history).
- **PartyKit:** `git checkout <previous-sha> && pnpm party:deploy`.
- No database, no migrations — rollback is purely a redeploy of older code.

### GitHub Actions

Two workflows live under `.github/workflows/`:

- **`ci.yml`** — PR gate. Triggers on `pull_request` (any branch) and `push` to `main`. Runs `pnpm check`, `pnpm lint`, `pnpm test:unit --coverage` (uploaded to Codecov), `pnpm build` against the committed `.env.production`, and `pnpm test:e2e` (Playwright spins up its own PartyKit + Vite via the existing `webServer` block). Playwright report + test-results uploaded as artifacts on failure.
- **`deploy.yml`** — Production deploy. Triggers on `push` to `main` and `workflow_dispatch`. Runs a sanity pass (`pnpm check && pnpm lint && pnpm test:unit`), then `pnpm party:deploy`, then `pnpm build`, then `wrangler pages deploy` via `cloudflare/wrangler-action@v3`. Concurrency `group: deploy-main, cancel-in-progress: false` to avoid racing deploys.

Required repository secrets:

| Secret | Source |
| --- | --- |
| `CLOUDFLARE_API_TOKEN` | Cloudflare dashboard → My Profile → API Tokens (scopes: Pages Edit + Account Read). |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare dashboard → account home (right sidebar). |
| `PARTYKIT_TOKEN` | `partykit token` output on a logged-in machine. |
| `CODECOV_TOKEN` | Codecov dashboard after the repo is linked. |

Branch protection for `main` is defined as code at `.github/rulesets/main.json` and imported once via `gh api -X POST repos/<owner>/loco_retro/rulesets --input .github/rulesets/main.json`. Preview environments per PR remain out of scope until there are users.

## Open decisions

_None currently open. The realtime transport (`y-partykit`) and deploy target (Cloudflare Pages + PartyKit) are pinned as of the `partykit-sync` feature._
