import type {
  CreateTaskInput,
  Task,
  UpdateTaskInput,
} from "@jira-lite/shared";

export async function getTasks(): Promise<Task[]> {
  const res = await fetch("/api/tasks");
  if (!res.ok) throw new Error(`GET /api/tasks failed: ${res.status}`);
  return res.json();
}

export async function createTask(input: CreateTaskInput): Promise<Task> {
  const res = await fetch("/api/tasks", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error(`POST /api/tasks failed: ${res.status}`);
  return res.json();
}

export async function updateTask(
  id: string,
  input: UpdateTaskInput,
): Promise<Task> {
  const res = await fetch(`/api/tasks/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error(`PATCH /api/tasks/${id} failed: ${res.status}`);
  return res.json();
}

export async function deleteTask(id: string): Promise<void> {
  const res = await fetch(`/api/tasks/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error(`DELETE /api/tasks/${id} failed: ${res.status}`);
}
