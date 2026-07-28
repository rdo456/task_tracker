import type { ErrorRequestHandler, RequestHandler } from "express";
import { ZodError } from "zod";
import type { ApiError } from "@jira-lite/shared";

export class NotFoundError extends Error {}

export class ConflictError extends Error {
  constructor(
    message: string,
    public readonly code: string,
  ) {
    super(message);
  }
}

export function asyncHandler(fn: RequestHandler): RequestHandler {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}

export const errorMiddleware: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof ZodError) {
    const body: ApiError = {
      error: "validation_error",
      message: "invalid request body",
      details: err.flatten(),
    };
    res.status(400).json(body);
    return;
  }
  if (err instanceof NotFoundError) {
    const body: ApiError = {
      error: "not_found",
      message: err.message || "not found",
    };
    res.status(404).json(body);
    return;
  }
  if (err instanceof ConflictError) {
    const body: ApiError = {
      error: err.code,
      message: err.message,
    };
    res.status(409).json(body);
    return;
  }
  console.error(err);
  const body: ApiError = {
    error: "internal_error",
    message: "internal server error",
  };
  res.status(500).json(body);
};
