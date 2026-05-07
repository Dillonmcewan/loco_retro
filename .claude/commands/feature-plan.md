---
description: Draft a feature implementation plan at docs/features/<name>.md, traced to the PRD and dev plan.
argument-hint: <feature-name>
---

You are drafting a **feature implementation plan**. Do not write application code in this command — produce a markdown plan file only.

Feature name: `$ARGUMENTS`

## Steps

1. Read `docs/prd.md` end-to-end. Identify the specific requirement(s) this feature addresses. If the PRD does not yet cover this feature, stop and ask the user to add a requirement first.
2. Read `docs/plan.md` end-to-end. Note the architecture, tech stack, conventions, and testing strategy. Your design choices must align with this document — if they can't, surface the conflict and propose a dev-plan update before continuing.
3. Explore the current codebase enough to understand what files will be touched. Do not edit anything.
4. Write `docs/features/$ARGUMENTS.md` using the structure below. If the file already exists, propose updates rather than overwriting blindly.

## Required structure for `docs/features/$ARGUMENTS.md`

```markdown
# Feature: <human-readable name>

## Requirement traceability
- Maps to PRD section(s): <quote/section refs from docs/prd.md>
- Out of scope for this feature: <bullet list>

## Design
- Summary of the approach (2–4 sentences)
- How it aligns with `docs/plan.md` (call out the specific sections)
- Alternatives considered and why rejected

## File-level changes
- `path/to/file.ts` — what changes and why
- (one bullet per file, both new and modified)

## Test plan
- Unit (Vitest): <cases>
- Component (Vitest + Testing Library): <cases>
- E2E (Playwright): <user flows>
- Manual verification steps the user should run

## Open questions
- <questions to resolve before `/implement`>

## Rollout / commit plan
- Proposed sequence of small commits (each independently reviewable)
```

## After writing the plan

- Print a short summary of the plan and **explicitly list the open questions**.
- Tell the user the next step is to review the plan, resolve open questions, and then run `/implement $ARGUMENTS`.
- Do not begin implementing.
