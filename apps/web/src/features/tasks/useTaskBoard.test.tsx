import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import type { Task } from "@jira-lite/shared";

vi.mock("./api");
vi.mock("../../toast");

import * as api from "./api";
import { useToast } from "../../toast";
import useTaskBoards from "./useTaskBoard";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { PropsWithChildren } from "react";

function makeWrapper() {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return ({ children }: PropsWithChildren) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
}

const toastFn = vi.fn();
const mockedGetTasks = vi.mocked(api.getTasks);
const mockedCreateTask = vi.mocked(api.createTask);
const mockedUpdateTask = vi.mocked(api.updateTask);
const mockedDeleteTask = vi.mocked(api.deleteTask);
const mockedArchiveTask = vi.mocked(api.archiveTask);

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(useToast).mockReturnValue(toastFn);
});

function makeTask(overrides: Partial<Task> = {}): Task {
  return {
    id: "id-1",
    key: "TASK-1",
    title: "sample",
    description: null,
    status: "ready",
    priority: 3,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

it("returns tasks from query", async () => {
  // arrange
  const stub = [makeTask({ key: "TASK-STUB" })];
  mockedGetTasks.mockResolvedValue(stub);

  // act
  const { result } = renderHook(() => useTaskBoards(), {
    wrapper: makeWrapper(),
  });

  // assert
  expect(result.current.isLoading).toBe(true);
  await waitFor(() => expect(result.current.isLoading).toBe(false));
  expect(result.current.tasks).toEqual(stub);
});

it("creates tasks", async () => {
  mockedGetTasks.mockResolvedValue([]);
  const created = makeTask({ id: "id-new", title: "new" });
  mockedCreateTask.mockResolvedValue(created);

  const { result } = renderHook(() => useTaskBoards(), {
    wrapper: makeWrapper(),
  });
  await waitFor(() => expect(result.current.isLoading).toBe(false));

  act(() => {
    result.current.create({ title: "dummy", status: "ready", priority: 3 });
  });

  await waitFor(() => expect(result.current.tasks).toEqual([created]));
  expect(mockedCreateTask).toHaveBeenCalledWith(
    {
      title: "dummy",
      status: "ready",
      priority: 3,
    },
    expect.anything(),
  );
});

it("toasts when create fails", async () => {
  mockedGetTasks.mockResolvedValue([]);
  mockedCreateTask.mockRejectedValue(new Error("boom"));

  const { result } = renderHook(() => useTaskBoards(), {
    wrapper: makeWrapper(),
  });

  await waitFor(() => expect(result.current.isLoading).toBe(false));

  act(() => {
    result.current.create({ title: "dummy" });
  });
  await waitFor(() => {
    expect(toastFn).toHaveBeenCalledWith("Create failed: boom", "error");
  });
});
