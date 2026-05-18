---
description: Review the current feature branch against main using the pr-reviewer agent.
---

You are running an automated review of the current local branch against `main`.

## Pre-flight

1. `git rev-parse --abbrev-ref HEAD` — capture the current branch.
   - If it's `main`, refuse: tell the user to check out a feature branch first.
2. `git fetch origin main --quiet` if a remote `origin` exists; otherwise skip silently. Use the local `main` ref as the base.
3. Determine the merge base: `git merge-base main HEAD`. If `git diff <base>...HEAD` is empty, exit with "Nothing to review — branch is even with main."
4. Identify the feature name from the branch (e.g. `feature/<name>` → `<name>`) so the reviewer can locate `docs/features/<name>.md`. If the branch doesn't match that pattern, pass the branch name as-is and let the agent ask.

## Invoke the reviewer

Launch the `pr-reviewer` agent via the `Agent` tool with `subagent_type: "pr-reviewer"`. Give it a self-contained prompt:

- The base (`main`) and head (`HEAD`) refs, plus the merge-base SHA.
- The branch name and inferred feature name.
- Instruct it to gather the diff via `git diff <merge-base>...HEAD` and the commit log via `git log <merge-base>..HEAD --oneline`.
- Tell it to read `docs/architecture.md` and, if present, `docs/features/<name>.md`.
- Ask for its report in the exact format defined in its agent spec (Verdict / Must-fix / Should-fix / Nits / Plan-PRD drift / Test coverage gaps).

Do not pre-summarize the diff yourself — the agent does the reading.

## After the agent returns

1. Print the agent's report verbatim so the caller (often `/implement`) can triage it.
2. Do not edit code, do not commit, do not push. This command is read-only.
