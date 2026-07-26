# Execution Plan

Sequenced view of [build-plan.md](build-plan.md). Answers three questions: what order do the milestones run in, what can run in parallel, and what does "done" look like at each step so you can verify before moving on.

The build plan has the *why* and the design. This plan has the *when* and the *test-to-verify*. If the two ever disagree, the build plan wins on decisions and this one wins on ordering.

## Legend

- **[S]** Sequential — must finish before the next step starts
- **[P]** Parallel — can run alongside the marked sibling in a separate git worktree
- **✓** Complete
- **Test** — exactly what you (the human) run to prove the step actually works before we move on

---

## Dependency graph

```
Phase 1 (sequential, on main)
──────────────────────────────
  M0 ✓  →  M1  →  M2  →  M3
                          │
Phase 2 (parallel, in worktrees)
────────────────────────────────
                          ├──►  Track A: A1  →  A2  ─┐
                          │                          │
                          └──►  Track B: B1  →  B2  ─┤
                                                     │
Phase 3 (integration, on main)                       │
──────────────────────────────                       │
                          ┌──────────────────────────┘
                          ▼
                          M4  ─┬─►  M5  ─┐
                               │         │
                               └─►  M6  ─┤   ← M5 ‖ M6 in separate worktrees
                                         │
                                         ▼
                                        M7
```

**Cache the critical path:** M0 → M1 → M2 → M3 → (max of A-track, B-track) → M4 → (max of M5, M6) → M7. Everything else is slack.

---

## Phase 1 — Foundation (sequential, all on `main`)

Nothing here parallelizes; each step's output is the next step's input.

### M0 — Repo skeleton ✓

Done. Commit `7769784`.

### M1 — Postgres in Docker [S]

- **Depends on:** M0
- **Scope:** `docker-compose.yml` with `postgres:16`, named volume, healthcheck, port 5432 published.
- **Est:** ~20 min
- **Test:**
  ```bash
  docker compose up -d
  docker compose exec db psql -U jira -d jira -c '\dt'
  # Expect: "Did not find any relations." That's a pass — DB is up and reachable.
  ```
- **Why isolated:** DB failures and app bugs look identical from outside. Prove the DB works before any app code exists.

### M2 — Schema, migration, seed [S]

- **Depends on:** M1
- **Scope:** Drizzle schema (`tasks` + `task_status` and `task_priority` enums + `task_key_seq` sequence + `deleted_at`), first migration, partial index on `(status) where deleted_at is null`, seed ~8 tasks across all four statuses with one soft-deleted.
- **Est:** ~45 min
- **Test:**
  ```bash
  docker compose exec db psql -U jira -d jira -c \
    "select key, title, status from tasks where deleted_at is null;"
  # Expect: 7 rows.
  docker compose exec db psql -U jira -d jira -c "select count(*) from tasks;"
  # Expect: 8. (One soft-deleted row present but filtered out above.)
  ```

### M3 — The contract [S] ⭐

- **Depends on:** M2 (schema is the source-of-truth)
- **Scope:** `packages/shared` exports `Task`, `TaskStatus`, `TaskPriority`, `createTaskSchema`, `updateTaskSchema`, `STATUS_COLUMNS`, API error shape. **No API or UI code yet.**
- **Est:** ~45 min
- **Test:** Both `apps/api` and `apps/web` scaffolds typecheck against it. Then break it on purpose:
  ```bash
  # rename 'review' → 'reviewing' in the union, then:
  pnpm -r typecheck
  # Expect: both apps fail to compile. That failure is the contract doing its job.
  # Revert the rename before continuing.
  ```
- **Merge to `main` before Phase 2.** Everything downstream depends on the contract being stable.

**End of Phase 1 gate:** M3 committed on `main` before opening any worktree.

---

## Phase 2 — Parallel tracks (worktrees)

The whole point of moving M3 earlier is so this phase can actually parallelize. Open both worktrees at the same time; work them in whichever cadence suits you.

```bash
# from D:/Development/ReactPractice/jira-lite
git worktree add -b feat/api ../jira-lite-api
git worktree add -b feat/ui  ../jira-lite-ui

cp .env ../jira-lite-api/.env      # .env is gitignored — must be copied
cp .env ../jira-lite-ui/.env

(cd ../jira-lite-api && pnpm install)
(cd ../jira-lite-ui  && pnpm install)
```

### Track A — API (in `../jira-lite-api` on `feat/api`)

Within the track, A1 → A2 is sequential.

#### A1 — Skeleton: health + list [S within track] [P with Track B]

- **Depends on:** M3
- **Scope:** Express + TS with `tsx watch`. `GET /api/health` → `{ok:true, db:true}` (pings Postgres). `GET /api/tasks` → active tasks only, via `activeTasks()` helper.
- **Test:**
  ```bash
  # in ../jira-lite-api
  pnpm dev
  # in another shell:
  curl -s localhost:3000/api/health | jq
  # Expect: {"ok":true,"db":true}
  curl -s localhost:3000/api/tasks | jq 'length'
  # Expect: 7
  ```

#### A2 — Full CRUD + tests [S within track] [P with Track B]

- **Depends on:** A1
- **Scope:** `POST`, `PATCH /:id`, `DELETE /:id` (soft delete, returns 204). Zod validation from `packages/shared`. Centralized error middleware. Vitest + Supertest happy-path tests, one per endpoint, **plus the "soft-deleted stays out of the list" test.**
- **Test:**
  ```bash
  pnpm test          # green, one test per endpoint + the soft-delete filter test
  # then a curl loop:
  curl -s -X POST localhost:3000/api/tasks \
    -H 'content-type: application/json' \
    -d '{"title":"probe","status":"ready","priority":"low"}' | jq
  # note the returned id
  curl -s localhost:3000/api/tasks | jq '.[] | select(.title=="probe")'
  curl -s -X PATCH localhost:3000/api/tasks/<id> \
    -H 'content-type: application/json' -d '{"status":"code"}' | jq
  curl -s -X DELETE localhost:3000/api/tasks/<id> -o /dev/null -w "%{http_code}\n"
  # Expect: 204
  curl -s localhost:3000/api/tasks | jq '.[] | select(.title=="probe")'
  # Expect: no output (filtered)
  docker compose exec db psql -U jira -d jira -c \
    "select key, deleted_at from tasks where title='probe';"
  # Expect: row present with deleted_at NOT NULL
  ```

**Track A total: ~2.5 hrs**

### Track B — UI (in `../jira-lite-ui` on `feat/ui`)

Within the track, B1 → B2 is sequential.

#### B1 — Board against mock data [S within track] [P with Track A]

- **Depends on:** M3
- **Scope:** Vite + React + TS. Four columns driven by `STATUS_COLUMNS`. `mockTasks: Task[]` typed from `packages/shared`. TanStack Query wrapping a fake async fetch so the M4 swap is a one-line change.
- **Test:** Open `http://localhost:5173` in a browser. Expect four columns; expect the mock cards to land in the correct columns; expect the styling to look intentional (not just default).

#### B2 — Create modal [S within track] [P with Track A]

- **Depends on:** B1
- **Scope:** Title, description, status, priority. `react-hook-form` + `zodResolver(createTaskSchema)` (same schema the API uses in A2). Adds to local state for now.
- **Test:** In the browser, open the create modal, fill in a task, submit — it appears in the correct column. Submit with an empty title — client blocks it with a validation error, no request is made.

**Track B total: ~2.5 hrs**

---

## Phase 3 — Integration and finish

### M4 — Merge and wire the real API [S]

- **Depends on:** A2 **and** B2
- **Scope:** Merge `feat/api` and `feat/ui` into `main`. Swap mock fetch → real fetch. Vite dev proxy `/api` → `localhost:3000`. Delete `mockTasks`.
- **Est:** ~1 hr
- **Test:**
  ```bash
  # both API and web running
  # in browser, create a task; then hard-refresh (Ctrl+Shift+R)
  # Expect: the task is still there. That's the payoff — the contract held.
  ```
- **Cleanup:**
  ```bash
  git worktree remove ../jira-lite-api && git branch -d feat/api
  git worktree remove ../jira-lite-ui  && git branch -d feat/ui
  ```

### M5 — Edit and delete from the UI [S] [P with M6]

- **Depends on:** M4
- **Runs alongside:** M6 (in a separate worktree)
- **Scope:** Click card → prefilled detail modal. Status via `<select>` (free-form). Delete with confirm → soft-delete endpoint.
- **Est:** ~1.5 hrs
- **Test:** In the browser, take one card through Ready → Code → Review → Complete → back to Ready. All moves succeed. Delete a card — it vanishes from the UI, and the raw DB row still exists with `deleted_at` set.

### M6 — Dockerize [P with M5]

- **Depends on:** M4
- **Runs alongside:** M5
- **Scope:** Multi-stage Dockerfiles for both apps, nginx serving the web build, `docker-compose.full.yml`, migrations run on API startup.
- **Est:** ~2 hrs
- **Worktree setup:**
  ```bash
  git worktree add -b chore/docker ../jira-lite-docker
  cp .env ../jira-lite-docker/.env
  ```
- **Test — the "from clean" test is the actual test:**
  ```bash
  cd ../jira-lite-docker
  docker compose -f docker-compose.full.yml down -v
  docker compose -f docker-compose.full.yml up --build
  # Open http://localhost:8080 — full app works, no manual steps.
  ```
- **Why parallel:** zero file overlap with M5 (Dockerfiles, `.dockerignore`, compose files, one README line — nothing feature work touches). Docker's slow noisy rebuild loop stays out of the fast React hot-reload loop.

### M7 — Polish [S]

- **Depends on:** M5 **and** M6 (both merged into `main`)
- **Scope:** Loading skeletons, empty-column states, error toasts, README someone could follow cold.
- **Est:** ~1 hr
- **Test:** Kill Postgres mid-session — error toast appears, not a white screen. Delete every task in a column — empty state renders. Hand the README to someone who's never seen the repo (or read it as if you hadn't) — they can get to a running app.

---

## Total time budget

| Phase | Sequential path | Parallel savings |
|---|---|---|
| Phase 1 (M0–M3) | ~110 min | none — strictly sequential |
| Phase 2 (Tracks A + B) | ~2.5 hrs (either track) | ~2.5 hrs saved by parallelizing |
| Phase 3 (M4–M7) | ~5.5 hrs sequential, ~4 hrs with M5‖M6 | ~1.5 hrs saved |

**Serial total:** ~12 hrs. **With parallelization:** ~8 hrs of wall-clock work, ~2.5 hrs of it in worktrees.

---

## Testing philosophy (why the checkpoints are shaped this way)

- **Every milestone has a human-runnable verification step.** No milestone is "done" until you've run its Test and seen the expected output. This is the "test each part as we go" you asked for.
- **The tests get progressively higher-level.** M1 tests DB reachability. M2 tests the schema. A1 tests HTTP + DB. A2 tests business logic. M4 tests the full stack round-trip. M6 tests the clean-slate deploy.
- **Automated tests are additive, not the whole check.** `pnpm test` runs in A2, but the curl loop still runs — because a test suite proves the code does what the *test* thinks, not what *you* think.
- **One edge case gets a real test now:** the soft-delete filter in A2. Everything else is happy-path only, per locked decision #10.

---

## Rules of engagement (from AGENTS.md, restated for the plan)

- Soft delete goes through `activeTasks()` — always. No inline `where isNull(deleted_at)`.
- `packages/shared` is the contract. Never edit it from a Phase-2 worktree; land on `main` first.
- Status transitions are free-form. No workflow validation server-side or client-side.

If the plan ever suggests violating one of these, the plan is wrong.
