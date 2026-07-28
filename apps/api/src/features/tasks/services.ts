import type { Task } from "@jira-lite/shared";
import { sql } from "../../db";
import {
  insertTaskEvent,
  markTaskArchived,
  selectTaskArchiveState,
} from "./queries";

export type ArchiveTaskResult =
  | { ok: true; task: Task }
  | { ok: false; reason: "not_found" | "already_archived" };

export async function archiveTaskWithAudit(
  id: string,
): Promise<ArchiveTaskResult> {
  return sql.begin(async (tx) => {
    const state = await selectTaskArchiveState(tx, id);
    if (!state) return { ok: false, reason: "not_found" };
    if (state.archivedAt !== null) {
      return { ok: false, reason: "already_archived" };
    }
    const task = await markTaskArchived(tx, id);
    if (!task) {
      throw new Error(
        "archive invariant: row vanished under FOR UPDATE lock",
      );
    }
    await insertTaskEvent(tx, id, "archived");
    return { ok: true, task };
  });
}
