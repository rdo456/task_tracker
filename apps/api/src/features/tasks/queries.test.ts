import { afterAll, describe, expect, it } from "vitest";
import { sql } from "../../db";
import {
  activeTasks,
  createTask,
  softDeleteTask,
  updateTask,
} from "./queries";

const TEST_PREFIX = "VITEST-";

afterAll(async () => {
  await sql`delete from tasks where title like ${TEST_PREFIX + "%"}`;
  await sql.end();
});

describe("activeTasks", () => {
  it("excludes soft-deleted rows (AGENTS.md #1)", async () => {
    const rows = await activeTasks();
    expect(rows.some((t) => t.key === "TASK-8")).toBe(false);
  });
});

describe("updateTask", () => {
  it("returns null when the target row is soft-deleted", async () => {
    const created = await createTask({ title: `${TEST_PREFIX}update-deleted` });
    await softDeleteTask(created.id);
    const result = await updateTask(created.id, { title: "should not apply" });
    expect(result).toBeNull();
  });
});

describe("softDeleteTask", () => {
  it("sets deleted_at and removes the row from activeTasks", async () => {
    const created = await createTask({ title: `${TEST_PREFIX}soft-delete` });
    const ok = await softDeleteTask(created.id);
    expect(ok).toBe(true);
    const rows = await activeTasks();
    expect(rows.some((t) => t.id === created.id)).toBe(false);
    const [raw] = await sql<{ deleted_at: Date | null }[]>`
      select deleted_at from tasks where id = ${created.id}
    `;
    expect(raw.deleted_at).not.toBeNull();
  });
});
