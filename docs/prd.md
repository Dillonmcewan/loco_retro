# loco_retro — Product Requirements

> **Source of truth for *what* we're building.** Update this file as scope changes.
> Implementation details and *how* belong in `docs/plan.md`.

## One-liner

Local-first app for running remote retros.

## Problem & users

Distributed software teams run retros in tools that either require accounts and a SaaS subscription, or lose state when someone's connection blips. We want a frictionless retro tool that joins by code, works offline, and keeps each participant's view authoritative locally — so a dropped connection never costs anyone their cards.

- **Primary user:** the facilitator (tech lead / EM / scrum master) running the retro for a small software team.
- **Secondary users:** participants on that same team — typically 3–15 people, distributed.
- **Out of audience (v1):** large orgs needing SSO, async-only teams, non-software teams with very different ceremony shapes.

## Goals

- **G1:** A team can go from "share the join code" to a finished retro in under 30 minutes, with zero signup for anyone.
- **G2:** A brief loss of connectivity never loses a participant's cards or votes — local edits survive and merge on reconnect.
- **G3:** A facilitator can shape the retro (pick a preset template or define custom columns) without writing config.

## Non-goals (v1)

- Accounts, SSO, or org/team management.
- Async retros where cards are added over hours or days.
- Card grouping / clustering during synthesis.
- Formal action-item tracking, assignment, or external integrations (Jira, Slack, GitHub, etc.).
- Exporting retros to Markdown / other formats — revisit in v2.
- Native mobile apps — the web app should be responsive, but mobile-native is out of scope.
- Long-term cloud archival. Data lives on participants' devices; any relay is best-effort and not a system of record.

## Requirements

_Numbered (R1, R2, …) so feature plans in `docs/features/` can trace back._

- **R1 — Create a room.** A facilitator picks a template (preset or custom columns) and a room name, and the system produces a shareable URL.
- **R2 — Join a room.** Anyone with the URL can join by entering a display name. No account required. The display name is stored locally and reused on the next visit from the same browser.
- **R3 — Preset templates.** Built-in presets are available at room creation: *Went well / Didn't go well / Actions*, *Start / Stop / Continue*, *Mad / Sad / Glad*, *4Ls (Liked / Learned / Lacked / Longed for)*.
- **R4 — Add / edit / delete cards.** During the *Collect* phase, any participant can create cards under any column and can edit or delete their own cards. Cards are attributed to the author's display name.
- **R5 — Phase progression.** The room moves through phases: *Collect → Vote → Discuss → Closed*. The facilitator advances the phase; phase is shared state and UI affordances change accordingly.
- **R6 — Dot voting.** During the *Vote* phase, each participant has N votes (default 5, configurable by the facilitator at room creation) to allocate across cards. Aggregate vote counts are visible to everyone; individual ballots are private.
- **R7 — Discuss view.** During *Discuss*, cards are sorted by vote count (descending). The facilitator can mark a card as discussed; the indicator is visible to all.
- **R8 — Local-first sync.** Each client holds full retro state locally via a CRDT and syncs through a managed Cloudflare Durable Object (via `y-partykit`). Edits made while offline appear locally immediately and merge on reconnect without data loss, for the duration of a single retro session.
- **R9 — Room lifecycle.** The facilitator can close a room. Closed rooms are read-only but remain viewable by anyone with the join code as long as the state exists on at least one participant's device or the relay's best-effort cache.
- **R10 — Custom columns.** As an alternative to picking a preset, the facilitator may define their own columns (1–6, with custom titles) at room creation.

## Open questions

_Deferred until a feature plan or implementation forces an answer._

- Are cards hidden from other participants until a *reveal* sub-phase, or visible to everyone as they're written? (Independent vs. social brainstorm.)
- ~~Does the relay persist room state when no participants are connected, or is it pure pass-through?~~ **Resolved (partykit-sync):** Cloudflare's Durable Object holds the latest Yjs snapshot in DO storage while the room is active. We (the team) don't operate or persist anything ourselves; Cloudflare manages both the DO and its storage.
- What happens if the facilitator drops? (Auto-promote next participant? Allow any participant to advance phases?)
- Are per-card reactions or threaded comments in scope for v1, or v2?
- Concurrent-room limits and abuse considerations on the relay.
- Accessibility floor — pin a target (keyboard navigation, screen-reader support, color-contrast level).
