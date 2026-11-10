import request from "supertest";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

// Build a separate app instance with tiny limits; limiters read env at import.
let app: import("express").Express;
let disconnect: () => Promise<void>;

beforeAll(async () => {
  vi.resetModules();
  process.env.AUTH_RATE_LIMIT_MAX = "3";
  process.env.RATE_LIMIT_MAX = "12";
  const { createApp } = await import("../src/app.js");
  const { prisma } = await import("../src/lib/prisma.js");
  const helpers = await import("./helpers.js");
  await helpers.resetDb();
  await helpers.createUser({ email: "rl@test.dev", password: "Password123!" });
  app = createApp();
  disconnect = () => prisma.$disconnect();
});

afterAll(async () => {
  process.env.AUTH_RATE_LIMIT_MAX = "100000";
  process.env.RATE_LIMIT_MAX = "100000";
  await disconnect();
});

describe("rate limiting", () => {
  it("does not count successful logins, but blocks repeated failures", async () => {
    for (let i = 0; i < 4; i++) {
      expect((await request(app).post("/api/v1/auth/login").send({ email: "rl@test.dev", password: "Password123!" })).status).toBe(200);
    }
    for (let i = 0; i < 3; i++) {
      expect((await request(app).post("/api/v1/auth/login").send({ email: "rl@test.dev", password: "wrong-password" })).status).toBe(401);
    }
    const blocked = await request(app).post("/api/v1/auth/login").send({ email: "rl@test.dev", password: "Password123!" });
    expect(blocked.status).toBe(429);
    expect(blocked.body.error.code).toBe("RATE_LIMITED");
    expect(blocked.headers["ratelimit-policy"]).toBeDefined();
  });

  it("applies the global limit to API requests", async () => {
    const statuses: number[] = [];
    for (let i = 0; i < 12; i++) statuses.push((await request(app).get("/api/v1/products/facets")).status);
    expect(statuses.at(-1)).toBe(429);
    // Health checks are exempt so load balancers never get throttled.
    expect((await request(app).get("/api/v1/health")).status).toBe(200);
  });
});
