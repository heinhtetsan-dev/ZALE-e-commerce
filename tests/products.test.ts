import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "../src/lib/prisma.js";
import { api, createProduct, resetDb } from "./helpers.js";

beforeAll(async () => {
  await resetDb();
  await createProduct({ name: "Road Runner", brand: "Nike", category: "Running", color: "Red", priceCents: 12000, variants: [{ size: "L", stock: 0 }, { size: "M", stock: 3 }] });
  await createProduct({ name: "Court King", brand: "Adidas", category: "Basketball", color: "White", priceCents: 9000, variants: [{ size: "L", stock: 8 }] });
  await createProduct({ name: "Trail Boss", brand: "Nike", category: "Boots", color: "Brown", priceCents: 15000, variants: [{ size: "32", stock: 1 }] });
  await createProduct({ name: "Hidden Shoe", brand: "Nike", isActive: false });
});

afterAll(() => prisma.$disconnect());

describe("GET /products", () => {
  it("lists active products with pagination metadata", async () => {
    const res = await api().get("/api/v1/products");
    expect(res.status).toBe(200);
    expect(res.body.total).toBe(3);
    expect(res.body.page).toBe(1);
    expect(res.body.items.map((p: { name: string }) => p.name)).not.toContain("Hidden Shoe");
  });

  it("paginates", async () => {
    const res = await api().get("/api/v1/products?pageSize=2&page=2&sort=price_asc");
    expect(res.body.items).toHaveLength(1);
    expect(res.body.totalPages).toBe(2);
    expect(res.body.items[0].name).toBe("Trail Boss");
  });

  it("searches case-insensitively by name and brand", async () => {
    expect((await api().get("/api/v1/products?q=road")).body.total).toBe(1);
    expect((await api().get("/api/v1/products?q=ADIDAS")).body.items[0].name).toBe("Court King");
  });

  it("filters by brand, category, color and price", async () => {
    expect((await api().get("/api/v1/products?brand=nike")).body.total).toBe(2);
    expect((await api().get("/api/v1/products?category=running,boots")).body.total).toBe(2);
    expect((await api().get("/api/v1/products?color=white")).body.total).toBe(1);
    expect((await api().get("/api/v1/products?minPrice=10000&maxPrice=13000")).body.items[0].name).toBe("Road Runner");
  });

  it("filters by size only when that size is in stock", async () => {
    const res = await api().get("/api/v1/products?size=L");
    expect(res.body.items.map((p: { name: string }) => p.name)).toEqual(["Court King"]);
    expect((await api().get("/api/v1/products?size=32")).body.total).toBe(1);
  });

  it("sorts by price descending", async () => {
    const res = await api().get("/api/v1/products?sort=price_desc");
    expect(res.body.items.map((p: { priceCents: number }) => p.priceCents)).toEqual([15000, 12000, 9000]);
  });

  it("rejects invalid query parameters", async () => {
    const res = await api().get("/api/v1/products?pageSize=1000");
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
    expect((await api().get("/api/v1/products?minPrice=500&maxPrice=100")).status).toBe(400);
  });

  it("returns CDN image URLs", async () => {
    const res = await api().get("/api/v1/products");
    expect(res.body.items[0].image).toMatch(/^https:\/\/.+\/products\/test\.jpg$/);
  });
});

describe("GET /products/facets", () => {
  it("returns brands, categories, colors, in-stock sizes and price range", async () => {
    const res = await api().get("/api/v1/products/facets");
    expect(res.status).toBe(200);
    expect(res.body.brands.map((b: { slug: string }) => b.slug)).toEqual(["adidas", "nike"]);
    expect(res.body.sizes).toEqual(["M", "L", "32"]);
    expect(res.body.price).toEqual({ min: 9000, max: 15000 });
  });
});

describe("GET /products/:slug", () => {
  it("returns detail with per-size stock status", async () => {
    const list = await api().get("/api/v1/products?q=road");
    const res = await api().get(`/api/v1/products/${list.body.items[0].slug}`);
    expect(res.status).toBe(200);
    expect(res.body.variants).toEqual([
      expect.objectContaining({ size: "M", stock: 3, stockStatus: "low_stock" }),
      expect.objectContaining({ size: "L", stock: 0, stockStatus: "out_of_stock" }),
    ]);
  });

  it("404s for unknown or inactive products", async () => {
    expect((await api().get("/api/v1/products/nope")).status).toBe(404);
    const hidden = await prisma.product.findFirstOrThrow({ where: { name: "Hidden Shoe" } });
    expect((await api().get(`/api/v1/products/${hidden.slug}`)).status).toBe(404);
  });
});
