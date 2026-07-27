import type { Task } from "@jira-lite/shared";
import { mockTasks } from "./mockTasks";

export function getTasks(): Promise<Task[]> {
  return Promise.resolve(mockTasks);
}
