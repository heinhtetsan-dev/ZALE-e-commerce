import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { prisma } from "../src/lib/prisma.js";
import { expireUnpaidOrders } from "../src/modules/orders/order.service.js";
import { api, auth, createCustomer, createProduct, resetDb } from "./helpers.js";

const address = { fullName: "Ada Lovelace", line1: "1 Analytical St", city: "London", postalCode: "N1 9GU", country: "gb" };

beforeEach(resetDb);
afterAll(() => prisma.$disconnect());

const stockOf = async (variantId: string) => (await prisma.productVariant.findUniqueOrThrow({ where: { id: variantId } })).stock;

async function customerWithCartItem(variantId: string, quantity = 1) {
  const c = await createCustomer();
  const res = await api().post("/api/v1/cart/items").set(auth(c.token)).send({ variantId, quantity });
  expect(res.status).toBe(201);
  return c;
}

describe("checkout", () => {
  it("creates an order, decrements stock, snapshots prices and clears the cart", async () => {
    const p = await createProduct({ priceCents: 4500, variants: [{ size: 42, stock: 5 }] });
    const v = p.variants[0]!.id;
    const { token } = await customerWithCartItem(v, 2);

    const res = await api().post("/api/v1/orders").set(auth(token)).send({ shippingAddress: address });
    expect(res.status).toBe(201);
    expect(res.body.order).toMatchObject({
      status: "PENDING",
      paymentStatus: "UNPAID",
      subtotalCents: 9000,
      shippingCents: 800,
      totalCents: 9800,
      shippingAddress: expect.objectContaining({ country: "GB" }),
    });
    expect(res.body.order.items[0]).toMatchObject({ size: 42, quantity: 2, unitPriceCents: 4500 });
    expect(res.body.payment).toEqual({ mode: "mock", clientSecret: null });
    expect(await stockOf(v)).toBe(3);
    expect((await api().get("/api/v1/cart").set(auth(token))).body.items).toHaveLength(0);

    // Later price changes do not affect the order.
    await prisma.product.update({ where: { id: p.id }, data: { priceCents: 9999 } });
    const order = await api().get(`/api/v1/orders/${res.body.order.id}`).set(auth(token));
    expect(order.body.items[0].unitPriceCents).toBe(4500);
  });

  it("gives free shipping above the threshold", async () => {
    const p = await createProduct({ priceCents: 12000 });
    const { token } = await customerWithCartItem(p.variants[0]!.id);
    const res = await api().post("/api/v1/orders").set(auth(token)).send({ shippingAddress: address });
    expect(res.body.order.shippingCents).toBe(0);
  });

  it("rejects an empty cart and an invalid address", async () => {
    const { token } = await createCustomer();
    expect((await api().post("/api/v1/orders").set(auth(token)).send({ shippingAddress: address })).status).toBe(400);
    expect((await api().post("/api/v1/orders").set(auth(token)).send({ shippingAddress: { ...address, city: "" } })).status).toBe(400);
  });

  it("rolls back every line when one line is out of stock and suggests other sizes", async () => {
    const a = await createProduct({ variants: [{ size: 42, stock: 5 }] });
    const b = await createProduct({ name: "Last Pair", variants: [{ size: 40, stock: 1 }, { size: 41, stock: 4 }, { size: 44, stock: 0 }] });
    const { token } = await customerWithCartItem(a.variants[0]!.id, 2);
    await api().post("/api/v1/cart/items").set(auth(token)).send({ variantId: b.variants[0]!.id, quantity: 1 });

    // Someone else bought the last pair after it was added to this cart.
    await prisma.productVariant.update({ where: { id: b.variants[0]!.id }, data: { stock: 0 } });

    const res = await api().post("/api/v1/orders").set(auth(token)).send({ shippingAddress: address });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe("OUT_OF_STOCK");
    expect(res.body.error.message).toBe("Last Pair in size 40 is sold out.");
    expect(res.body.error.details.items[0]).toMatchObject({ size: 40, requested: 1, available: 0 });
    expect(res.body.error.details.items[0].alternatives).toEqual([expect.objectContaining({ size: 41, stock: 4 })]);

    expect(await stockOf(a.variants[0]!.id)).toBe(5);
    expect(await prisma.order.count()).toBe(0);
    expect((await api().get("/api/v1/cart").set(auth(token))).body.items).toHaveLength(2);
  });

  it("never sells the last pair twice under concurrent checkouts", async () => {
    const p = await createProduct({ variants: [{ size: 42, stock: 1 }, { size: 43, stock: 3 }] });
    const v = p.variants[0]!.id;
    const buyers = await Promise.all(Array.from({ length: 8 }, () => customerWithCartItem(v)));

    const results = await Promise.all(
      buyers.map((b) => api().post("/api/v1/orders").set(auth(b.token)).send({ shippingAddress: address })),
    );

    const statuses = results.map((r) => r.status).sort();
    expect(statuses).toEqual([201, 409, 409, 409, 409, 409, 409, 409]);
    for (const r of results.filter((x) => x.status === 409)) {
      expect(r.body.error.code).toBe("OUT_OF_STOCK");
      expect(r.body.error.details.items[0].alternatives.map((a: { size: number }) => a.size)).toEqual([43]);
    }
    expect(await stockOf(v)).toBe(0);
    expect(await prisma.orderItem.count({ where: { variantId: v } })).toBe(1);
  });

  it("sells exactly the available quantity under heavy concurrency", async () => {
    const p = await createProduct({ variants: [{ size: 39, stock: 5 }] });
    const v = p.variants[0]!.id;
    const buyers = await Promise.all(Array.from({ length: 20 }, () => customerWithCartItem(v)));
    const results = await Promise.all(buyers.map((b) => api().post("/api/v1/orders").set(auth(b.token)).send({ shippingAddress: address })));
    expect(results.filter((r) => r.status === 201)).toHaveLength(5);
    expect(results.filter((r) => r.status === 409)).toHaveLength(15);
    expect(await stockOf(v)).toBe(0);
  });

  it("enforces CHECK (stock >= 0) at the database level", async () => {
    const p = await createProduct({ variants: [{ size: 42, stock: 0 }] });
    await expect(
      prisma.$executeRaw`UPDATE "ProductVariant" SET stock = stock - 1 WHERE id = ${p.variants[0]!.id}::uuid`,
    ).rejects.toThrow(/ProductVariant_stock_nonnegative|check constraint/i);
  });
});

describe("orders after checkout", () => {
  it("lists only the customer's own orders, paginated", async () => {
    const p = await createProduct({ variants: [{ size: 42, stock: 10 }] });
    const me = await customerWithCartItem(p.variants[0]!.id);
    const other = await customerWithCartItem(p.variants[0]!.id);
    const mine = await api().post("/api/v1/orders").set(auth(me.token)).send({ shippingAddress: address });
    const theirs = await api().post("/api/v1/orders").set(auth(other.token)).send({ shippingAddress: address });

    const list = await api().get("/api/v1/orders").set(auth(me.token));
    expect(list.body).toMatchObject({ total: 1, page: 1 });
    expect(list.body.items[0].id).toBe(mine.body.order.id);
    expect((await api().get(`/api/v1/orders/${theirs.body.order.id}`).set(auth(me.token))).status).toBe(404);
  });

  it("cancelling an unpaid order restores stock exactly once", async () => {
    const p = await createProduct({ variants: [{ size: 42, stock: 3 }] });
    const v = p.variants[0]!.id;
    const { token } = await customerWithCartItem(v, 2);
    const { body } = await api().post("/api/v1/orders").set(auth(token)).send({ shippingAddress: address });
    expect(await stockOf(v)).toBe(1);

    const [c1, c2] = await Promise.all([
      api().post(`/api/v1/orders/${body.order.id}/cancel`).set(auth(token)),
      api().post(`/api/v1/orders/${body.order.id}/cancel`).set(auth(token)),
    ]);
    expect([c1.status, c2.status].sort()).toEqual([200, 409]);
    expect(await stockOf(v)).toBe(3);
  });

  it("mock payment marks the order paid; paid orders cannot be cancelled", async () => {
    const p = await createProduct();
    const { token } = await customerWithCartItem(p.variants[0]!.id);
    const { body } = await api().post("/api/v1/orders").set(auth(token)).send({ shippingAddress: address });
    const paid = await api().post(`/api/v1/orders/${body.order.id}/pay/mock`).set(auth(token));
    expect(paid.body.paymentStatus).toBe("PAID");
    // Guards against session time-zone drift between raw SQL now() and Prisma.
    expect(Math.abs(new Date(paid.body.paidAt).getTime() - Date.now())).toBeLessThan(60_000);
    expect(Math.abs(new Date(paid.body.createdAt).getTime() - Date.now())).toBeLessThan(60_000);
    expect((await api().post(`/api/v1/orders/${body.order.id}/pay/mock`).set(auth(token))).status).toBe(409);
    expect((await api().post(`/api/v1/orders/${body.order.id}/cancel`).set(auth(token))).status).toBe(409);
  });

  it("expires stale unpaid orders and releases their stock", async () => {
    const p = await createProduct({ variants: [{ size: 42, stock: 2 }] });
    const v = p.variants[0]!.id;
    const { token } = await customerWithCartItem(v, 2);
    const { body } = await api().post("/api/v1/orders").set(auth(token)).send({ shippingAddress: address });
    expect(await stockOf(v)).toBe(0);

    expect(await expireUnpaidOrders(30)).toBe(0);
    await prisma.order.update({ where: { id: body.order.id }, data: { createdAt: new Date(Date.now() - 31 * 60_000) } });
    expect(await expireUnpaidOrders(30)).toBe(1);
    expect(await expireUnpaidOrders(30)).toBe(0);
    expect(await stockOf(v)).toBe(2);
    expect((await prisma.order.findUniqueOrThrow({ where: { id: body.order.id } })).status).toBe("CANCELLED");
  });
});
