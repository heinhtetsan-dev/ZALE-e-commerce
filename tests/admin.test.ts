import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { prisma } from "../src/lib/prisma.js";
import { api, auth, createAdmin, createCustomer, createProduct, resetDb } from "./helpers.js";

const address = { fullName: "A", line1: "1 St", city: "C", postalCode: "1", country: "US" };

beforeEach(resetDb);
afterAll(() => prisma.$disconnect());

async function refs() {
  const brand = await prisma.brand.create({ data: { name: "Brandy", slug: "brandy" } });
  const category = await prisma.category.create({ data: { name: "Running", slug: "running" } });
  return { brandId: brand.id, categoryId: category.id };
}

async function placePaidOrder(variantId: string, quantity = 1) {
  const c = await createCustomer();
  await api().post("/api/v1/cart/items").set(auth(c.token)).send({ variantId, quantity });
  const { body } = await api().post("/api/v1/orders").set(auth(c.token)).send({ shippingAddress: address });
  await api().post(`/api/v1/orders/${body.order.id}/pay/mock`).set(auth(c.token));
  return body.order.id as string;
}

describe("admin products", () => {
  it("forbids customers", async () => {
    const { token } = await createCustomer();
    expect((await api().get("/api/v1/admin/products").set(auth(token))).status).toBe(403);
    expect((await api().post("/api/v1/admin/products").set(auth(token)).send({})).status).toBe(403);
  });

  it("creates, updates and lists products including inactive ones", async () => {
    const { token } = await createAdmin();
    const r = await refs();
    const created = await api()
      .post("/api/v1/admin/products")
      .set(auth(token))
      .send({ name: "Cloud Runner 2", description: "Light", color: "Blue", priceCents: 9900, images: ["products/cloud.jpg"], ...r });
    expect(created.status).toBe(201);
    expect(created.body).toMatchObject({ slug: "cloud-runner-2", imageRefs: ["products/cloud.jpg"] });
    expect(created.body.images[0]).toMatch(/^https:\/\/.+\/products\/cloud\.jpg$/);

    const dup = await api().post("/api/v1/admin/products").set(auth(token)).send({ name: "Cloud Runner 2", description: "x", color: "Red", priceCents: 1, ...r });
    expect(dup.status).toBe(409);
    expect(dup.body.error.details[0].path).toBe("slug");

    const upd = await api().patch(`/api/v1/admin/products/${created.body.id}`).set(auth(token)).send({ priceCents: 8900, isActive: false });
    expect(upd.body).toMatchObject({ priceCents: 8900, isActive: false });

    const list = await api().get("/api/v1/admin/products").set(auth(token));
    expect(list.body.total).toBe(1);
    expect((await api().get("/api/v1/products")).body.total).toBe(0);
  });

  it("validates product input", async () => {
    const { token } = await createAdmin();
    const res = await api().post("/api/v1/admin/products").set(auth(token)).send({ name: "", priceCents: -1, brandId: "nope", images: ["javascript:alert(1)"] });
    expect(res.status).toBe(400);
    const paths = res.body.error.details.map((d: { path: string }) => d.path);
    expect(paths).toEqual(expect.arrayContaining(["name", "priceCents", "brandId", "images.0", "description"]));
  });

  it("manages per-size stock, keeping ordered sizes", async () => {
    const { token } = await createAdmin();
    const p = await createProduct({ variants: [{ size: 40, stock: 5 }, { size: 41, stock: 5 }, { size: 42, stock: 5 }] });
    await placePaidOrder(p.variants[0]!.id);

    const res = await api()
      .put(`/api/v1/admin/products/${p.id}/variants`)
      .set(auth(token))
      .send({ variants: [{ size: 42, stock: 12 }, { size: 43.5, stock: 3 }] });
    expect(res.status).toBe(200);
    const sizes = res.body.variants.map((v: { size: number; stock: number }) => [v.size, v.stock]);
    // 40 was ordered -> kept with stock 0; 41 never ordered -> removed.
    expect(sizes).toEqual([[40, 0], [42, 12], [43.5, 3]]);

    const neg = await api().patch(`/api/v1/admin/variants/${p.variants[2]!.id}`).set(auth(token)).send({ stock: -1 });
    expect(neg.status).toBe(400);
    const ok = await api().patch(`/api/v1/admin/variants/${p.variants[2]!.id}`).set(auth(token)).send({ stock: 7 });
    expect(ok.body).toMatchObject({ size: 42, stock: 7 });

    const dupSizes = await api().put(`/api/v1/admin/products/${p.id}/variants`).set(auth(token)).send({ variants: [{ size: 42, stock: 1 }, { size: 42, stock: 2 }] });
    expect(dupSizes.status).toBe(400);
  });

  it("soft-deletes ordered products and hard-deletes others", async () => {
    const { token } = await createAdmin();
    const ordered = await createProduct();
    const fresh = await createProduct();
    await placePaidOrder(ordered.variants[0]!.id);
    expect((await api().delete(`/api/v1/admin/products/${ordered.id}`).set(auth(token))).body).toEqual({ deleted: false, deactivated: true });
    expect((await api().delete(`/api/v1/admin/products/${fresh.id}`).set(auth(token))).body).toEqual({ deleted: true, deactivated: false });
    expect(await prisma.product.count()).toBe(1);
  });
});

describe("admin orders", () => {
  it("moves orders forward PENDING -> SHIPPED -> DELIVERED only", async () => {
    const { token } = await createAdmin();
    const p = await createProduct();
    const id = await placePaidOrder(p.variants[0]!.id);

    expect((await api().patch(`/api/v1/admin/orders/${id}/status`).set(auth(token)).send({ status: "DELIVERED" })).status).toBe(409);
    const shipped = await api().patch(`/api/v1/admin/orders/${id}/status`).set(auth(token)).send({ status: "SHIPPED" });
    expect(shipped.body).toMatchObject({ status: "SHIPPED", customer: expect.objectContaining({ email: expect.any(String) }) });
    expect(shipped.body.shippedAt).toBeTruthy();
    expect((await api().patch(`/api/v1/admin/orders/${id}/status`).set(auth(token)).send({ status: "SHIPPED" })).status).toBe(409);
    const delivered = await api().patch(`/api/v1/admin/orders/${id}/status`).set(auth(token)).send({ status: "DELIVERED" });
    expect(delivered.body.status).toBe("DELIVERED");
    expect((await api().patch(`/api/v1/admin/orders/${id}/status`).set(auth(token)).send({ status: "PENDING" })).status).toBe(400);
  });

  it("refuses to ship unpaid orders", async () => {
    const { token } = await createAdmin();
    const p = await createProduct();
    const c = await createCustomer();
    await api().post("/api/v1/cart/items").set(auth(c.token)).send({ variantId: p.variants[0]!.id });
    const { body } = await api().post("/api/v1/orders").set(auth(c.token)).send({ shippingAddress: address });
    const res = await api().patch(`/api/v1/admin/orders/${body.order.id}/status`).set(auth(token)).send({ status: "SHIPPED" });
    expect(res.status).toBe(409);
    expect(res.body.error.message).toMatch(/paid/);
  });

  it("filters the order list by status", async () => {
    const { token } = await createAdmin();
    const p = await createProduct({ variants: [{ size: 42, stock: 10 }] });
    const a = await placePaidOrder(p.variants[0]!.id);
    await placePaidOrder(p.variants[0]!.id);
    await api().patch(`/api/v1/admin/orders/${a}/status`).set(auth(token)).send({ status: "SHIPPED" });
    expect((await api().get("/api/v1/admin/orders?status=SHIPPED").set(auth(token))).body.total).toBe(1);
    expect((await api().get("/api/v1/admin/orders").set(auth(token))).body.total).toBe(2);
  });
});

describe("admin dashboard", () => {
  it("summarises paid revenue, statuses, top products and low stock", async () => {
    const { token } = await createAdmin();
    const a = await createProduct({ name: "Alpha", priceCents: 10000, variants: [{ size: 42, stock: 10 }] });
    const b = await createProduct({ name: "Beta", priceCents: 5000, variants: [{ size: 40, stock: 3 }] });
    await placePaidOrder(a.variants[0]!.id, 2); // 20000, free shipping
    await placePaidOrder(b.variants[0]!.id, 1); // 5000 + 800 shipping
    const c = await createCustomer();
    await api().post("/api/v1/cart/items").set(auth(c.token)).send({ variantId: a.variants[0]!.id });
    await api().post("/api/v1/orders").set(auth(c.token)).send({ shippingAddress: address }); // unpaid

    const res = await api().get("/api/v1/admin/summary").set(auth(token));
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ revenueCents: 25800, paidOrders: 2, averageOrderCents: 12900, awaitingShipment: 2 });
    expect(res.body.ordersByStatus).toEqual({ PENDING: 3, SHIPPED: 0, DELIVERED: 0, CANCELLED: 0 });
    expect(res.body.topProducts[0]).toMatchObject({ name: "Alpha", units: 2, revenueCents: 20000 });
    expect(res.body.revenueByDay).toHaveLength(1);
    expect(res.body.lowStock).toEqual([expect.objectContaining({ productName: "Beta", size: 40, stock: 2 })]);
  });

  it("returns 501 for uploads when storage is not configured", async () => {
    const { token } = await createAdmin();
    const res = await api().post("/api/v1/admin/uploads/presign").set(auth(token)).send({ fileName: "a.jpg", contentType: "image/jpeg" });
    expect(res.status).toBe(501);
  });
});
