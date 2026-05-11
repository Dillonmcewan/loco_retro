---
description: Implement a feature from its plan in docs/features/<name>.md, committing frequently.
argument-hint: <feature-name>
---

You are implementing a feature whose plan already exists. The plan is the contract — follow it.

Feature name: `$ARGUMENTS`

## Pre-flight (do not skip)

1. Read `docs/features/$ARGUMENTS.md`. If it doesn't exist, stop and tell the user to run `/feature-plan $ARGUMENTS` first.
2. Re-read the relevant sections of `docs/plan.md`. The dev plan supersedes anything older in the feature plan; if they conflict, raise it before coding.
3. Check `docs/features/$ARGUMENTS.md` for unresolved **Open questions**. If any remain, stop and ask the user to resolve them — don't guess.
4. Confirm the working tree is clean (`git status`). If not, ask the user how to proceed.
5. **Switch to a feature branch** named `feature/$ARGUMENTS`:
   - `git rev-parse --abbrev-ref HEAD` to see the current branch.
   - If on `main` and the tree is clean: `git switch -c feature/$ARGUMENTS` (or `git switch feature/$ARGUMENTS` if it already exists — treat that as resume).
   - If already on `feature/$ARGUMENTS`: continue.
   - If on any other branch: stop and ask the user.
   - Never start work directly on `main` — every commit in this run must land on `feature/$ARGUMENTS`.

## Implementation rules

- **Commit frequently.** Follow the rollout/commit plan in the feature doc. Each commit should be small, focused, pass type-check, and have a clear message. The user reviews diffs between commits — large commits hide intent.
- Stay within the file-level scope listed in the feature plan. If you need to touch a file not listed, pause, update the plan, and explain.
- Implement tests alongside code (per the feature's test plan). Run them before each commit when feasible.
- If you make a non-trivial decision during implementation (a library choice, a schema shape, a new convention), update `docs/plan.md` in the **same commit** that introduces it.
- Do not run destructive git operations. Do not push. Do not open PRs unless asked.

## Done criteria

- All file-level changes from the plan are made.
- All test-plan items are implemented and passing.
- `docs/plan.md` reflects any new decisions.
- The feature plan's open questions are all resolved (or explicitly deferred with a note).
- Working tree is clean — every change is committed on `feature/$ARGUMENTS`.

## Wrap-up

Once the Done criteria are met:

1. **Run the full guard once before offering merge.** In order: `pnpm check`, `pnpm lint`, `pnpm test:unit`, `pnpm test:e2e`. If anything fails, fix it (or surface why and stop) — do **not** proceed to the merge prompt with red tests.
2. Print the final summary: commits made, tests added, files changed, anything deferred or surprising. Include the green pass status from step 1.
3. **Invoke the `/review` slash command** to get an automated review of `feature/$ARGUMENTS` against `main`. Run it via the `Skill` tool (`skill: "review"`) and let it print its report. Read its trailing `REVIEW_VERDICT:` line: if it is `REQUEST_CHANGES`, default the next question to **Hold for review** and recommend the user address findings via `/address-review` before merging.
4. Ask the user (via `AskUserQuestion`): **"Ready to merge `feature/$ARGUMENTS` into `main`, or hold for review?"** with two options:
   - **Merge now** — `git switch main && git merge feature/$ARGUMENTS` (fast-forward when possible; default git behavior falls back to `--no-ff` if main has moved). Then `git branch -d feature/$ARGUMENTS`. Do not push.
   - **Hold for review** — stay on `feature/$ARGUMENTS`. Tell the user: "starting from this clean tree, add comments inline as you read the code (the pr-reviewer feedback above is a starting point); then run `/address-review` to resolve them; run `/merge` when you're ready to land it."
5. Do not push. Do not open PRs.
