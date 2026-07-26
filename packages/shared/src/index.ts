import { z } from "zod";

export const TASK_STATUSES = ["ready", "code", "review", "complete"] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];

export const taskStatusSchema = z.enum(TASK_STATUSES);

export const STATUS_COLUMNS: ReadonlyArray<{
  key: TaskStatus;
  label: string;
  sortOrder: number;
}> = [
  { key: "ready", label: "Ready", sortOrder: 1 },
  { key: "code", label: "In Code", sortOrder: 2 },
  { key: "review", label: "In Review", sortOrder: 3 },
  { key: "complete", label: "Complete", sortOrder: 4 },
];

export type TaskPriority = 0 | 1 | 2 | 3 | 4 | 5;

export const taskPrioritySchema = z
  .number()
  .int()
  .min(0)
  .max(5) as z.ZodType<TaskPriority>;

export interface Task {
  id: string;
  key: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  createdAt: string;
  updatedAt: string;
}

export const createTaskSchema = z.object({
  title: z.string().min(1, "title is required"),
  description: z.string().nullish(),
  status: taskStatusSchema.optional(),
  priority: taskPrioritySchema.optional(),
});
export type CreateTaskInput = z.infer<typeof createTaskSchema>;

export const updateTaskSchema = z
  .object({
    title: z.string().min(1),
    description: z.string().nullable(),
    status: taskStatusSchema,
    priority: taskPrioritySchema,
  })
  .partial();
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;

export interface ApiError {
  error: string;
  message: string;
  details?: unknown;
}
