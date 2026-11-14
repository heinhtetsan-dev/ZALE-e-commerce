import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { rm } from "node:fs/promises";
import path from "node:path";
import { prisma } from "../src/lib/prisma.js";
import { api, auth, createAdmin, createCustomer, createProduct, createUser, resetDb } from "./helpers.js";

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

  it("revokes admin access as soon as the account is demoted or deleted, even with a valid token", async () => {
    const { user, token } = await createAdmin();
    expect((await api().get("/api/v1/admin/products").set(auth(token))).status).toBe(200);

    await prisma.user.update({ where: { id: user.id }, data: { role: "CUSTOMER" } });
    expect((await api().get("/api/v1/admin/products").set(auth(token))).status).toBe(403);

    await prisma.user.delete({ where: { id: user.id } });
    expect((await api().get("/api/v1/admin/products").set(auth(token))).status).toBe(401);
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
    const p = await createProduct({ variants: [{ size: "S", stock: 5 }, { size: "M", stock: 5 }, { size: "L", stock: 5 }] });
    await placePaidOrder(p.variants[0]!.id);

    const res = await api()
      .put(`/api/v1/admin/products/${p.id}/variants`)
      .set(auth(token))
      .send({ variants: [{ size: "l", stock: 12 }, { size: "xl ", stock: 3 }] });
    expect(res.status).toBe(200);
    const sizes = res.body.variants.map((v: { size: string; stock: number }) => [v.size, v.stock]);
    // S was ordered -> kept with stock 0; M never ordered -> removed; "l" matches L.
    expect(sizes).toEqual([["S", 0], ["L", 12], ["XL", 3]]);

    const neg = await api().patch(`/api/v1/admin/variants/${p.variants[2]!.id}`).set(auth(token)).send({ stock: -1 });
    expect(neg.status).toBe(400);
    const ok = await api().patch(`/api/v1/admin/variants/${p.variants[2]!.id}`).set(auth(token)).send({ stock: 7 });
    expect(ok.body).toMatchObject({ size: "L", stock: 7 });

    const dupSizes = await api().put(`/api/v1/admin/products/${p.id}/variants`).set(auth(token)).send({ variants: [{ size: "L", stock: 1 }, { size: "l", stock: 2 }] });
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

describe("admin cancel and refund", () => {
  const stockOf = async (variantId: string) => (await prisma.productVariant.findUniqueOrThrow({ where: { id: variantId } })).stock;

  it("cancels a paid order before shipping: refunds it and puts the stock back", async () => {
    const { token } = await createAdmin();
    const p = await createProduct({ variants: [{ size: "M", stock: 5 }] });
    const id = await placePaidOrder(p.variants[0]!.id, 2);
    expect(await stockOf(p.variants[0]!.id)).toBe(3);

    const res = await api().post(`/api/v1/admin/orders/${id}/cancel`).set(auth(token));
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ status: "CANCELLED", paymentStatus: "REFUNDED" });
    expect(res.body.refundedAt).toBeTruthy();
    expect(await stockOf(p.variants[0]!.id)).toBe(5);

    // Refunded revenue no longer counts, and a second cancel is refused without restocking again.
    expect((await api().get("/api/v1/admin/summary").set(auth(token))).body.revenueCents).toBe(0);
    expect((await api().post(`/api/v1/admin/orders/${id}/cancel`).set(auth(token))).status).toBe(409);
    expect(await stockOf(p.variants[0]!.id)).toBe(5);
  });

  it("cancels an unpaid order without a refund", async () => {
    const { token } = await createAdmin();
    const p = await createProduct({ variants: [{ size: "M", stock: 5 }] });
    const c = await createCustomer();
    await api().post("/api/v1/cart/items").set(auth(c.token)).send({ variantId: p.variants[0]!.id, quantity: 1 });
    const { body } = await api().post("/api/v1/orders").set(auth(c.token)).send({ shippingAddress: address });

    const res = await api().post(`/api/v1/admin/orders/${body.order.id}/cancel`).set(auth(token));
    expect(res.body).toMatchObject({ status: "CANCELLED", paymentStatus: "UNPAID", refundedAt: null });
    expect(await stockOf(p.variants[0]!.id)).toBe(5);
  });

  it("refunds shipped orders instead of cancelling them, restocking only when asked", async () => {
    const { token } = await createAdmin();
    const p = await createProduct({ variants: [{ size: "M", stock: 5 }] });
    const a = await placePaidOrder(p.variants[0]!.id);
    const b = await placePaidOrder(p.variants[0]!.id);
    for (const id of [a, b]) await api().patch(`/api/v1/admin/orders/${id}/status`).set(auth(token)).send({ status: "SHIPPED" });
    expect(await stockOf(p.variants[0]!.id)).toBe(3);

    expect((await api().post(`/api/v1/admin/orders/${a}/cancel`).set(auth(token))).status).toBe(409);

    const kept = await api().post(`/api/v1/admin/orders/${a}/refund`).set(auth(token)).send({});
    expect(kept.body).toMatchObject({ status: "SHIPPED", paymentStatus: "REFUNDED" });
    expect(await stockOf(p.variants[0]!.id)).toBe(3);

    const returned = await api().post(`/api/v1/admin/orders/${b}/refund`).set(auth(token)).send({ restock: true });
    expect(returned.body.paymentStatus).toBe("REFUNDED");
    expect(await stockOf(p.variants[0]!.id)).toBe(4);

    expect((await api().post(`/api/v1/admin/orders/${a}/refund`).set(auth(token)).send({})).status).toBe(409);
  });

  it("does not refund orders that have not shipped or were never paid", async () => {
    const { token } = await createAdmin();
    const p = await createProduct();
    const id = await placePaidOrder(p.variants[0]!.id);
    const res = await api().post(`/api/v1/admin/orders/${id}/refund`).set(auth(token)).send({});
    expect(res.status).toBe(409);
    expect(res.body.error.message).toMatch(/Cancel it instead/);
  });

  it("is admin only", async () => {
    const c = await createCustomer();
    const p = await createProduct();
    const id = await placePaidOrder(p.variants[0]!.id);
    expect((await api().post(`/api/v1/admin/orders/${id}/cancel`).set(auth(c.token))).status).toBe(403);
  });
});

describe("admin customers", () => {
  it("lists customers with their purchases, and searches by name or email", async () => {
    const { token } = await createAdmin();
    const p = await createProduct({ priceCents: 12000 });
    await placePaidOrder(p.variants[0]!.id);
    const res = await api().get("/api/v1/admin/customers").set(auth(token));
    expect(res.status).toBe(200);
    expect(res.body.total).toBe(1); // the admin is not listed
    expect(res.body.items[0]).toMatchObject({ orderCount: 1, reviewCount: 0, totalSpentCents: 12000, disabledAt: null });
    expect(res.body.items[0]).not.toHaveProperty("passwordHash");

    const email = res.body.items[0].email as string;
    expect((await api().get(`/api/v1/admin/customers?q=${email.slice(0, 10)}`).set(auth(token))).body.total).toBe(1);
    expect((await api().get("/api/v1/admin/customers?q=nobody-here").set(auth(token))).body.total).toBe(0);

    const detail = await api().get(`/api/v1/admin/customers/${res.body.items[0].id}`).set(auth(token));
    expect(detail.body.orders).toHaveLength(1);
  });

  it("disables an account: no sign-in, existing sessions end, and it can be re-enabled", async () => {
    const { token } = await createAdmin();
    const { user, password } = await createUser();
    const session = (await api().post("/api/v1/auth/login").send({ email: user.email, password })).body.token as string;
    expect((await api().get("/api/v1/auth/me").set(auth(session))).status).toBe(200);

    const off = await api().patch(`/api/v1/admin/customers/${user.id}`).set(auth(token)).send({ disabled: true });
    expect(off.body.disabledAt).toBeTruthy();
    expect((await api().get("/api/v1/auth/me").set(auth(session))).status).toBe(401);
    expect((await api().get("/api/v1/cart").set(auth(session))).status).toBe(401);
    const blocked = await api().post("/api/v1/auth/login").send({ email: user.email, password });
    expect(blocked.status).toBe(403);
    expect(blocked.body.error.message).toMatch(/disabled/);
    // A wrong password still gets the generic answer, so the status of an account isn't revealed.
    expect((await api().post("/api/v1/auth/login").send({ email: user.email, password: "wrong-password" })).status).toBe(401);

    expect((await api().get("/api/v1/admin/customers?status=disabled").set(auth(token))).body.total).toBe(1);

    const on = await api().patch(`/api/v1/admin/customers/${user.id}`).set(auth(token)).send({ disabled: false });
    expect(on.body.disabledAt).toBeNull();
    expect((await api().post("/api/v1/auth/login").send({ email: user.email, password })).status).toBe(200);
  });

  it("cannot disable admins", async () => {
    const { user, token } = await createAdmin();
    expect((await api().patch(`/api/v1/admin/customers/${user.id}`).set(auth(token)).send({ disabled: true })).status).toBe(409);
  });
});

describe("admin reviews", () => {
  it("lists every review with its author and product, and deletes one, updating the rating", async () => {
    const { token } = await createAdmin();
    const p = await createProduct({ name: "Linen Shirt" });
    for (const [rating, comment] of [[1, "Spam spam buy cheap watches"], [5, "Lovely fabric"]] as const) {
      const c = await createCustomer();
      await api().post(`/api/v1/products/${p.id}/reviews`).set(auth(c.token)).send({ rating, comment });
    }
    expect((await prisma.product.findUniqueOrThrow({ where: { id: p.id } })).ratingCount).toBe(2);

    const list = await api().get("/api/v1/admin/reviews").set(auth(token));
    expect(list.body.total).toBe(2);
    expect(list.body.items[0]).toMatchObject({ product: { name: "Linen Shirt" }, author: { email: expect.any(String) } });
    const spam = await api().get("/api/v1/admin/reviews?q=watches").set(auth(token));
    expect(spam.body.total).toBe(1);
    expect((await api().get("/api/v1/admin/reviews?rating=5").set(auth(token))).body.total).toBe(1);

    expect((await api().delete(`/api/v1/admin/reviews/${spam.body.items[0].id}`).set(auth(token))).status).toBe(204);
    expect(await prisma.product.findUniqueOrThrow({ where: { id: p.id } })).toMatchObject({ ratingCount: 1, ratingAvg: 5 });
    expect((await api().delete(`/api/v1/admin/reviews/${spam.body.items[0].id}`).set(auth(token))).status).toBe(404);
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
    expect(res.body.lowStock).toEqual([expect.objectContaining({ productName: "Beta", size: "40", stock: 2 })]);
  });

  it("returns 501 for uploads when storage is not configured", async () => {
    const { token } = await createAdmin();
    const res = await api().post("/api/v1/admin/uploads/presign").set(auth(token)).send({ fileName: "a.jpg", contentType: "image/jpeg" });
    expect(res.status).toBe(501);
  });
});

describe("admin photo uploads", () => {
  // Smallest valid PNG header + some bytes; only the signature is checked.
  const png = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(64, 1)]);

  afterAll(() => rm(path.resolve(".test-uploads"), { recursive: true, force: true }));

  it("stores an image and serves it back", async () => {
    const { token } = await createAdmin();
    const res = await api().post("/api/v1/admin/uploads").set(auth(token)).set("Content-Type", "image/png").send(png);
    expect(res.status).toBe(201);
    expect(res.body.key).toMatch(/^\/api\/v1\/uploads\/products\/\d{4}-\d{2}\/[0-9a-f-]{36}\.png$/);

    const file = await api().get(res.body.key);
    expect(file.status).toBe(200);
    expect(file.headers["content-type"]).toBe("image/png");
    expect(file.headers["content-security-policy"]).toContain("sandbox");
    expect(Buffer.compare(file.body as Buffer, png)).toBe(0);

    // The returned key is accepted as a product image.
    const product = await api()
      .post("/api/v1/admin/products")
      .set(auth(token))
      .send({ name: "Uploaded Tee", description: "d", ...(await refs()), color: "White", priceCents: 1000, images: [res.body.key] });
    expect(product.status).toBe(201);
    expect(product.body.images).toEqual([res.body.key]);
  });

  it("rejects files that aren't really images, whatever their Content-Type says", async () => {
    const { token } = await createAdmin();
    const html = await api().post("/api/v1/admin/uploads").set(auth(token)).set("Content-Type", "image/jpeg").send(Buffer.from("<html><script>alert(1)</script>"));
    expect(html.status).toBe(400);
    const gif = await api().post("/api/v1/admin/uploads").set(auth(token)).set("Content-Type", "image/gif").send(Buffer.from("GIF89a"));
    expect(gif.status).toBe(400);
  });

  it("rejects files over 5 MB", async () => {
    const { token } = await createAdmin();
    const big = Buffer.concat([png, Buffer.alloc(5 * 1024 * 1024)]);
    const res = await api().post("/api/v1/admin/uploads").set(auth(token)).set("Content-Type", "image/png").send(big);
    expect(res.status).toBe(413);
  });

  it("is admin-only", async () => {
    const { token } = await createCustomer();
    const res = await api().post("/api/v1/admin/uploads").set(auth(token)).set("Content-Type", "image/png").send(png);
    expect(res.status).toBe(403);
  });
});
