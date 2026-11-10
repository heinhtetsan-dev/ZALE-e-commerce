import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { prisma } from "../src/lib/prisma.js";
import { api, auth, createCustomer, createProduct, resetDb } from "./helpers.js";

beforeEach(resetDb);
afterAll(() => prisma.$disconnect());

describe("cart", () => {
  it("requires authentication", async () => {
    expect((await api().get("/api/v1/cart")).status).toBe(401);
  });

  it("requires a size (variant) to add an item", async () => {
    const { token } = await createCustomer();
    const res = await api().post("/api/v1/cart/items").set(auth(token)).send({ quantity: 1 });
    expect(res.status).toBe(400);
    expect(res.body.error.details[0]).toMatchObject({ path: "variantId", message: "Please select a size" });
  });

  it("adds, accumulates, updates and removes items without touching stock", async () => {
    const { token } = await createCustomer();
    const p = await createProduct({ priceCents: 5000, variants: [{ size: 42, stock: 5 }] });
    const variantId = p.variants[0]!.id;

    let res = await api().post("/api/v1/cart/items").set(auth(token)).send({ variantId, quantity: 2 });
    expect(res.status).toBe(201);
    res = await api().post("/api/v1/cart/items").set(auth(token)).send({ variantId, quantity: 1 });
    expect(res.body.items).toHaveLength(1);
    expect(res.body.items[0].quantity).toBe(3);
    expect(res.body.subtotalCents).toBe(15000);
    expect((await prisma.productVariant.findUniqueOrThrow({ where: { id: variantId } })).stock).toBe(5);

    const itemId = res.body.items[0].id;
    res = await api().patch(`/api/v1/cart/items/${itemId}`).set(auth(token)).send({ quantity: 1 });
    expect(res.body.itemCount).toBe(1);

    res = await api().delete(`/api/v1/cart/items/${itemId}`).set(auth(token));
    expect(res.body.items).toHaveLength(0);
  });

  it("rejects quantities above stock with alternatives", async () => {
    const { token } = await createCustomer();
    const p = await createProduct({ variants: [{ size: 41, stock: 0 }, { size: 42, stock: 2 }, { size: 43, stock: 7 }] });
    const res = await api().post("/api/v1/cart/items").set(auth(token)).send({ variantId: p.variants[0]!.id, quantity: 1 });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe("OUT_OF_STOCK");
    expect(res.body.error.message).toMatch(/size 41 is sold out/);
    expect(res.body.error.details.items[0].alternatives.map((a: { size: number }) => a.size)).toEqual([42, 43]);

    const tooMany = await api().post("/api/v1/cart/items").set(auth(token)).send({ variantId: p.variants[1]!.id, quantity: 3 });
    expect(tooMany.status).toBe(409);
    expect(tooMany.body.error.message).toMatch(/Only 2 left/);
  });

  it("isolates carts between users", async () => {
    const a = await createCustomer();
    const b = await createCustomer();
    const p = await createProduct();
    const res = await api().post("/api/v1/cart/items").set(auth(a.token)).send({ variantId: p.variants[0]!.id });
    const itemId = res.body.items[0].id;
    expect((await api().patch(`/api/v1/cart/items/${itemId}`).set(auth(b.token)).send({ quantity: 2 })).status).toBe(404);
    expect((await api().delete(`/api/v1/cart/items/${itemId}`).set(auth(b.token))).status).toBe(404);
  });

  it("merges a guest cart, capping by stock and skipping sold-out sizes", async () => {
    const { token } = await createCustomer();
    const p = await createProduct({ variants: [{ size: 40, stock: 3 }, { size: 41, stock: 0 }, { size: 42, stock: 20 }] });
    await api().post("/api/v1/cart/items").set(auth(token)).send({ variantId: p.variants[2]!.id, quantity: 4 });
    const res = await api()
      .post("/api/v1/cart/merge")
      .set(auth(token))
      .send({
        items: [
          { variantId: p.variants[0]!.id, quantity: 5 },
          { variantId: p.variants[1]!.id, quantity: 1 },
          { variantId: p.variants[2]!.id, quantity: 9 },
        ],
      });
    expect(res.status).toBe(200);
    const bySize = Object.fromEntries(res.body.items.map((i: { variant: { size: number }; quantity: number }) => [i.variant.size, i.quantity]));
    expect(bySize).toEqual({ 40: 3, 42: 10 });
  });
});
