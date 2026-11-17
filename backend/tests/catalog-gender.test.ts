import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "../src/lib/prisma.js";
import { api, auth, createAdmin, createProduct, resetDb } from "./helpers.js";

let menRunner: Awaited<ReturnType<typeof createProduct>>;

beforeAll(async () => {
  await resetDb();
  menRunner = await createProduct({ name: "Runner M", gender: "MEN", colorway: "Black/White", styleGroup: "runner", category: "Running" });
  await createProduct({ name: "Runner W", gender: "WOMEN", colorway: "Pink/White", styleGroup: "runner", category: "Running" });
  await createProduct({ name: "Runner U", gender: "UNISEX", colorway: "Grey/Volt", styleGroup: "runner", category: "Running" });
  await createProduct({ name: "Heel Boot", gender: "WOMEN", category: "Boots" });
});
afterAll(() => prisma.$disconnect());

const names = (res: { body: { items: Array<{ name: string }> } }) => res.body.items.map((p) => p.name).sort();

describe("men's / women's catalog", () => {
  it("lists men's and women's products, with unisex in both", async () => {
    expect(names(await api().get("/api/v1/products?gender=men"))).toEqual(["Runner M", "Runner U"]);
    expect(names(await api().get("/api/v1/products?gender=women"))).toEqual(["Heel Boot", "Runner U", "Runner W"]);
    expect((await api().get("/api/v1/products")).body.total).toBe(4);
    expect((await api().get("/api/v1/products?gender=kids")).status).toBe(400);
  });

  it("returns gender and colorway on cards and searches colorways", async () => {
    const res = await api().get("/api/v1/products?q=volt");
    expect(res.body.items).toEqual([expect.objectContaining({ name: "Runner U", gender: "UNISEX", colorway: "Grey/Volt" })]);
  });

  it("scopes facets to the audience", async () => {
    const men = await api().get("/api/v1/products/facets?gender=men");
    expect(men.body.categories.map((c: { slug: string; count: number }) => [c.slug, c.count])).toEqual([["running", 2]]);
    const women = await api().get("/api/v1/products/facets?gender=women");
    expect(women.body.categories.map((c: { slug: string }) => c.slug)).toEqual(["boots", "running"]);
  });

  it("links colorways of the same model for the same audience", async () => {
    const res = await api().get(`/api/v1/products/${menRunner.slug}`);
    expect(res.body.colorways.map((c: { colorway: string }) => c.colorway).sort()).toEqual(["Black/White", "Grey/Volt"]);
    expect(res.body.colorways[0]).toEqual(expect.objectContaining({ slug: expect.any(String), image: expect.stringMatching(/^https:/), inStock: true }));
  });

  it("lets admins set gender, colorway, style group and image credit", async () => {
    const { token } = await createAdmin();
    const brand = await prisma.brand.findFirstOrThrow();
    const category = await prisma.category.findFirstOrThrow();
    const res = await api()
      .post("/api/v1/admin/products")
      .set(auth(token))
      .send({
        name: "Court Classic",
        description: "x",
        color: "White",
        colorway: "White/Gum",
        gender: "WOMEN",
        styleGroup: "court-classic",
        imageCredit: "Jane Doe, CC BY-SA 4.0",
        imageSourceUrl: "https://commons.wikimedia.org/wiki/File:X.jpg",
        priceCents: 9000,
        brandId: brand.id,
        categoryId: category.id,
      });
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ gender: "WOMEN", colorway: "White/Gum", styleGroup: "court-classic", imageCredit: "Jane Doe, CC BY-SA 4.0" });
    const bad = await api().post("/api/v1/admin/products").set(auth(token)).send({ ...res.body, name: "Y", slug: undefined, gender: "KIDS", brandId: brand.id, categoryId: category.id, description: "x" });
    expect(bad.status).toBe(400);
  });
});

describe("text encoding", () => {
  it("stores non-Latin names (database must be UTF-8)", async () => {
    const name = "ဟိန်းထက်ဆန်း Ćvetanović 王小明";
    const res = await api().post("/api/v1/auth/register").send({ name, email: "utf8@test.dev", password: "Password123!" });
    expect(res.status).toBe(201);
    expect(res.body.user.name).toBe(name);
  });
});
