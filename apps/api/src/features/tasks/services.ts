import type {
  CreateTaskInput,
  Task,
  UpdateTaskInput,
} from "@jira-lite/shared";
import { sql } from "../../db";
import { taskEvents } from "../../events";
import {
  createTask,
  insertTaskEvent,
  markTaskArchived,
  selectTaskArchiveState,
  softDeleteTask,
  updateTask,
} from "./queries";

export type ArchiveTaskResult =
  | { ok: true; task: Task }
  | { ok: false; reason: "not_found" | "already_archived" };

export async function archiveTaskWithAudit(
  id: string,
): Promise<ArchiveTaskResult> {
  const result = await sql.begin(async (tx) => {
    const state = await selectTaskArchiveState(tx, id);
    if (!state) return { ok: false, reason: "not_found" } as const;
    if (state.archivedAt !== null) {
      return { ok: false, reason: "already_archived" } as const;
    }
    const task = await markTaskArchived(tx, id);
    if (!task) {
      throw new Error(
        "archive invariant: row vanished under FOR UPDATE lock",
      );
    }
    await insertTaskEvent(tx, id, "archived");
    return { ok: true, task } as const;
  });
  if (result.ok) {
    taskEvents.publish({ type: "task.archived", id: result.task.id });
  }
  return result;
}

export async function createTaskWithEvent(
  input: CreateTaskInput,
): Promise<Task> {
  const task = await createTask(input);
  taskEvents.publish({ type: "task.created", id: task.id });
  return task;
}

export async function updateTaskWithEvent(
  id: string,
  input: UpdateTaskInput,
): Promise<Task | null> {
  const task = await updateTask(id, input);
  if (task) taskEvents.publish({ type: "task.updated", id: task.id });
  return task;
}

export async function softDeleteTaskWithEvent(id: string): Promise<boolean> {
  const ok = await softDeleteTask(id);
  if (ok) taskEvents.publish({ type: "task.deleted", id });
  return ok;
}
