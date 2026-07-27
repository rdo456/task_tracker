import { Router } from "express";
import { createTaskSchema, updateTaskSchema } from "@jira-lite/shared";
import { NotFoundError, asyncHandler } from "../../errors";
import {
  activeTasks,
  createTask,
  softDeleteTask,
  updateTask,
} from "./queries";

export const tasksRouter = Router();

tasksRouter.get(
  "/",
  asyncHandler(async (_req, res) => {
    res.json(await activeTasks());
  }),
);

tasksRouter.post(
  "/",
  asyncHandler(async (req, res) => {
    const input = createTaskSchema.parse(req.body);
    const task = await createTask(input);
    res.status(201).json(task);
  }),
);

tasksRouter.patch(
  "/:id",
  asyncHandler(async (req, res) => {
    const input = updateTaskSchema.parse(req.body);
    const task = await updateTask(req.params.id, input);
    if (!task) throw new NotFoundError("task not found");
    res.json(task);
  }),
);

tasksRouter.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    const ok = await softDeleteTask(req.params.id);
    if (!ok) throw new NotFoundError("task not found");
    res.status(204).send();
  }),
);
