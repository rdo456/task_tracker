import { afterAll, describe, expect, it } from "vitest";
import request from "supertest";
import { app } from "./app";
import { sql } from "./db";

afterAll(async () => {
  await sql.end();
});

describe("/api/health", () => {
  it("returns ok when db is reachable", async () => {
    const res = await request(app).get("/api/health");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true, db: true });
  });
});
