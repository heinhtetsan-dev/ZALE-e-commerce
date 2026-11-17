import jwt from "jsonwebtoken";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "../src/lib/prisma.js";
import { api, auth, createAdmin, createCustomer, resetDb } from "./helpers.js";

beforeAll(resetDb);
afterAll(() => prisma.$disconnect());

describe("auth", () => {
  const creds = { name: "Ada", email: "Ada@Example.com", password: "s3cure-pass" };
  let token = "";

  it("registers a customer, normalises email and stores a bcrypt hash", async () => {
    const res = await api().post("/api/v1/auth/register").send(creds);
    expect(res.status).toBe(201);
    expect(res.body.user).toMatchObject({ email: "ada@example.com", role: "CUSTOMER", name: "Ada" });
    expect(res.body.user.passwordHash).toBeUndefined();
    const stored = await prisma.user.findUniqueOrThrow({ where: { email: "ada@example.com" } });
    expect(stored.passwordHash).toMatch(/^\$2[aby]\$12\$/);
    token = res.body.token;
  });

  it("rejects duplicate emails and weak input", async () => {
    expect((await api().post("/api/v1/auth/register").send(creds)).status).toBe(409);
    const bad = await api().post("/api/v1/auth/register").send({ name: "", email: "nope", password: "short" });
    expect(bad.status).toBe(400);
    expect(bad.body.error.details.map((d: { path: string }) => d.path).sort()).toEqual(["email", "name", "password"]);
  });

  it("does not let registration create admins", async () => {
    const res = await api().post("/api/v1/auth/register").send({ ...creds, email: "x@example.com", role: "ADMIN" });
    expect(res.body.user.role).toBe("CUSTOMER");
  });

  it("logs in with correct credentials only", async () => {
    const ok = await api().post("/api/v1/auth/login").send({ email: "ada@example.com", password: creds.password });
    expect(ok.status).toBe(200);
    expect(ok.body.token).toBeTruthy();
    const bad = await api().post("/api/v1/auth/login").send({ email: "ada@example.com", password: "wrong-pass" });
    expect(bad.status).toBe(401);
    const unknown = await api().post("/api/v1/auth/login").send({ email: "who@example.com", password: "whatever1" });
    expect(unknown.status).toBe(401);
    expect(unknown.body.error.message).toBe(bad.body.error.message);
  });

  it("returns and updates the current user", async () => {
    expect((await api().get("/api/v1/auth/me")).status).toBe(401);
    const me = await api().get("/api/v1/auth/me").set(auth(token));
    expect(me.body.user.email).toBe("ada@example.com");
    const upd = await api().patch("/api/v1/auth/me").set(auth(token)).send({ name: "Ada L." });
    expect(upd.body.user.name).toBe("Ada L.");
  });

  it("changes password only with the current password", async () => {
    const wrong = await api().post("/api/v1/auth/change-password").set(auth(token)).send({ currentPassword: "nope", newPassword: "new-password-1" });
    expect(wrong.status).toBe(400);
    const ok = await api().post("/api/v1/auth/change-password").set(auth(token)).send({ currentPassword: creds.password, newPassword: "new-password-1" });
    expect(ok.status).toBe(204);
    expect((await api().post("/api/v1/auth/login").send({ email: creds.email, password: "new-password-1" })).status).toBe(200);
  });

  it("rejects tampered and expired tokens", async () => {
    const forged = jwt.sign({ sub: "x", role: "ADMIN" }, "another-secret-another-secret-12345");
    expect((await api().get("/api/v1/auth/me").set(auth(forged))).status).toBe(401);
    const expired = jwt.sign({ sub: "x", role: "CUSTOMER" }, process.env.JWT_SECRET!, { expiresIn: -10 });
    expect((await api().get("/api/v1/auth/me").set(auth(expired))).status).toBe(401);
  });
});

describe("role-based access", () => {
  it("allows admins and forbids customers on admin routes", async () => {
    const admin = await createAdmin();
    const customer = await createCustomer();
    expect((await api().get("/api/v1/admin/brands")).status).toBe(401);
    expect((await api().get("/api/v1/admin/brands").set(auth(customer.token))).status).toBe(403);
    expect((await api().get("/api/v1/admin/brands").set(auth(admin.token))).status).toBe(200);
  });
});
