# Architecture

Runtime view of the service described in [build-plan.md](build-plan.md). The dependency graph in [execution-plan.md](execution-plan.md) covers *build order*; this doc covers *what runs where*.

Two topologies matter: development (M1–M5), where Postgres runs in Docker and the API/web run natively on Windows, and full-stack (M6), where everything is containerized.

---

## Development topology (M1–M5)

```mermaid
flowchart LR
    subgraph Browser["Browser (localhost:5173)"]
        React["React app<br/>TanStack Query · react-hook-form"]
    end

    subgraph Windows["Windows host (D:\\)"]
        Vite["Vite dev server<br/>:5173<br/>proxy /api → :3000"]
        API["Express API<br/>tsx watch · :3000"]
        Shared[("packages/shared<br/>Task · zod schemas · STATUS_COLUMNS")]
    end

    subgraph Docker["Docker Desktop (WSL2)"]
        PG[("Postgres 16<br/>:5432<br/>named volume")]
    end

    React -->|HTTP| Vite
    Vite -.->|/api proxy| API
    API -->|Drizzle| PG
    Shared -.->|types + schemas| React
    Shared -.->|types + schemas| API

    classDef contract fill:#fef3c7,stroke:#b45309,color:#78350f
    class Shared contract
```

**Notes**

- `packages/shared` is imported by both apps — the same `createTaskSchema` validates in the browser (via `zodResolver`) and on the server (via middleware). Rename a status value there and both apps fail to compile. That is the M3 checkpoint.
- Vite's `/api` proxy is why there is no CORS config: from the browser's point of view, everything is same-origin on `:5173`.
- Postgres lives in a *named volume*, not a bind mount — that's the Windows/WSL2 performance rule from the setup section of the build plan.
- Reads go through a single `activeTasks()` helper that applies `where isNull(deleted_at)`. No route hand-writes the filter.

---

## Full-stack topology (M6)

```mermaid
flowchart LR
    Client["Browser<br/>localhost:8080"]

    subgraph Compose["docker-compose.full.yml"]
        Nginx["nginx<br/>serves web build<br/>:8080<br/>proxy /api → api:3000"]
        APIC["Express API<br/>:3000<br/>runs migrations on start"]
        PGC[("Postgres 16<br/>:5432<br/>named volume")]
    end

    Client -->|HTTP| Nginx
    Nginx -.->|/api proxy| APIC
    APIC -->|Drizzle| PGC

    classDef svc fill:#e0f2fe,stroke:#0369a1,color:#0c4a6e
    class Nginx,APIC,PGC svc
```

**Notes**

- Multi-stage Dockerfiles build both apps; nginx serves the static web bundle.
- Source is `COPY`'d into images at build time — no hot-reload mount, so the Windows-filesystem penalty from the setup section does not apply here.
- The M6 checkpoint is `down -v` → `up --build` reaching a working app with no manual steps. Wiped volume is the actual test.

---

## Request lifecycle — creating a task

```mermaid
sequenceDiagram
    participant U as User
    participant R as React (form)
    participant S as packages/shared
    participant A as Express API
    participant D as Postgres

    U->>R: fill create-task form
    R->>S: createTaskSchema.parse(input)
    Note over R,S: client-side validation<br/>blocks empty title
    R->>A: POST /api/tasks
    A->>S: createTaskSchema.parse(body)
    Note over A,S: server re-validates<br/>same schema, same rules
    A->>D: insert (key from task_key_seq)
    D-->>A: row with key='TASK-N'
    A-->>R: 201 + Task
    R->>R: TanStack Query cache update
    R-->>U: card appears in column
```

The point of the sequence: `createTaskSchema` is called twice, from the same source. That's the contract paying rent.

---

## Data shape

```mermaid
erDiagram
    tasks {
        uuid id PK
        text key UK "TASK-N · from task_key_seq"
        text title
        text description
        task_status status "ready | code | review | complete"
        task_priority priority "low | medium | high"
        timestamptz created_at
        timestamptz updated_at
        timestamptz deleted_at "NULL = active"
    }
```

Single table. Soft delete via `deleted_at`. Status transitions are free-form — no workflow table, no state machine.
