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
- Final summary lists: commits made, tests added, files changed, anything deferred or surprising.
