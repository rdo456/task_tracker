import { afterAll, describe, expect, it } from "vitest";
import { sql } from "../../db";
import { createTask, softDeleteTask } from "./queries";
import { archiveTaskWithAudit } from "./services";

const TEST_PREFIX = "VITEST-services-";

afterAll(async () => {
  await sql`delete from tasks where title like ${TEST_PREFIX + "%"}`;
  await sql.end();
});

describe("archiveTaskWithAudit", () => {
  it("archives the task and writes an audit event", async () => {
    const created = await createTask({ title: `${TEST_PREFIX}archive-ok` });

    const result = await archiveTaskWithAudit(created.id);

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
  });

  it("returns already_archived on the second call and does not duplicate the event", async () => {
    const created = await createTask({ title: `${TEST_PREFIX}archive-twice` });
    await archiveTaskWithAudit(created.id);

    const result = await archiveTaskWithAudit(created.id);

    expect(result).toEqual({ ok: false, reason: "already_archived" });
    const events = await sql<{ id: string }[]>`
      select id from task_events where task_id = ${created.id}
    `;
    expect(events).toHaveLength(1);
  });

  it("returns not_found for a soft-deleted task and writes no event", async () => {
    const created = await createTask({
      title: `${TEST_PREFIX}archive-deleted`,
    });
    await softDeleteTask(created.id);

    const result = await archiveTaskWithAudit(created.id);

    expect(result).toEqual({ ok: false, reason: "not_found" });
    const events = await sql<{ id: string }[]>`
      select id from task_events where task_id = ${created.id}
    `;
    expect(events).toHaveLength(0);
  });

  it("returns not_found for an unknown id", async () => {
    const result = await archiveTaskWithAudit(
      "00000000-0000-0000-0000-000000000000",
    );
    expect(result).toEqual({ ok: false, reason: "not_found" });
  });
});
