import { Router } from "express";
import { createTaskSchema, updateTaskSchema } from "@jira-lite/shared";
import { NotFoundError, asyncHandler } from "../../errors";
import {
  activeTasks,
  archiveTask,
  createTask,
  softDeleteTask,
  updateTask,
} from "./queries";

export const tasksRouter = Router();

tasksRouter.get(
  "/",
  asyncHandler(async (_req, res) => {
        await new Promise((resolve) => setTimeout(resolve, 2000));

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
    // Testing
    await new Promise((resolve) => setTimeout(resolve, 2000));
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

tasksRouter.post(
  "/:id/archive",
  asyncHandler(async (req, res) => {
    const ok = await archiveTask(req.params.id);
    if (!ok) throw new NotFoundError("task not found");
    res.status(204).send();
  }),
);
