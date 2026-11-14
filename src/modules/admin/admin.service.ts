import { randomUUID } from "node:crypto";
import { env } from "../../config/env.js";
import { Prisma } from "../../generated/prisma/client.js";
import { AppError, conflict, notFound } from "../../lib/errors.js";
import { skipTake, toPage } from "../../lib/pagination.js";
import { logger } from "../../lib/logger.js";
import { prisma } from "../../lib/prisma.js";
import { orderInclude, serializeOrder } from "../orders/order.serializer.js";
import { cancelUnpaidOrder, restockOrder } from "../orders/order.service.js";
import { refundPayment, voidPaymentIntent } from "../payments/payment.service.js";
import { imageUrl, productCardInclude, serializeProductDetail } from "../products/product.serializer.js";
import type { z } from "zod";
import type { adminOrderQuery, adminProductQuery, adminReviewQuery, customerQuery, productBody, productUpdateBody, variantsBody } from "./admin.schemas.js";

const slugify = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 120);

// ---------------------------------------------------------------- products

export async function listAdminProducts(q: z.infer<typeof adminProductQuery>) {
  const where: Prisma.ProductWhereInput = {
    ...(q.includeInactive ? {} : { isActive: true }),
    ...(q.q
      ? { OR: [{ name: { contains: q.q, mode: "insensitive" } }, { slug: { contains: q.q, mode: "insensitive" } }, { brand: { name: { contains: q.q, mode: "insensitive" } } }] }
      : {}),
  };
  const [total, rows] = await prisma.$transaction([
    prisma.product.count({ where }),
    prisma.product.findMany({ where, include: productCardInclude, orderBy: [{ createdAt: "desc" }, { id: "asc" }], ...skipTake(q.page, q.pageSize) }),
  ]);
  const items = rows.map((p) => ({ ...serializeProductDetail(p), totalStock: p.variants.reduce((n, v) => n + v.stock, 0) }));
  return toPage(items, total, q.page, q.pageSize);
}

export async function getAdminProduct(id: string) {
  const p = await prisma.product.findUnique({ where: { id }, include: productCardInclude });
  if (!p) throw notFound("Product");
  // Admins edit the stored references (keys or URLs), not the resolved CDN URLs.
  return { ...serializeProductDetail(p), imageRefs: p.images, brandId: p.brandId, categoryId: p.categoryId };
}

async function assertRefs(brandId?: string, categoryId?: string) {
  if (brandId && !(await prisma.brand.findUnique({ where: { id: brandId } }))) throw new AppError("VALIDATION_ERROR", "Unknown brand", [{ path: "brandId", message: "Unknown brand" }]);
  if (categoryId && !(await prisma.category.findUnique({ where: { id: categoryId } })))
    throw new AppError("VALIDATION_ERROR", "Unknown category", [{ path: "categoryId", message: "Unknown category" }]);
}

const slugTaken = (err: unknown) => err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002";

export async function createProduct(input: z.infer<typeof productBody>) {
  await assertRefs(input.brandId, input.categoryId);
  const slug = input.slug ?? slugify(input.name);
  try {
    const p = await prisma.product.create({ data: { ...input, slug } });
    return getAdminProduct(p.id);
  } catch (err) {
    if (slugTaken(err)) throw new AppError("CONFLICT", "Slug already in use", [{ path: "slug", message: "This slug is already used by another product" }]);
    throw err;
  }
}

export async function updateProduct(id: string, input: z.infer<typeof productUpdateBody>) {
  await assertRefs(input.brandId, input.categoryId);
  try {
    await prisma.product.update({ where: { id }, data: input });
  } catch (err) {
    if (slugTaken(err)) throw new AppError("CONFLICT", "Slug already in use", [{ path: "slug", message: "This slug is already used by another product" }]);
    throw err;
  }
  return getAdminProduct(id);
}

/** Hard delete when never ordered; otherwise deactivate so order history stays intact. */
export async function deleteProduct(id: string) {
  const p = await prisma.product.findUnique({ where: { id }, select: { id: true, _count: { select: { orderItems: true } } } });
  if (!p) throw notFound("Product");
  if (p._count.orderItems > 0) {
    await prisma.product.update({ where: { id }, data: { isActive: false } });
    return { deleted: false, deactivated: true };
  }
  await prisma.product.delete({ where: { id } });
  return { deleted: true, deactivated: false };
}

/**
 * Sets absolute stock per size. Sizes not listed are removed, unless they were
 * ever ordered, in which case their stock is set to 0 to keep order history.
 */
export async function replaceVariants(productId: string, input: z.infer<typeof variantsBody>) {
  const product = await prisma.product.findUnique({ where: { id: productId }, include: { variants: { include: { _count: { select: { orderItems: true } } } } } });
  if (!product) throw notFound("Product");
  // Keyed case-insensitively so "m" updates the existing "M" instead of adding a duplicate.
  const wanted = new Map(input.variants.map((v) => [v.size.toUpperCase(), v]));

  await prisma.$transaction(async (tx) => {
    for (const existing of product.variants) {
      const match = wanted.get(existing.size.toUpperCase());
      if (match) {
        await tx.productVariant.update({ where: { id: existing.id }, data: { stock: match.stock, size: match.size } });
        wanted.delete(existing.size.toUpperCase());
      } else if (existing._count.orderItems > 0) {
        await tx.productVariant.update({ where: { id: existing.id }, data: { stock: 0 } });
      } else {
        await tx.productVariant.delete({ where: { id: existing.id } });
      }
    }
    for (const { size, stock } of wanted.values()) await tx.productVariant.create({ data: { productId, size, stock } });
  });
  return getAdminProduct(productId);
}

export async function setVariantStock(variantId: string, stock: number) {
  const v = await prisma.productVariant.update({ where: { id: variantId }, data: { stock } }).catch(() => {
    throw notFound("Variant");
  });
  return { id: v.id, size: v.size, stock: v.stock };
}

// ---------------------------------------------------------------- orders

const customerSelect = { user: { select: { id: true, name: true, email: true } } } as const;

export async function listAdminOrders(q: z.infer<typeof adminOrderQuery>) {
  const where: Prisma.OrderWhereInput = {
    ...(q.status ? { status: q.status } : {}),
    ...(q.q
      ? {
          OR: [
            { user: { email: { contains: q.q, mode: "insensitive" } } },
            { user: { name: { contains: q.q, mode: "insensitive" } } },
            { shipFullName: { contains: q.q, mode: "insensitive" } },
          ],
        }
      : {}),
  };
  const [total, rows] = await prisma.$transaction([
    prisma.order.count({ where }),
    prisma.order.findMany({ where, include: { ...orderInclude, ...customerSelect }, orderBy: [{ createdAt: "desc" }, { id: "asc" }], ...skipTake(q.page, q.pageSize) }),
  ]);
  return toPage(
    rows.map((o) => ({ ...serializeOrder(o), customer: o.user })),
    total,
    q.page,
    q.pageSize,
  );
}

const nextStatus = { PENDING: "SHIPPED", SHIPPED: "DELIVERED" } as const;

/** Forward-only, one step at a time; shipping requires a paid order. Guarded against concurrent updates. */
export async function updateOrderStatus(orderId: string, status: "SHIPPED" | "DELIVERED") {
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) throw notFound("Order");
  const expectedFrom = status === "SHIPPED" ? "PENDING" : "SHIPPED";
  if (nextStatus[order.status as keyof typeof nextStatus] !== status) {
    throw conflict(`Cannot change status from ${order.status} to ${status}`);
  }
  if (status === "SHIPPED" && order.paymentStatus !== "PAID") throw conflict("Only paid orders can be shipped");

  const { count } = await prisma.order.updateMany({
    where: { id: orderId, status: expectedFrom, ...(status === "SHIPPED" ? { paymentStatus: "PAID" } : {}) },
    data: status === "SHIPPED" ? { status, shippedAt: new Date() } : { status, deliveredAt: new Date() },
  });
  if (!count) throw conflict("The order was changed by someone else. Refresh and try again.");
  const updated = await prisma.order.findUniqueOrThrow({ where: { id: orderId }, include: { ...orderInclude, ...customerSelect } });
  return { ...serializeOrder(updated), customer: updated.user };
}

async function adminOrder(orderId: string) {
  const o = await prisma.order.findUniqueOrThrow({ where: { id: orderId }, include: { ...orderInclude, ...customerSelect } });
  return { ...serializeOrder(o), customer: o.user };
}

const changedConcurrently = () => conflict("The order was changed by someone else. Refresh and try again.");

/**
 * Cancels an order that has not shipped. Stock goes back on the shelf; a paid
 * order is refunded in full. The state flip, restock and refund share one
 * transaction: the conditional UPDATE locks the order row (so it can't be
 * shipped meanwhile), and if the provider refuses the refund nothing changes.
 */
export async function cancelOrderAsAdmin(orderId: string) {
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) throw notFound("Order");
  if (order.status !== "PENDING") {
    throw conflict(order.status === "CANCELLED" ? "This order is already cancelled" : "Shipped orders cannot be cancelled. Refund the order instead.");
  }

  if (order.paymentStatus === "UNPAID") {
    if (!(await prisma.$transaction((tx) => cancelUnpaidOrder(tx, orderId)))) throw changedConcurrently();
    await voidPaymentIntent(orderId).catch((err) => logger.warn({ err, orderId }, "Could not void the payment intent"));
    return adminOrder(orderId);
  }

  await prisma.$transaction(
    async (tx) => {
      const flipped = await tx.$executeRaw`
        UPDATE "Order" SET "status" = 'CANCELLED', "paymentStatus" = 'REFUNDED', "cancelledAt" = now(), "refundedAt" = now(), "updatedAt" = now()
        WHERE "id" = ${orderId}::uuid AND "status" = 'PENDING' AND "paymentStatus" = 'PAID'`;
      if (flipped === 0) throw changedConcurrently();
      await restockOrder(tx, orderId);
      await refundPayment(order);
    },
    { maxWait: 10_000, timeout: 30_000 },
  );
  return adminOrder(orderId);
}

/**
 * Refunds a paid order after it has shipped (e.g. a return). The order keeps
 * its shipping status; `restock` puts the items back when they came back
 * in sellable condition.
 */
export async function refundOrderAsAdmin(orderId: string, restock: boolean) {
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) throw notFound("Order");
  if (order.paymentStatus !== "PAID") throw conflict(order.paymentStatus === "REFUNDED" ? "This order is already refunded" : "Only paid orders can be refunded");
  if (order.status === "PENDING") throw conflict("This order has not shipped yet. Cancel it instead, which also refunds it.");

  await prisma.$transaction(
    async (tx) => {
      const flipped = await tx.$executeRaw`
        UPDATE "Order" SET "paymentStatus" = 'REFUNDED', "refundedAt" = now(), "updatedAt" = now()
        WHERE "id" = ${orderId}::uuid AND "paymentStatus" = 'PAID' AND "status" IN ('SHIPPED', 'DELIVERED')`;
      if (flipped === 0) throw changedConcurrently();
      if (restock) await restockOrder(tx, orderId);
      await refundPayment(order);
    },
    { maxWait: 10_000, timeout: 30_000 },
  );
  return adminOrder(orderId);
}

// ---------------------------------------------------------------- customers

const purchased = { paymentStatus: { in: ["PAID", "REFUNDED"] as ("PAID" | "REFUNDED")[] } };

export async function listCustomers(q: z.infer<typeof customerQuery>) {
  const where: Prisma.UserWhereInput = {
    role: "CUSTOMER",
    ...(q.status === "active" ? { disabledAt: null } : q.status === "disabled" ? { disabledAt: { not: null } } : {}),
    ...(q.q ? { OR: [{ email: { contains: q.q, mode: "insensitive" } }, { name: { contains: q.q, mode: "insensitive" } }] } : {}),
  };
  const [total, rows] = await prisma.$transaction([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      select: { id: true, name: true, email: true, createdAt: true, disabledAt: true, _count: { select: { orders: { where: purchased }, reviews: true } } },
      orderBy: [{ createdAt: "desc" }, { id: "asc" }],
      ...skipTake(q.page, q.pageSize),
    }),
  ]);
  const spent = await prisma.order.groupBy({ by: ["userId"], where: { userId: { in: rows.map((r) => r.id) }, paymentStatus: "PAID" }, _sum: { totalCents: true } });
  const spentBy = new Map(spent.map((s) => [s.userId, s._sum.totalCents ?? 0]));
  const items = rows.map(({ _count, ...u }) => ({ ...u, orderCount: _count.orders, reviewCount: _count.reviews, totalSpentCents: spentBy.get(u.id) ?? 0 }));
  return toPage(items, total, q.page, q.pageSize);
}

export async function getCustomer(id: string) {
  const user = await prisma.user.findFirst({
    where: { id, role: "CUSTOMER" },
    select: {
      id: true,
      name: true,
      email: true,
      createdAt: true,
      disabledAt: true,
      orders: { include: orderInclude, orderBy: { createdAt: "desc" }, take: 20 },
      reviews: { include: { product: { select: { id: true, name: true, slug: true } } }, orderBy: { createdAt: "desc" }, take: 20 },
    },
  });
  if (!user) throw notFound("Customer");
  const { orders, reviews, ...profile } = user;
  return {
    ...profile,
    orders: orders.map(serializeOrder),
    reviews: reviews.map((r) => ({ id: r.id, rating: r.rating, title: r.title, comment: r.comment, createdAt: r.createdAt, product: r.product })),
  };
}

/** Disabling blocks sign-in and ends existing sessions on their next request (see `authenticate`). Admin accounts are managed separately. */
export async function setCustomerDisabled(id: string, disabled: boolean) {
  const user = await prisma.user.findUnique({ where: { id }, select: { role: true, disabledAt: true } });
  if (!user) throw notFound("Customer");
  if (user.role !== "CUSTOMER") throw conflict("Admin accounts cannot be disabled here");
  await prisma.user.update({ where: { id }, data: { disabledAt: disabled ? (user.disabledAt ?? new Date()) : null } });
  return getCustomer(id);
}

// ---------------------------------------------------------------- reviews

export async function listAdminReviews(q: z.infer<typeof adminReviewQuery>) {
  const where: Prisma.ReviewWhereInput = {
    ...(q.rating ? { rating: q.rating } : {}),
    ...(q.q
      ? {
          OR: [
            { title: { contains: q.q, mode: "insensitive" } },
            { comment: { contains: q.q, mode: "insensitive" } },
            { product: { name: { contains: q.q, mode: "insensitive" } } },
            { user: { email: { contains: q.q, mode: "insensitive" } } },
            { user: { name: { contains: q.q, mode: "insensitive" } } },
          ],
        }
      : {}),
  };
  const [total, rows] = await prisma.$transaction([
    prisma.review.count({ where }),
    prisma.review.findMany({
      where,
      include: { product: { select: { id: true, name: true, slug: true } }, user: { select: { id: true, name: true, email: true } } },
      orderBy: [{ createdAt: "desc" }, { id: "asc" }],
      ...skipTake(q.page, q.pageSize),
    }),
  ]);
  const items = rows.map((r) => ({ id: r.id, rating: r.rating, title: r.title, comment: r.comment, createdAt: r.createdAt, product: r.product, author: r.user }));
  return toPage(items, total, q.page, q.pageSize);
}

// ---------------------------------------------------------------- dashboard

export async function salesSummary(from: Date, to: Date) {
  const paidInRange = { paymentStatus: "PAID" as const, paidAt: { gte: from, lte: to } };
  const [revenue, byStatus, daily, topProducts, lowStock, pendingToShip] = await Promise.all([
    prisma.order.aggregate({ where: paidInRange, _sum: { totalCents: true }, _count: { _all: true } }),
    prisma.order.groupBy({ by: ["status"], where: { createdAt: { gte: from, lte: to } }, _count: { _all: true } }),
    prisma.$queryRaw<Array<{ day: Date; revenue: bigint; orders: bigint }>>`
      SELECT date_trunc('day', "paidAt") AS day, SUM("totalCents")::bigint AS revenue, COUNT(*)::bigint AS orders
      FROM "Order"
      WHERE "paymentStatus" = 'PAID' AND "paidAt" BETWEEN ${from} AND ${to}
      GROUP BY 1 ORDER BY 1`,
    prisma.$queryRaw<Array<{ productId: string; name: string; units: bigint; revenue: bigint }>>`
      SELECT oi."productId", oi."productName" AS name, SUM(oi.quantity)::bigint AS units, SUM(oi.quantity * oi."unitPriceCents")::bigint AS revenue
      FROM "OrderItem" oi JOIN "Order" o ON o.id = oi."orderId"
      WHERE o."paymentStatus" = 'PAID' AND o."paidAt" BETWEEN ${from} AND ${to}
      GROUP BY oi."productId", oi."productName"
      ORDER BY units DESC, revenue DESC
      LIMIT 5`,
    prisma.productVariant.findMany({
      where: { stock: { lte: 3 }, product: { isActive: true } },
      include: { product: { select: { id: true, name: true, images: true } } },
      orderBy: [{ stock: "asc" }, { product: { name: "asc" } }],
      take: 10,
    }),
    prisma.order.count({ where: { status: "PENDING", paymentStatus: "PAID" } }),
  ]);

  const paidOrders = revenue._count._all;
  const revenueCents = revenue._sum.totalCents ?? 0;
  return {
    range: { from, to },
    revenueCents,
    paidOrders,
    averageOrderCents: paidOrders ? Math.round(revenueCents / paidOrders) : 0,
    awaitingShipment: pendingToShip,
    ordersByStatus: Object.fromEntries(["PENDING", "SHIPPED", "DELIVERED", "CANCELLED"].map((s) => [s, byStatus.find((b) => b.status === s)?._count._all ?? 0])),
    revenueByDay: daily.map((d) => ({ date: d.day.toISOString().slice(0, 10), revenueCents: Number(d.revenue), orders: Number(d.orders) })),
    topProducts: topProducts.map((t) => ({ productId: t.productId, name: t.name, units: Number(t.units), revenueCents: Number(t.revenue) })),
    lowStock: lowStock.map((v) => ({
      variantId: v.id,
      productId: v.product.id,
      productName: v.product.name,
      image: v.product.images[0] ? imageUrl(v.product.images[0]) : null,
      size: v.size,
      stock: v.stock,
    })),
  };
}

// ---------------------------------------------------------------- uploads

export async function presignUpload(fileName: string, contentType: string) {
  if (!env.S3_BUCKET || !env.S3_REGION) throw new AppError("NOT_IMPLEMENTED", "Image storage is not configured. Paste image URLs instead.");
  const { S3Client, PutObjectCommand } = await import("@aws-sdk/client-s3");
  const { getSignedUrl } = await import("@aws-sdk/s3-request-presigner");
  const client = new S3Client({
    region: env.S3_REGION,
    endpoint: env.S3_ENDPOINT,
    credentials: env.S3_ACCESS_KEY_ID && env.S3_SECRET_ACCESS_KEY ? { accessKeyId: env.S3_ACCESS_KEY_ID, secretAccessKey: env.S3_SECRET_ACCESS_KEY } : undefined,
  });
  const ext = fileName.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
  const key = `products/${new Date().toISOString().slice(0, 7)}/${randomUUID()}.${ext}`;
  const uploadUrl = await getSignedUrl(client, new PutObjectCommand({ Bucket: env.S3_BUCKET, Key: key, ContentType: contentType, CacheControl: "public, max-age=31536000, immutable" }), {
    expiresIn: 300,
  });
  return { uploadUrl, key, publicUrl: imageUrl(key) };
}
