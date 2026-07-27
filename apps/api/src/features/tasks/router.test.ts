import { beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";
import type { Task } from "@jira-lite/shared";

vi.mock("../../db");
vi.mock("./queries");

import { app } from "../../app";
import * as queries from "./queries";

const mockedActiveTasks = vi.mocked(queries.activeTasks);
const mockedCreateTask = vi.mocked(queries.createTask);
const mockedUpdateTask = vi.mocked(queries.updateTask);
const mockedSoftDeleteTask = vi.mocked(queries.softDeleteTask);

function makeTask(overrides: Partial<Task> = {}): Task {
  return {
    id: "00000000-0000-0000-0000-000000000000",
    key: "TASK-99",
    title: "sample",
    description: null,
    status: "ready",
    priority: 3,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

beforeEach(() => {
  vi.resetAllMocks();
});

describe("GET /api/tasks", () => {
  it("returns whatever activeTasks resolves to", async () => {
    const stub = [makeTask({ key: "TASK-1" })];
    mockedActiveTasks.mockResolvedValue(stub);
    const res = await request(app).get("/api/tasks");
    expect(res.status).toBe(200);
    expect(res.body).toEqual(stub);
  });
});

describe("POST /api/tasks", () => {
  it("validates body, calls createTask, returns 201", async () => {
    const stub = makeTask({ title: "x" });
    mockedCreateTask.mockResolvedValue(stub);
    const res = await request(app)
      .post("/api/tasks")
      .send({ title: "x", status: "ready", priority: 2 });
    expect(res.status).toBe(201);
    expect(res.body).toEqual(stub);
    expect(mockedCreateTask).toHaveBeenCalledWith({
      title: "x",
      status: "ready",
      priority: 2,
    });
  });

  it("returns 400 with ApiError shape when body invalid", async () => {
    const res = await request(app).post("/api/tasks").send({ title: "" });
    expect(res.status).toBe(400);
    expect(res.body).toMatchObject({ error: "validation_error" });
    expect(mockedCreateTask).not.toHaveBeenCalled();
  });
});

describe("PATCH /api/tasks/:id", () => {
  it("calls updateTask with id and parsed body, returns 200", async () => {
    const stub = makeTask({ id: "abc", status: "complete" });
    mockedUpdateTask.mockResolvedValue(stub);
    const res = await request(app)
      .patch("/api/tasks/abc")
      .send({ status: "complete" });
    expect(res.status).toBe(200);
    expect(res.body).toEqual(stub);
    expect(mockedUpdateTask).toHaveBeenCalledWith("abc", { status: "complete" });
  });
});

describe("DELETE /api/tasks/:id", () => {
  it("returns 204 when softDeleteTask succeeds", async () => {
    mockedSoftDeleteTask.mockResolvedValue(true);
    const res = await request(app).delete("/api/tasks/abc");
    expect(res.status).toBe(204);
    expect(mockedSoftDeleteTask).toHaveBeenCalledWith("abc");
  });
});
