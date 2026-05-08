---
description: Resolve every // REVIEW marker in the working tree — auto-fix the obvious ones, batch the ambiguous ones for clarification, commit per group.
---

You are processing inline review markers the user has scattered through the
code. The contract is: **no `REVIEW:` line survives a successful run** — every
marker is either resolved-and-deleted with its fix committed, or still present
because the user hasn't answered the clarifying question yet.

The user does not commit manually in this flow. You drive every git op.

## Marker syntax

The user uses one of these forms:

- `// REVIEW: <text>` — TS / JS / Svelte script
- `<!-- REVIEW: <text> -->` — HTML / Svelte markup
- `/* REVIEW: <text> */` — CSS / Svelte style

Multi-line markers (consecutive `// REVIEW:` continuation lines, or a block
`/* REVIEW: ...\n   continued */`) on adjacent lines count as **one** comment.
Treat them together; don't split.

## Pre-flight

1. `git rev-parse --abbrev-ref HEAD`. If on `main`, refuse: tell the user to
   run `/implement <name>` first or check out the feature branch.
2. `git status`. If the working tree has uncommitted changes that aren't
   `REVIEW:` markers, ask the user how to proceed before touching anything.
3. Run `rg -n 'REVIEW:' --glob '!docs/**' --glob '!.claude/**' --glob '!.git'`
   from the repo root to collect every marker (path, line, full text).
4. If zero markers, exit with "Nothing to review."

## Group

For each marker, read a few lines of surrounding context to understand intent.
Cluster markers into **functional groups** — things that should be reasoned
about together. Examples: "rename X across files", "drop unused branch in
foo()", "extract this helper". One marker per group is fine; the goal is "fix
together what should be reasoned about together," not artificial clustering.

## Auto-resolve obvious groups, committing per group

For each group whose intent is unambiguous (renames, dead-code deletion,
simple extractions, typo fixes, mechanical instructions):

1. Apply the change and **delete the `REVIEW:` line(s)** in the same `Edit`.
2. Run `pnpm check` to make sure types still pass. If it fails, fix the
   underlying issue — don't carry on.
3. `git add` the touched files and commit with a clear conventional-commit
   message. The first line should describe the change; the body should quote
   the original marker text so the commit explains why this happened.
4. **One commit per group.** This keeps the project's "commit frequently"
   rule intact and gives each marker its own reviewable diff.

## Defer ambiguous groups

If a group needs a judgement call ("rethink this approach", "should this also
accept Y?", "is this still needed after X landed?") leave its marker(s) intact
and queue the group for the final batched message. Do not commit it.

## Surface remaining groups in one batched message

After every auto-resolvable group is done and committed, present a single
message to the user listing every deferred group. For each:

- File:line refs and the exact `REVIEW:` text.
- One-sentence summary of why it's ambiguous.
- 1–3 candidate resolutions, with a recommendation.

Use `AskUserQuestion` if a group's choices are clean enums. If a group is
genuinely open-ended, ask plainly and wait for a free-text answer. As each
answer arrives, apply the edit, delete the marker, run `pnpm check`, and
commit that group — same per-group cadence as the auto-resolve step.

## Verify clean exit

1. Re-run `rg -n 'REVIEW:'`. Should be empty if every group was answered;
   otherwise list what's still pending so the user knows.
2. Run `pnpm check` and `pnpm lint` once over the whole project as a final
   guard. (Don't run tests — the user batches those.)
3. Print a summary: groups auto-resolved, groups deferred-and-answered,
   groups still open, files touched, commits made.

## Rules

- **Never run on `main`.** Always operate on a `feature/*` branch.
- **Never push** and **never merge** here. `/merge` handles landing.
- **Never skip commit hooks** (`--no-verify`).
- If a fix breaks `pnpm check`, fix the breakage in the same commit — do not
  leave the branch in a broken state.
