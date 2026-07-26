# AGENTS.md

Non-negotiable rules for this repo. Anything below overrides personal habit or convenience — if a change would violate one of these, stop and raise it before proceeding.

## 1. Soft delete goes through `activeTasks()` — always

- Tasks are never hard-deleted. `DELETE /api/tasks/:id` sets `deleted_at` and returns 204.
- **Every read of the `tasks` table goes through a single `activeTasks()` query helper** that applies `where isNull(tasks.deletedAt)`. No route, service, or ad-hoc query filters by `deleted_at` on its own.
- Rationale: the day one query forgets the filter, deleted tasks reappear in exactly one view and the bug takes an hour to find. Centralizing the filter makes that class of bug impossible.
- If you genuinely need to see soft-deleted rows (admin tooling, migrations), do it in a separate, clearly-named helper — never by dropping the filter inline.

## 2. `packages/shared` is the contract — one source of truth

- Types (`Task`, `TaskStatus`, `TaskPriority`), zod schemas (`createTaskSchema`, `updateTaskSchema`), display config (`STATUS_COLUMNS`), and the API error shape live in `packages/shared` and nowhere else.
- Both `apps/api` and `apps/web` import from `packages/shared`. Neither app redefines a shared type locally, and neither app re-exports a modified version.
- The API validates request bodies with the shared zod schemas. The web form uses the same schemas via `zodResolver`. Same schema, both sides.
- Changing `packages/shared` is a coordinated change: merge to `main` before either app builds against it. Never edit `packages/shared` from inside a Phase-2 worktree — if you need to change it, stop the worktree work, land the change on `main`, then re-split.

## 3. Status transitions are free-form

- Any status can move to any other status. Ready ↔ Code ↔ Review ↔ Complete, in any direction, including Complete back to Ready.
- No workflow validation on the server. No guard rails in the UI beyond the `<select>` of valid statuses.
- Don't add "you can't move backwards" checks, don't add "must go through Review before Complete" logic, don't add confirmation modals for "unusual" transitions. If a future requirement needs a workflow, that's a deliberate feature, not a quiet addition.
