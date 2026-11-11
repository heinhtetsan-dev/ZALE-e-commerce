import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "../src/lib/prisma.js";
import { api, createProduct, resetDb } from "./helpers.js";

beforeAll(async () => {
  await resetDb();
  await prisma.newsletterSubscriber.deleteMany();
  await createProduct({ name: "Coat Charcoal", gender: "WOMEN", styleGroup: "coat", color: "Black", colorway: "Charcoal", variants: [{ size: "S", stock: 2 }, { size: "M", stock: 0 }, { size: "XS", stock: 4 }] });
  await createProduct({ name: "Coat Camel", gender: "WOMEN", styleGroup: "coat", color: "Beige", colorway: "Camel" });
  await createProduct({ name: "Coat Mens", gender: "MEN", styleGroup: "coat", color: "Blue", colorway: "Navy" });
  await createProduct({ name: "Solo Tee", gender: "UNISEX", styleGroup: "tee" });
});
afterAll(() => prisma.$disconnect());

describe("product cards", () => {
  it("include sizes in fit order for quick add", async () => {
    const res = await api().get("/api/v1/products?q=charcoal");
    expect(res.body.items[0].sizes).toEqual([
      { variantId: expect.any(String), size: "XS", stock: 4 },
      { variantId: expect.any(String), size: "S", stock: 2 },
      { variantId: expect.any(String), size: "M", stock: 0 },
    ]);
  });

  it("include other colors of the same item for the same audience", async () => {
    const res = await api().get("/api/v1/products?gender=women");
    const coat = res.body.items.find((p: { name: string }) => p.name === "Coat Charcoal");
    expect(coat.swatches.map((s: { colorway: string }) => s.colorway).sort()).toEqual(["Camel", "Charcoal"]);
    const tee = res.body.items.find((p: { name: string }) => p.name === "Solo Tee");
    expect(tee.swatches).toEqual([]);
  });
});

describe("newsletter", () => {
  it("subscribes an email idempotently without revealing existing subscribers", async () => {
    const first = await api().post("/api/v1/newsletter").send({ email: "Ada@Example.com " });
    const again = await api().post("/api/v1/newsletter").send({ email: "ada@example.com" });
    expect(first.status).toBe(201);
    expect(again.status).toBe(201);
    expect(again.body).toEqual(first.body);
    expect(await prisma.newsletterSubscriber.count({ where: { email: "ada@example.com" } })).toBe(1);
  });

  it("rejects invalid emails", async () => {
    const res = await api().post("/api/v1/newsletter").send({ email: "not-an-email" });
    expect(res.status).toBe(400);
  });
});
