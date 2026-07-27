import express from "express";
import { sql } from "./db";
import { asyncHandler, errorMiddleware } from "./errors";
import { tasksRouter } from "./features/tasks/router";

export const app = express();

app.use(express.json());

app.get(
  "/api/health",
  asyncHandler(async (_req, res) => {
    try {
      await sql`select 1`;
      res.json({ ok: true, db: true });
    } catch {
      res.status(503).json({ ok: false, db: false });
    }
  }),
);

app.use("/api/tasks", tasksRouter);

app.use(errorMiddleware);
