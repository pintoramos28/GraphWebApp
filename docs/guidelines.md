# Guidelines for Working with `docs/tasks.md`

These instructions keep the spec-driven checklist reliable and auditable.

## 1) Marking Progress
- Change `[ ]` to `[x]` when a task is complete. Do **not** delete completed tasks.
- If a task is partially complete, keep `[ ]` and add a brief status note in a bullet beneath it (max 2 lines).

## 2) Keeping Phases Intact
- Maintain existing **phase headings**. You may insert new tasks **within the most relevant phase**.
- If scope changes, add a **new task** rather than rewriting history. Reference the discussion/ticket in a trailing note.

## 3) Linking Discipline (Requirements ↔ Plan ↔ Tasks)
- Every task **must** include a `Refs:` trailer with **plan IDs (P#)** and **requirement IDs (R#)**. Example:  
  `**Refs:** P22, P25; R10, R11, R19`
- When you add a new task:
  1. Verify there is a corresponding **plan item**. If not, add one in `docs/plan.md` and link it.  
  2. Link to the relevant **requirements** in `docs/requirements.md`.
- **Never renumber** existing requirements (R#) or plan items (P#). Append new ones at the end (e.g., **R47**, **P85**).

## 4) Consistent Formatting
- One task per line, numbered sequentially, with a checkbox at the start: `1. [ ] ... **Refs:** P#, R#`
- Keep descriptions **actionable** (imperative voice) and **scoped** (deliverable in ≤1–2 days).

## 5) Definition of Done (DoD)
A task is complete when:  
- All linked **acceptance criteria** in `docs/requirements.md` that the task touches are met,  
- Code has tests (unit/integration/E2E as applicable) and passes CI,  
- UX/A11y implications are addressed (focus order, labels, contrast),  
- Documentation (user or developer) for the change is updated.

## 6) Adding/Changing Requirements or Plan Items
- Propose changes via a PR updating `docs/requirements.md` and/or `docs/plan.md` with rationale.  
- Use **append-only numbering**: do not reassign existing R# or P#.  
- Update tasks to reference the new IDs and add at least one task that implements the change.

## 7) Branching & Commits
- Branch names: `feat/<short-name>`, `fix/<short-name>`, `chore/<short-name>`, `docs/<short-name>`.  
- Commit messages should reference task numbers and IDs:  
  `feat: implement scatter jitter (Task 24, P22; R11)`

## 8) Reviews & Quality Gates
- Each PR requires at least one review.  
- CI must pass lint/type/unit; E2E runs on smoke paths pre-merge.  
- Add screenshots or exported PNG/SVG/HTML for chart-related changes in the PR.

## 9) Traceability
- Keep the **Refs** lines accurate. They are the backbone for traceability from requirement → plan → code changes.  
- If a task’s scope expands, **split it** so each piece still aligns cleanly with specific requirements.
