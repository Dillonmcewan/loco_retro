---
description: Resolve review comments left in the working tree — read the diff, group, auto-fix the obvious ones, batch the ambiguous ones for clarification, commit per group.
---

You are processing review comments the user has scattered through the code.

The flow assumes the user started this review from a clean working tree, so
**every change in `git diff` is part of the review** — typically just added
comments pointing at nearby code, occasionally with small inline edits or
deletions the user already made themselves.

The contract is: **no review comment survives a successful run** — every
comment is either resolved-and-deleted with its fix committed, or still
present because the user hasn't answered the clarifying question yet.

The user does not commit manually in this flow. You drive every git op.

## What counts as a review comment

Any comment line(s) the user has added in the current diff. Common shapes:

- `// <text>` — TS / JS / Svelte script
- `<!-- <text> -->` — HTML / Svelte markup
- `/* <text> */` — CSS / Svelte style, also valid inline in JS/TS

Adjacent comment lines (a block of `// …\n// …` or a multi-line
`/* … */`) count as **one** comment. Treat them together; don't split.

The user might also have made a small inline edit alongside a comment —
e.g. they renamed a local var to flag intent. Read those edits as part of
the surrounding comment's context, not as separate items.

## Pre-flight

1. `git rev-parse --abbrev-ref HEAD`. If on `main`, refuse: tell the user
   to run `/implement <name>` first or check out the feature branch.
2. `git diff` — capture the full uncommitted diff. This *is* the review.
3. Inspect the diff:
   - If the diff is empty, exit with "Nothing to review."
   - If the diff contains substantial non-comment changes that don't look
     like they're attached to a comment (e.g. a whole new function body),
     pause and ask the user — they may not have intended this to be a
     review pass. Don't auto-clobber real work.

## Group

For each comment in the diff, read a few lines of surrounding context to
understand intent. Cluster comments into **functional groups** — things
that should be reasoned about together. Examples: "rename X across
files", "drop unused branch in foo()", "extract this helper". One comment
per group is fine; the goal is "fix together what should be reasoned
about together," not artificial clustering.

## Auto-resolve obvious groups, committing per group

For each group whose intent is unambiguous (renames, dead-code deletion,
simple extractions, typo fixes, mechanical instructions):

1. Apply the change and **delete the comment line(s)** in the same
   `Edit`. The comment must not survive.
2. Run `pnpm check` to make sure types still pass. If it fails, fix the
   underlying issue — don't carry on.
3. `git add` the touched files and commit with a clear
   conventional-commit message. The first line should describe the
   change; the body should quote the original comment text so the commit
   explains why this happened.
4. **One commit per group.** This keeps the project's "commit frequently"
   rule intact and gives each comment its own reviewable diff.

## Defer ambiguous groups

If a group needs a judgement call ("rethink this approach", "should this
also accept Y?", "is this still needed after X landed?") leave its
comment(s) intact and queue the group for the final batched message. Do
not commit it.

## Surface remaining groups in one batched message

After every auto-resolvable group is done and committed, present a single
message to the user listing every deferred group. For each:

- File:line refs and the exact comment text.
- One-sentence summary of why it's ambiguous.
- 1–3 candidate resolutions, with a recommendation.

Use `AskUserQuestion` if a group's choices are clean enums. If a group
is genuinely open-ended, ask plainly and wait for a free-text answer. As
each answer arrives, apply the edit, delete the comment, run `pnpm
check`, and commit that group — same per-group cadence as the
auto-resolve step.

## Verify clean exit

1. Run `git diff`. It should be empty if every group was answered. If
   anything remains, list it for the user so they know what's still
   pending.
2. Run `pnpm check` and `pnpm lint` once over the whole project as a
   final guard. (Don't run tests — the user batches those.)
3. Print a summary: groups auto-resolved, groups deferred-and-answered,
   groups still open, files touched, commits made.

## Rules

- **Never run on `main`.** Always operate on a `feature/*` branch.
- **Never push** and **never merge** here. `/merge` handles landing.
- **Never skip commit hooks** (`--no-verify`).
- If a fix breaks `pnpm check`, fix the breakage in the same commit — do
  not leave the branch in a broken state.
- The user's contract is "I leave a clean working tree, then add comments
  to it." If you find yourself wanting to interpret real code changes as
  review intent, stop and ask — that boundary matters.
