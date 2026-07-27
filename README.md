# Jira-lite

A single-user, four-column Kanban board. React 19 + Vite on the front, Express + `postgres.js` on the back, Postgres in Docker underneath.

Built as a practice project — see [docs/build-plan.md](docs/build-plan.md) for the *why* and [docs/execution-plan.md](docs/execution-plan.md) for the milestone ordering.

## What's in here

```
apps/
  api/        Express + TypeScript API (:3000)
  web/        Vite + React + TypeScript UI (:5173)
packages/
  shared/     Types + zod schemas shared by api and web — the contract
db/
  migrations/ Raw SQL migrations, applied via psql
  seed.sql    Seed data (~8 tasks across all statuses, one soft-deleted)
docker-compose.yml   Postgres 18 only
```

## Prerequisites

- **Node 22+** (see [.nvmrc](.nvmrc))
- **pnpm 11+** — `corepack enable` will pick it up from [package.json](package.json)
- **Docker Desktop** (for Postgres)

## First-time setup

```bash
# 1. Environment
cp .env.example .env

# 2. Install workspace deps
pnpm install

# 3. Start Postgres
docker compose up -d

# 4. Apply the schema + seed
docker compose exec -T db psql -U jira -d jira < db/migrations/0001_init.sql
docker compose exec -T db psql -U jira -d jira < db/seed.sql

# 5. Verify: 7 active rows, 8 total
docker compose exec db psql -U jira -d jira -c \
  "select count(*) from tasks where deleted_at is null;"
```

## Day-to-day

```bash
pnpm dev        # runs api and web in parallel
pnpm test       # runs all package tests
pnpm typecheck  # runs tsc --noEmit in every package
```

Open [http://localhost:5173](http://localhost:5173). The Vite dev server proxies `/api/*` to `http://localhost:3000`, so the browser only ever talks to one origin.

## Troubleshooting

- **`ECONNREFUSED` on API startup** — `docker compose ps` should show `db` healthy. If it's still starting, wait a beat and retry.
- **Empty board / "Couldn't load tasks"** — the API isn't running or the DB isn't seeded. Re-run steps 3–4 above.
- **Port in use** — change `POSTGRES_PORT`, `API_PORT`, or `WEB_PORT` in `.env`.

## Conventions

- Soft delete only. Reads go through `activeTasks()` in the API — never inline `where deleted_at is null` at call sites.
- `packages/shared` is the source of truth for task shape. Both apps typecheck against it; break it and both stop compiling — that's on purpose.
- No ORM. Queries are `sql\`...\`` tagged templates from `postgres.js`.
- Status categoricals live in a `task_statuses` lookup table, not a Postgres enum.

See [AGENTS.md](AGENTS.md) for the full rules of engagement.
