import { afterAll, describe, expect, it } from "vitest";
import { sql } from "../../db";
import { taskEvents, type TaskEvent } from "../../events";
import { createTask, softDeleteTask } from "./queries";
import {
  archiveTaskWithAudit,
  createTaskWithEvent,
  softDeleteTaskWithEvent,
  updateTaskWithEvent,
} from "./services";

const TEST_PREFIX = "VITEST-services-";

afterAll(async () => {
  await sql`delete from tasks where title like ${TEST_PREFIX + "%"}`;
  await sql.end();
});

function captureEvents(): { received: TaskEvent[]; unsubscribe: () => void } {
  const received: TaskEvent[] = [];
  const unsubscribe = taskEvents.subscribe((e) => received.push(e));
  return { received, unsubscribe };
}

describe("archiveTaskWithAudit", () => {
  it("archives the task, writes an audit row, and publishes task.archived", async () => {
    const created = await createTask({ title: `${TEST_PREFIX}archive-ok` });
    const { received, unsubscribe } = captureEvents();

    const result = await archiveTaskWithAudit(created.id);
    unsubscribe();

    expect(result.ok).toBe(true);
    const [raw] = await sql<{ archived_at: Date | null }[]>`
      select archived_at from tasks where id = ${created.id}
    `;
    expect(raw.archived_at).not.toBeNull();
    const events = await sql<{ event_type: string }[]>`
      select event_type from task_events where task_id = ${created.id}
    `;
    expect(events).toHaveLength(1);
    expect(events[0].event_type).toBe("archived");
    expect(received).toEqual([{ type: "task.archived", id: created.id }]);
  });

  it("returns already_archived on the second call, no duplicate audit row, no event", async () => {
    const created = await createTask({ title: `${TEST_PREFIX}archive-twice` });
    await archiveTaskWithAudit(created.id);
    const { received, unsubscribe } = captureEvents();

    const result = await archiveTaskWithAudit(created.id);
    unsubscribe();

    expect(result).toEqual({ ok: false, reason: "already_archived" });
    const events = await sql<{ id: string }[]>`
      select id from task_events where task_id = ${created.id}
    `;
    expect(events).toHaveLength(1);
    expect(received).toEqual([]);
  });

  it("returns not_found for a soft-deleted task, no audit row, no event", async () => {
    const created = await createTask({
      title: `${TEST_PREFIX}archive-deleted`,
    });
    await softDeleteTask(created.id);
    const { received, unsubscribe } = captureEvents();

    const result = await archiveTaskWithAudit(created.id);
    unsubscribe();

    expect(result).toEqual({ ok: false, reason: "not_found" });
    const events = await sql<{ id: string }[]>`
      select id from task_events where task_id = ${created.id}
    `;
    expect(events).toHaveLength(0);
    expect(received).toEqual([]);
  });

  it("returns not_found for an unknown id", async () => {
    const result = await archiveTaskWithAudit(
      "00000000-0000-0000-0000-000000000000",
    );
    expect(result).toEqual({ ok: false, reason: "not_found" });
  });
});

describe("createTaskWithEvent", () => {
  it("creates the task and publishes task.created", async () => {
    const { received, unsubscribe } = captureEvents();

    const task = await createTaskWithEvent({
      title: `${TEST_PREFIX}create-event`,
    });
    unsubscribe();

    expect(task.id).toBeDefined();
    expect(received).toEqual([{ type: "task.created", id: task.id }]);
  });
});

describe("updateTaskWithEvent", () => {
  it("updates the task and publishes task.updated", async () => {
    const created = await createTask({ title: `${TEST_PREFIX}update-event` });
    const { received, unsubscribe } = captureEvents();

    const task = await updateTaskWithEvent(created.id, {
      title: `${TEST_PREFIX}update-event-2`,
    });
    unsubscribe();

    expect(task?.title).toBe(`${TEST_PREFIX}update-event-2`);
    expect(received).toEqual([{ type: "task.updated", id: created.id }]);
  });

  it("returns null and publishes nothing when the task is missing", async () => {
    const { received, unsubscribe } = captureEvents();

    const task = await updateTaskWithEvent(
      "00000000-0000-0000-0000-000000000000",
      { title: "nope" },
    );
    unsubscribe();

    expect(task).toBeNull();
    expect(received).toEqual([]);
  });
});

describe("softDeleteTaskWithEvent", () => {
  it("deletes the task and publishes task.deleted", async () => {
    const created = await createTask({ title: `${TEST_PREFIX}delete-event` });
    const { received, unsubscribe } = captureEvents();

    const ok = await softDeleteTaskWithEvent(created.id);
    unsubscribe();

    expect(ok).toBe(true);
    expect(received).toEqual([{ type: "task.deleted", id: created.id }]);
  });

  it("returns false and publishes nothing when the row is already gone", async () => {
    const { received, unsubscribe } = captureEvents();

    const ok = await softDeleteTaskWithEvent(
      "00000000-0000-0000-0000-000000000000",
    );
    unsubscribe();

    expect(ok).toBe(false);
    expect(received).toEqual([]);
  });
});
