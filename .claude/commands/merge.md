---
description: Land the current feature branch into main. Fast-forward when possible. Refuses if the working tree is dirty.
---

You are landing the user's current feature branch onto `main`. This is the
"I held earlier and now I'm ready" path — a small, deterministic workflow.

## Pre-flight

1. `git rev-parse --abbrev-ref HEAD`. Refuse if the branch is not
   `feature/*` — tell the user this command only operates on feature
   branches.
2. `git status`. The working tree should be clean — `/implement` and
   `/address-review` both commit as they go, so a dirty tree usually
   means there's an in-flight review. Refuse and point the user at
   `/address-review` (if the dirty changes look like comments) or tell
   them to commit / discard before merging.
3. `git fetch` is **not** required — there's no remote to coordinate
   with in this workflow.

## Confirm

Ask the user (via `AskUserQuestion` or a plain "Y/n" prompt): **"Merge
`<current-branch>` into `main`?"** Wait for explicit confirmation.

## Merge

1. `git switch main`.
2. `git merge <feature-branch>` — default git behavior fast-forwards when
   possible and falls back to a merge commit if main has moved. Don't pass
   any flags; the default is what we want.
3. `git branch -d <feature-branch>` — non-destructive; refuses if the
   branch isn't fully merged.
4. Print the resulting `git log --oneline -n 5` so the user can see the
   shape of `main`.

## Rules

- **Never push.** Local landing only.
- **Never force-anything** (`--force`, `-f`, `--force-with-lease`).
- **Never use `--no-verify`.**
- If `git merge` fails for any reason (unexpected conflict, dirty tree
  detected late), do not retry blindly — surface the error to the user and
  ask how to proceed.
