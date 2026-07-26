# Jira-lite — Build Plan v2

**Revised with your decisions locked in.** Two structural changes from v1: the shared contract package moved earlier (M3, was M5) so the API and UI can be built in parallel, and a new Windows setup section — `D:\` changes a few things that matter.

Target: `D:\Development\ReactPractice\jira-lite`

---

## Locked decisions

| #   | Question            | Your call                                | Impact                                                   |
| --- | ------------------- | ---------------------------------------- | -------------------------------------------------------- |
| 1   | `TASK-1` style keys | **In**                                   | Postgres sequence + column default                       |
| 2   | Priority field      | **In**                                   | `low \| medium \| high` enum                             |
| 3   | Assignee            | **Single user**                          | No column. Trivial migration later if that changes       |
| 4   | Complete column     | **Accumulates**                          | No archiving. Revisit when it gets long                  |
| 5   | Status transitions  | **Free-form**                            | No workflow validation — any column to any column        |
| 6   | Delete              | **Soft delete**                          | `deleted_at` column, all reads filter it. See note below |
| 7   | Location            | `D:\Development\ReactPractice\jira-lite` | Windows-native toolchain — see setup section             |
| 8   | Ports               | **Open**                                 | 5432 / 3000 / 5173 as planned                            |
| 9   | Package manager     | **pnpm**                                 | Cheap worktrees via the global store                     |
| 10  | Tests               | **Basic, happy paths**                   | Vitest + Supertest, one per endpoint                     |

**Soft delete is the one that ripples.** Every read query needs `where isNull(tasks.deletedAt)` — and the day you forget it on one query, deleted tasks reappear in exactly one view and you'll waste an hour. So we centralize it: a single `activeTasks()` query helper that every route uses, rather than hand-writing the filter at each call site. Same reason it gets its own test in A2.

---

## Windows setup

This is worth getting right before M0, because the wrong combination here is slow in a way that's hard to diagnose later.

### The trap to avoid

Docker's own guidance says to keep project files on the **Linux** filesystem when working with WSL2. That advice is aimed at bind-mounting source into containers — files under `/mnt/d/...` cross a translation layer that is dramatically slower, and `inotify` file-watch events don't fire at all, which silently breaks hot reload.

**But it doesn't apply to your setup, as long as you're deliberate about it.** Since you've chosen `D:\`, commit fully to the Windows-native path:

- **Node + pnpm installed on Windows**, not inside WSL
- **Docker Desktop runs Postgres only**, using a _named volume_ — no bind mount of your source
- Postgres is reachable at `localhost:5432` from Windows, which is all the API needs

That combination never crosses the boundary, so there's no penalty. The failure mode is _mixing_: running `pnpm dev` inside WSL against code sitting on `D:\`. That's the slow path. Pick one side and stay there.

M9's full-stack compose does copy source into images, but that's a build-context `COPY` (one-time, per build) rather than a hot-reload mount, so it's fine.

### Install checklist

Run all of this in **Git Bash** (see Shell, below).

```bash
# Node 22 — MUST be 22.12 or newer, see note
node --version    # need v22.12.0+

# pnpm (pnpm's docs recommend npm over the standalone installer on Windows,
# because Defender sometimes flags the .exe)
npm install -g pnpm
pnpm --version

# Docker Desktop, WSL2 backend — already installed ✓
docker --version
docker compose version
```

> **⚠️ Check your Node patch version before M0.** Vite 7 requires **Node 20.19+ or 22.12+** and hard-refuses to start below that. Node 22.0–22.11 will fail at M6 with a version error, not at install time — so check now. If `node --version` shows anything below 22.12, update to the latest 22.x (currently 22.23.x); you don't need to leave the 22 line.
>
> Node 22 is otherwise fine for this project. It moved to Maintenance LTS in Oct 2025 with security patches through April 2027, and every dependency here — Vite, Drizzle, Express, tsx, Vitest — runs on it happily. Just be aware the clock is ticking if this ever becomes something you maintain long-term.

### Line endings — do this at M0, not later

Windows checks out CRLF by default. A shell script with CRLF line endings copied into a Linux container fails with `/bin/sh: bad interpreter: no such file or directory` or a bare `\r: not found`, and nothing about that message points at line endings. It's a genuinely nasty afternoon.

Commit a `.gitattributes` in the very first commit:

```gitattributes
* text=auto eol=lf
*.sh    text eol=lf
*.sql   text eol=lf
Dockerfile text eol=lf
*.png binary
*.ico binary
```

### Shell — use Git Bash

You asked about `cmd`. It'll work for the basics, but Git Bash is the better tool here and you already have it:

- **The worktree helper is one line in bash and awkward in `cmd`.** You'll run it often enough that this matters.
- **Every Node, pnpm, Docker, and Drizzle doc you'll hit assumes bash syntax.** Translating `&&`, `cp`, `rm -rf`, and `$VAR` on the fly gets old fast.
- **npm/pnpm scripts in `package.json` are executed with a shell.** Scripts written the normal way — chained with `&&`, using `rm -rf` — just work under Git Bash and break under `cmd`.

So: **Git Bash**, and I'll write everything that way from here on.

**One Git Bash gotcha worth knowing up front.** Git Bash runs on MSYS2, which auto-converts Unix-looking paths to Windows paths when passing arguments to non-MSYS programs. Usually helpful, occasionally maddening — a Docker argument like `/app` gets silently rewritten to `C:/Program Files/Git/app` and you get an error that makes no sense. When a docker command with an absolute container path misbehaves, prefix it:

```bash
MSYS_NO_PATHCONV=1 docker run -v "$PWD:/app" node:22 ls /app
```

You'll rarely need it in this project — our compose file uses a named volume, not bind mounts — but when you do need it, it's unguessable, so it's worth having seen once.

---

## Layout

```
D:\Development\ReactPractice\
├── jira-lite\              # main worktree, stays on `main`
│   ├── apps\
│   │   ├── api\            # Express + TS
│   │   └── web\            # Vite + React + TS
│   ├── packages\
│   │   └── shared\         # types + zod schemas — THE CONTRACT
│   ├── docker-compose.yml          # postgres only (dev)
│   ├── docker-compose.full.yml     # everything (M9)
│   ├── .gitattributes
│   ├── .nvmrc
│   ├── pnpm-workspace.yaml
│   └── package.json
├── jira-lite-api\          # worktree: feat/api
├── jira-lite-ui\           # worktree: feat/ui
└── jira-lite-docker\       # worktree: chore/docker
```

---

# Milestones

## Phase 1 — Foundation (sequential, on `main`)

Nothing here parallelizes. Each step is the input to the next.

### M0 — Repo skeleton

`pnpm-workspace.yaml`, root `package.json`, `.gitattributes` (above), `.nvmrc` pinning 22, `.gitignore`, `.env.example`. `git init` + first commit.

**Checkpoint:** `pnpm install` completes, `git status` clean, and `git config core.autocrlf` doesn't fight your `.gitattributes`.
**~20 min**

---

### M1 — Postgres in Docker, nothing else

`docker-compose.yml` with `postgres:16`, named volume, healthcheck, 5432 published.

**Checkpoint:**

```bash
docker compose up -d
docker compose exec db psql -U jira -d jira -c '\dt'
```

"No relations found" is a pass — the database is up and reachable.

**Why it's its own milestone:** DB connectivity failures and app bugs look identical from outside. Prove the database works before any app code exists and you never debug both at once.
**~20 min**

---

### M2 — Schema, migration, seed

```
tasks
  id          uuid pk default gen_random_uuid()
  key         text unique not null      -- 'TASK-1', from a sequence
  title       text not null
  description text
  status      task_status   not null default 'ready'
  priority    task_priority not null default 'medium'
  created_at  timestamptz not null default now()
  updated_at  timestamptz not null default now()
  deleted_at  timestamptz                -- soft delete

task_status   enum: ready | code | review | complete
task_priority enum: low | medium | high
```

Plus: `create sequence task_key_seq;` with `key` **defaulting** to `'TASK-' || nextval('task_key_seq')`, and a partial index on `(status) where deleted_at is null` since that's every board query.

_(A column `DEFAULT`, not a `GENERATED ALWAYS AS` column — Postgres generated columns require an immutable expression and `nextval` is volatile, so it has to be a default. Soft-deleted tasks keep their key forever and sequences never reuse numbers, which is what you want: `TASK-12` always means the same task.)_

Seed ~8 tasks across all four statuses, one of them soft-deleted so you can see the filter working.

**Checkpoint:** `select key, title, status from tasks where deleted_at is null;` returns 7 rows, and the raw table has 8.
**~45 min**

---

### M3 — The contract ⭐ _(moved earlier — this is the fork point)_

`packages/shared` exports: the `Task` type, `TaskStatus` / `TaskPriority` unions, `createTaskSchema` and `updateTaskSchema` zod objects, `STATUS_COLUMNS` display config, and the API error shape.

You can write all of this straight from the M2 schema — no API or UI code needs to exist first. **That's what makes the split possible.**

**Checkpoint:** both apps typecheck against it. Then deliberately break it — rename `'review'` to `'reviewing'` in the union — and confirm both apps fail to compile. That failure is the contract doing its job.
**~45 min**

**Commit and merge to `main` before going further.** Everything downstream depends on this being stable.

---

## Phase 2 — Parallel tracks (worktrees)

```bash
cd D:/Development/ReactPractice/jira-lite
git worktree add -b feat/api ../jira-lite-api
git worktree add -b feat/ui  ../jira-lite-ui

# .env is gitignored — it does NOT come along. Copy it or nothing connects.
copy .env ../jira-lite-api\.env
copy .env ../jira-lite-ui\.env

(cd ../jira-lite-api && pnpm install)
(cd ../jira-lite-ui  && pnpm install)
```

### Track A — API (`feat/api`)

**A1 — Skeleton: health + list.** Express + TS with `tsx watch`. `GET /api/health` → `{ok:true, db:true}` (actually pings Postgres). `GET /api/tasks` → active tasks only.

_Checkpoint:_ `curl localhost:3000/api/tasks` returns your 7 non-deleted seed rows. First proof the whole stack is real: Postgres → Drizzle → Express → HTTP.

**A2 — Full CRUD.** `POST`, `PATCH /:id`, `DELETE /:id` (sets `deleted_at`, returns 204). Zod validation from the shared package. Centralized error middleware returning a consistent shape. Happy-path Vitest + Supertest coverage, one per endpoint, plus the one edge case worth testing now: **soft-deleted tasks stay out of the list**.

_Checkpoint:_ `pnpm test` green. Full curl loop: create → list → patch status → delete → confirm gone from list but still in the raw table.

**~2.5 hrs total**

### Track B — UI (`feat/ui`)

**B1 — Board against mock data.** Vite + React + TS. Four columns driven by `STATUS_COLUMNS`. A `mockTasks: Task[]` array typed by the shared package — the compiler guarantees your mock is shaped exactly like what the API will return. TanStack Query wrapping a fake async fetch, so the swap later is a one-line change.

_Checkpoint:_ board renders, cards land in the right columns, styling done.

**B2 — Create modal.** Title, description, status, priority. react-hook-form + `zodResolver(createTaskSchema)` — the same schema the API validates against. Adds to local state for now.

_Checkpoint:_ create a task, watch it appear in the right column. Submit an empty title and confirm the client blocks it.

**~2.5 hrs total**

---

## Phase 3 — Integration and finish

### M4 — Merge and wire the real API

```bash
cd /d/Development/ReactPractice/jira-lite
git merge feat/api
git merge feat/ui
```

Swap the mock fetch for real calls. Vite dev proxy `/api` → `localhost:3000` (no CORS config needed). Delete `mockTasks`.

**Checkpoint:** create a task in the UI, hard-refresh, it persisted. This is the payoff moment for the shared package — if the contract held, this is a nearly mechanical swap. If it didn't, the compiler tells you exactly where.

Then clean up:

```bash
git worktree remove ../jira-lite-api && git branch -d feat/api
git worktree remove ../jira-lite-ui  && git branch -d feat/ui
```

**~1 hr**

---

### M5 — Edit and delete from the UI

Click card → prefilled detail modal. Status via `<select>` (free-form, any → any). Delete with confirm, calling the soft-delete endpoint.

**Checkpoint:** full CRUD from the UI alone. Move a task Ready → Code → Review → Complete and back to Ready — free-form means backward moves must work too.
**~1.5 hrs**

---

### M6 — Dockerize _(good parallel worktree — run alongside M5)_

```bash
git worktree add -b chore/docker ../jira-lite-docker
```

Multi-stage Dockerfiles for both apps, nginx serving the web build, `docker-compose.full.yml`, migrations on API startup.

**Checkpoint:**

```bash
docker compose -f docker-compose.full.yml down -v
docker compose -f docker-compose.full.yml up --build
```

Wiped volume to working app at `localhost:8080`, no manual steps. The "from clean" part is the actual test.

**Why this is the best worktree to try first:** zero file overlap with M5 (`Dockerfile`, `.dockerignore`, compose files, one README line — nothing feature work touches), and Docker's slow noisy rebuild loop stays out of your fast React hot-reload loop.
**~2 hrs**

---

### M7 — Polish

Loading skeletons, empty-column states, error toasts, README someone could follow cold.
**~1 hr**

**Total: ~12 hrs**, with roughly 2.5 of them parallelizable.

---

# Git worktree — Windows edition

### What it is

A normal clone gives you **one** working directory; `git checkout` rewrites it in place. Worktrees give one repository **multiple** working directories, each on its own branch, sharing a single `.git` object store. Branches become places instead of states — no stashing, no re-cloning, no duplicated history.

### Commands

```bash
git worktree add -b feat/api ../jira-lite-api   # new branch + directory
git worktree add ../jira-lite-review feat/ui    # existing branch, new directory
git worktree list
git worktree remove ../jira-lite-api
git worktree prune                              # if you deleted a folder by hand
```

Keep them **siblings**, never nested. A worktree inside the main one gets picked up by Docker build contexts, `tsconfig` globs, and Vite's file watcher — all of which will start reading files from the other branch.

### Gotchas

**1. `.env` doesn't come along.** It's gitignored, so worktrees don't carry it. Your new worktree fails to reach Postgres and the error says nothing about a missing file. Make it a PowerShell function:

```bash
# add to ~/.bashrc
wt() {
  local branch=$1 dir=$2
  git worktree add -b "$branch" "../$dir" || return 1
  cp .env "../$dir/.env"
  (cd "../$dir" && pnpm install)
}
# usage:  wt feat/api jira-lite-api
```

**2. `node_modules` doesn't come along either** — but you chose pnpm, so this is nearly free. pnpm hard-links from one global content-addressed store, so the second and third worktrees cost seconds and almost no disk. This is the single biggest reason pnpm was the right call here.

**3. Port collisions.** Two worktrees both running `pnpm dev` both want :3000 and :5173. The second dies, or silently grabs :5174 while your proxy still points at the original API — which looks like a mysterious data bug. Read ports from `.env` and offset per worktree.

**4. Migrations across worktrees — the real one.** By default every worktree talks to the _same_ Docker Postgres. Fine for reads. But two branches each adding a migration, both applied to one database, leaves your schema matching no branch you have.

Give each worktree its own stack:

```env
COMPOSE_PROJECT_NAME=jiralite_api
POSTGRES_PORT=5433
```

Compose namespaces containers, networks, and volumes by project name, so each worktree gets a genuinely separate database. Costs some RAM, saves an evening.

For your specific plan this barely comes up — Track A owns migrations, Track B has none — but set it up anyway so the habit is there.

**5. You can't check out the same branch in two worktrees.** Git refuses: `fatal: 'feat/api' is already used by worktree at ...`. That's a feature.

**6. Deleting the folder ≠ removing the worktree.** Git still has it registered. Use `git worktree remove`, or `git worktree prune` afterward.

**7. Windows-specific:** long paths. `D:\Development\ReactPractice\jira-lite-api\node_modules\...` plus deep dependency nesting can exceed the 260-character limit. pnpm's flat store makes this much less likely than npm would, but if you hit a cryptic ENOENT during install:

```bash
git config --system core.longpaths true
```

And enable long paths in Windows itself (Group Policy, or the `LongPathsEnabled` registry key).

### When to use it here — and when not

| Use it                                                                                          | Skip it                                                                                     |
| ----------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| **Phase 2** — Track A ‖ Track B after the contract lands                                        | **Phase 1 (M0–M3)** — strictly sequential, nothing to split                                 |
| **M6 Docker** ‖ M5 features — zero file overlap, different tempos                               | **Anything touching `packages/shared`** — it's the contract; two editors means it isn't one |
| **Spikes** — try `@dnd-kit` on a throwaway branch, `git worktree remove --force` if you hate it | **Two branches both writing migrations** — see gotcha 4                                     |

**Start with M6.** Low stakes, no overlap, and you'll hit the `.env` and port gotchas somewhere nothing breaks badly. Best possible place to learn the mechanics.

The rule that generalizes: **parallelize after the contract, never before it.** If you find yourself needing to change `packages/shared` mid-track, stop, merge to `main`, re-split. Don't edit it in both worktrees and hope.

---

## Open questions

**All closed.** Shell → Git Bash. Node → 22 (verify ≥ 22.12). Docker Desktop + WSL2 → installed.

One thing to check before M0, and it's the only thing that can bite you:

```bash
node --version    # must be v22.12.0 or higher
```

## Next

Everything is decided. Say go and I'll start at M0, stopping at each checkpoint so you can run it yourself before we continue.

**One logistics note:** I still can't reach your machine — the desktop bridge isn't connected in this session. To have me write directly into `D:\Development\ReactPractice\jira-lite`, open the Claude desktop app and trust that folder. Otherwise I'll build here and send you a zip to unpack, which works fine and just means you run the `pnpm install` yourself.
