# Feature plans

This folder holds **one markdown file per feature**, named `<feature-name>.md`.

Each feature plan is a contract between the PRD (`../prd.md`), the dev plan (`../architecture.md`), and the code that gets written. It is produced by the `/feature-plan` slash command and consumed by `/implement`.

## What a feature plan must contain

- **Requirement traceability** — which PRD requirement(s) (R1, R2, …) this feature satisfies, and what is explicitly out of scope.
- **Design** — the approach, how it aligns with `../architecture.md`, and alternatives considered.
- **File-level changes** — every file to be created or modified, with a one-line reason each.
- **Test plan** — unit, component, and e2e cases plus manual verification steps.
- **Open questions** — anything that must be resolved before `/implement` can run.
- **Rollout / commit plan** — the proposed sequence of small commits.

## Workflow

1. Add or update a requirement in `../prd.md`.
2. Run `/feature-plan <name>` to draft `<name>.md` here.
3. Review the plan; resolve open questions; edit the file directly if needed.
4. Run `/implement <name>` to build the feature with frequent commits.
5. After merge, leave the file in place as historical record — don't delete shipped feature plans.
