import type {
  CreateTaskInput,
  Task,
  UpdateTaskInput,
} from "@jira-lite/shared";
import { sql } from "../../db";

interface TaskRow {
  id: string;
  key: string;
  title: string;
  description: string | null;
  status: Task["status"];
  priority: Task["priority"];
  created_at: Date;
  updated_at: Date;
}

function toTaskDto(row: TaskRow): Task {
  return {
    id: row.id,
    key: row.key,
    title: row.title,
    description: row.description,
    status: row.status,
    priority: row.priority,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}

export async function activeTasks(): Promise<Task[]> {
  const rows = await sql<TaskRow[]>`
    select id, key, title, description, status, priority, created_at, updated_at
    from tasks
    where 
      deleted_at is null
      and archived_at is null
    order by key
  `;
  return rows.map(toTaskDto);
}

export async function createTask(input: CreateTaskInput): Promise<Task> {
  const [row] = await sql<TaskRow[]>`
    insert into tasks (title, description, status, priority)
    values (
      ${input.title},
      ${input.description ?? null},
      ${input.status ?? "ready"},
      ${input.priority ?? 3}
    )
    returning id, key, title, description, status, priority, created_at, updated_at
  `;
  return toTaskDto(row);
}

export async function updateTask(
  id: string,
  input: UpdateTaskInput,
): Promise<Task | null> {
  const fields: Record<string, unknown> = {};
  if (input.title !== undefined) fields.title = input.title;
  if (input.description !== undefined) fields.description = input.description;
  if (input.status !== undefined) fields.status = input.status;
  if (input.priority !== undefined) fields.priority = input.priority;

  if (Object.keys(fields).length === 0) {
    const [row] = await sql<TaskRow[]>`
      select id, key, title, description, status, priority, created_at, updated_at
      from tasks
      where id = ${id} and deleted_at is null and archived_at is null
    `;
    return row ? toTaskDto(row) : null;
  }

  const [row] = await sql<TaskRow[]>`
    update tasks
    set ${sql(fields)}, updated_at = now()
    where id = ${id} and deleted_at is null and archived_at is null
    returning id, key, title, description, status, priority, created_at, updated_at
  `;
  return row ? toTaskDto(row) : null;
}

export async function softDeleteTask(id: string): Promise<boolean> {
  const result = await sql`
    update tasks
    set deleted_at = now()
    where id = ${id} and deleted_at is null
  `;
  return result.count > 0;
}

export async function archiveTask(id: string): Promise<boolean> {
  const result = await sql`
    update tasks
    set archived_at = now()
    where id = ${id} and deleted_at is null
  `;
  return result.count > 0;
}
