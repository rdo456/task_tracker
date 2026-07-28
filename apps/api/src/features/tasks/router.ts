import { Router } from "express";
import { createTaskSchema, updateTaskSchema } from "@jira-lite/shared";
import { ConflictError, NotFoundError, asyncHandler } from "../../errors";
import { taskEvents } from "../../events";
import { activeTasks } from "./queries";
import {
  archiveTaskWithAudit,
  createTaskWithEvent,
  softDeleteTaskWithEvent,
  updateTaskWithEvent,
} from "./services";

export const tasksRouter = Router();

tasksRouter.get(
  "/",
  asyncHandler(async (_req, res) => {
    await new Promise((resolve) => setTimeout(resolve, 2000));

    res.json(await activeTasks());
  }),
);

tasksRouter.get("/events", (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders();

  const unsubscribe = taskEvents.subscribe((event) => {
    res.write(`event: task\ndata: ${JSON.stringify(event)}\n\n`);
  });
  const heartbeat = setInterval(() => {
    res.write(": heartbeat\n\n");
  }, 20_000);

  req.on("close", () => {
    clearInterval(heartbeat);
    unsubscribe();
    res.end();
  });
});

tasksRouter.post(
  "/",
  asyncHandler(async (req, res) => {
    const input = createTaskSchema.parse(req.body);
    const task = await createTaskWithEvent(input);
    res.status(201).json(task);
  }),
);

tasksRouter.patch(
  "/:id",
  asyncHandler(async (req, res) => {
    const input = updateTaskSchema.parse(req.body);
    // Testing
    await new Promise((resolve) => setTimeout(resolve, 2000));
    const task = await updateTaskWithEvent(req.params.id, input);
    if (!task) throw new NotFoundError("task not found");
    res.json(task);
  }),
);

tasksRouter.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    const ok = await softDeleteTaskWithEvent(req.params.id);
    if (!ok) throw new NotFoundError("task not found");
    res.status(204).send();
  }),
);

tasksRouter.post(
  "/:id/archive",
  asyncHandler(async (req, res) => {
    const result = await archiveTaskWithAudit(req.params.id);
    if (result.ok) {
      res.status(204).send();
      return;
    }
    switch (result.reason) {
      case "not_found":
        throw new NotFoundError("task not found");
      case "already_archived":
        throw new ConflictError(
          "task already archived",
          "already_archived",
        );
    }
  }),
);
