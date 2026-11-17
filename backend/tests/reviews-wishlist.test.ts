import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { prisma } from "../src/lib/prisma.js";
import { api, auth, createAdmin, createCustomer, createProduct, createUser, login, resetDb } from "./helpers.js";

beforeEach(resetDb);
afterAll(() => prisma.$disconnect());

const rating = async (productId: string) => prisma.product.findUniqueOrThrow({ where: { id: productId }, select: { ratingAvg: true, ratingCount: true } });

describe("reviews", () => {
  it("creates one review per customer and keeps the product rating in sync", async () => {
    const p = await createProduct();
    const a = await createCustomer();
    const b = await createCustomer();

    expect((await api().post(`/api/v1/products/${p.id}/reviews`).send({ rating: 5 })).status).toBe(401);
    const r1 = await api().post(`/api/v1/products/${p.id}/reviews`).set(auth(a.token)).send({ rating: 5, title: "Great", comment: "Love them" });
    expect(r1.status).toBe(201);
    expect(r1.body).toMatchObject({ rating: 5, title: "Great", verifiedPurchase: false, author: { name: "Test U." } });
    await api().post(`/api/v1/products/${p.id}/reviews`).set(auth(b.token)).send({ rating: 2 });
    expect(await rating(p.id)).toEqual({ ratingAvg: 3.5, ratingCount: 2 });

    const dup = await api().post(`/api/v1/products/${p.id}/reviews`).set(auth(a.token)).send({ rating: 1 });
    expect(dup.status).toBe(409);

    const upd = await api().patch(`/api/v1/reviews/${r1.body.id}`).set(auth(a.token)).send({ rating: 4 });
    expect(upd.body.rating).toBe(4);
    expect(await rating(p.id)).toEqual({ ratingAvg: 3, ratingCount: 2 });

    expect((await api().patch(`/api/v1/reviews/${r1.body.id}`).set(auth(b.token)).send({ rating: 1 })).status).toBe(403);
    expect((await api().delete(`/api/v1/reviews/${r1.body.id}`).set(auth(b.token))).status).toBe(403);
    expect((await api().delete(`/api/v1/reviews/${r1.body.id}`).set(auth(a.token))).status).toBe(204);
    expect(await rating(p.id)).toEqual({ ratingAvg: 2, ratingCount: 1 });
  });

  it("validates rating range", async () => {
    const p = await createProduct();
    const a = await createCustomer();
    for (const bad of [0, 6, 3.5]) {
      expect((await api().post(`/api/v1/products/${p.id}/reviews`).set(auth(a.token)).send({ rating: bad })).status).toBe(400);
    }
  });

  it("lists reviews newest first with distribution, verified purchases and my review", async () => {
    const p = await createProduct({ variants: [{ size: 42, stock: 5 }] });
    const buyer = await createCustomer();
    await api().post("/api/v1/cart/items").set(auth(buyer.token)).send({ variantId: p.variants[0]!.id });
    const { body } = await api().post("/api/v1/orders").set(auth(buyer.token)).send({ shippingAddress: { fullName: "A", line1: "1", city: "C", postalCode: "1", country: "US" } });
    await api().post(`/api/v1/orders/${body.order.id}/pay/mock`).set(auth(buyer.token));
    await api().post(`/api/v1/products/${p.id}/reviews`).set(auth(buyer.token)).send({ rating: 4 });
    const other = await createCustomer();
    await api().post(`/api/v1/products/${p.id}/reviews`).set(auth(other.token)).send({ rating: 1 });

    const list = await api().get(`/api/v1/products/${p.id}/reviews?pageSize=1`);
    expect(list.body).toMatchObject({ total: 2, totalPages: 2, distribution: { 1: 1, 2: 0, 3: 0, 4: 1, 5: 0 } });
    expect(list.body.items[0]).toMatchObject({ rating: 1, verifiedPurchase: false });
    const page2 = await api().get(`/api/v1/products/${p.id}/reviews?pageSize=1&page=2`);
    expect(page2.body.items[0]).toMatchObject({ rating: 4, verifiedPurchase: true });

    expect((await api().get(`/api/v1/products/${p.id}/reviews/mine`).set(auth(buyer.token))).body.review.rating).toBe(4);
    const nobody = await createCustomer();
    expect((await api().get(`/api/v1/products/${p.id}/reviews/mine`).set(auth(nobody.token))).body.review).toBeNull();
  });

  it("lets admins delete any review", async () => {
    const p = await createProduct();
    const a = await createCustomer();
    const admin = await createAdmin();
    const r = await api().post(`/api/v1/products/${p.id}/reviews`).set(auth(a.token)).send({ rating: 1, comment: "spam" });
    expect((await api().delete(`/api/v1/reviews/${r.body.id}`).set(auth(admin.token))).status).toBe(204);
    expect(await rating(p.id)).toEqual({ ratingAvg: 0, ratingCount: 0 });
  });

  it("keeps the aggregate correct under concurrent reviews", async () => {
    const p = await createProduct();
    const users = await Promise.all(
      Array.from({ length: 10 }, async (_, i) => {
        const { user, password } = await createUser({ email: `c${i}@t.dev` });
        return login(user.email, password);
      }),
    );
    await Promise.all(users.map((t, i) => api().post(`/api/v1/products/${p.id}/reviews`).set(auth(t)).send({ rating: (i % 5) + 1 })));
    expect(await rating(p.id)).toEqual({ ratingAvg: 3, ratingCount: 10 });
  });
});

describe("wishlist", () => {
  it("adds idempotently, lists product cards, exposes ids and removes", async () => {
    const p = await createProduct({ name: "Wish Item" });
    const q = await createProduct({ name: "Other Item" });
    const { token } = await createCustomer();
    expect((await api().get("/api/v1/wishlist")).status).toBe(401);

    expect((await api().post("/api/v1/wishlist").set(auth(token)).send({ productId: p.id })).status).toBe(201);
    expect((await api().post("/api/v1/wishlist").set(auth(token)).send({ productId: p.id })).status).toBe(201);
    await api().post("/api/v1/wishlist").set(auth(token)).send({ productId: q.id });

    const list = await api().get("/api/v1/wishlist").set(auth(token));
    expect(list.body.total).toBe(2);
    expect(list.body.items[0].product).toMatchObject({ name: "Other Item", priceCents: 10000 });

    const ids = await api().get("/api/v1/wishlist/ids").set(auth(token));
    expect(ids.body.productIds.sort()).toEqual([p.id, q.id].sort());

    expect((await api().delete(`/api/v1/wishlist/${p.id}`).set(auth(token))).status).toBe(204);
    expect((await api().get("/api/v1/wishlist/ids").set(auth(token))).body.productIds).toEqual([q.id]);
  });

  it("rejects unknown or inactive products and isolates users", async () => {
    const hidden = await createProduct({ isActive: false });
    const a = await createCustomer();
    const b = await createCustomer();
    expect((await api().post("/api/v1/wishlist").set(auth(a.token)).send({ productId: hidden.id })).status).toBe(404);
    const p = await createProduct();
    await api().post("/api/v1/wishlist").set(auth(a.token)).send({ productId: p.id });
    expect((await api().get("/api/v1/wishlist").set(auth(b.token))).body.total).toBe(0);
  });
});
