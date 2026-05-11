---
description: Run the pr-reviewer agent against the current branch's diff vs main, and surface its verdict.
---

You are running an automated code review of the current feature branch against
`main`. This command can be invoked directly by the user, or chained from
`/implement` as the pre-merge gate.

## Pre-flight

1. `git rev-parse --abbrev-ref HEAD` to identify the branch under review.
   - If the branch is `main`, stop and tell the user there's nothing to review.
   - If the branch is `feature/<name>`, derive `<name>` for the agent prompt.
   - For any other branch shape, proceed but note the unusual branch name.
2. Confirm `main` exists locally (`git rev-parse --verify main`). If it
   doesn't, surface the error — the review needs a base.

## Run the review

Invoke the `pr-reviewer` agent (via the `Agent` tool with
`subagent_type: "pr-reviewer"`). Brief it with:

- The branch under review and its base (`main`).
- The exact diff command to use: `git diff main...HEAD`.
- The feature plan path if one exists at `docs/features/<name>.md`.
- That it should follow its own report format (Verdict / Must-fix /
  Should-fix / Nits / Plan-PRD drift / Test coverage gaps).
- A request to keep the report tight — cite file:line, no padding.

## Relay

Print the agent's report verbatim under a clear heading so the user can
read it without rerunning. Do not summarize away `Must-fix` items.

## Exit signal

End your turn with one machine-parseable line so callers (like
`/implement`) can branch on it:

```
REVIEW_VERDICT: APPROVE | REQUEST_CHANGES | COMMENT
```

Use `REQUEST_CHANGES` whenever the agent's verdict is `REQUEST CHANGES` **or**
when its report contains any `Must-fix:` entries. Otherwise mirror the
agent's verdict.

## Rules

- Read-only. Never edit code or commit.
- Don't run the test suite — `/implement` already did, and `/review` is
  cheap precisely because it stays out of the test loop.
