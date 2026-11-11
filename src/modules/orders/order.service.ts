import { env } from "../../config/env.js";
import { AppError, badRequest, conflict, notFound } from "../../lib/errors.js";
import { logger } from "../../lib/logger.js";
import { skipTake, toPage } from "../../lib/pagination.js";
import { prisma, type Tx } from "../../lib/prisma.js";
import { describeShortages, shortageMessage } from "../products/stock.js";
import type { ShippingAddress } from "./order.schemas.js";
import { orderInclude, serializeOrder } from "./order.serializer.js";

class InsufficientStock extends Error {
  constructor(readonly lines: Array<{ variantId: string; requested: number }>) {
    super("Insufficient stock");
  }
}

export const shippingFor = (subtotalCents: number) =>
  subtotalCents >= env.FREE_SHIPPING_THRESHOLD_CENTS ? 0 : env.SHIPPING_FLAT_CENTS;

/**
 * Checkout confirmation. Everything happens in one transaction:
 *  1. read the cart and current prices,
 *  2. for each line run ONE conditional UPDATE that decrements stock only if
 *     enough is left (`stock >= qty`, i.e. `stock > 0` for a single pair),
 *  3. create the order with price snapshots and clear the cart.
 * If any UPDATE matches 0 rows the transaction is rolled back, so stock is
 * never partially decremented. Row locks taken by the UPDATE serialise
 * concurrent buyers of the same size; PostgreSQL re-checks the WHERE clause
 * after the lock is released, so the second buyer of the last pair matches
 * 0 rows. CHECK (stock >= 0) backs this up at the schema level.
 */
export async function checkout(userId: string, address: ShippingAddress) {
  try {
    const order = await prisma.$transaction(
      async (tx) => {
        const cart = await tx.cartItem.findMany({
          where: { userId },
          include: { variant: { include: { product: { select: { id: true, name: true, priceCents: true, isActive: true } } } } },
          // A consistent lock order prevents deadlocks between overlapping carts.
          orderBy: { variantId: "asc" },
        });
        if (cart.length === 0) throw badRequest("Your cart is empty");
        const inactive = cart.filter((c) => !c.variant.product.isActive);
        if (inactive.length) {
          throw conflict(`${inactive.map((c) => c.variant.product.name).join(", ")} is no longer available. Remove it from your cart to continue.`);
        }

        const short: Array<{ variantId: string; requested: number }> = [];
        for (const line of cart) {
          const updated = await tx.$executeRaw`
            UPDATE "ProductVariant"
            SET "stock" = "stock" - ${line.quantity}, "updatedAt" = now()
            WHERE "id" = ${line.variantId}::uuid AND "stock" >= ${line.quantity}`;
          if (updated === 0) short.push({ variantId: line.variantId, requested: line.quantity });
        }
        if (short.length) throw new InsufficientStock(short);

        const subtotalCents = cart.reduce((n, c) => n + c.variant.product.priceCents * c.quantity, 0);
        const shippingCents = shippingFor(subtotalCents);
        const created = await tx.order.create({
          data: {
            userId,
            subtotalCents,
            shippingCents,
            totalCents: subtotalCents + shippingCents,
            shipFullName: address.fullName,
            shipLine1: address.line1,
            shipLine2: address.line2,
            shipCity: address.city,
            shipPostalCode: address.postalCode,
            shipCountry: address.country,
            shipPhone: address.phone,
            items: {
              create: cart.map((c) => ({
                variantId: c.variantId,
                productId: c.variant.product.id,
                productName: c.variant.product.name,
                size: c.variant.size,
                unitPriceCents: c.variant.product.priceCents,
                quantity: c.quantity,
              })),
            },
          },
          include: orderInclude,
        });
        await tx.cartItem.deleteMany({ where: { userId } });
        return created;
      },
      { maxWait: 10_000, timeout: 15_000 },
    );
    return serializeOrder(order);
  } catch (err) {
    if (err instanceof InsufficientStock) {
      const shortages = await describeShortages(err.lines);
      throw new AppError("OUT_OF_STOCK", shortageMessage(shortages), { items: shortages });
    }
    throw err;
  }
}

/**
 * A customer's order history: only orders they actually paid for (refunded
 * ones stay visible as a record). Unpaid checkouts that were abandoned or are
 * still awaiting payment are not purchases, so they are left out; they stay
 * reachable by id from the payment page and expire on their own.
 */
export async function listOrders(userId: string, page: number, pageSize: number) {
  const where = { userId, paymentStatus: { in: ["PAID", "REFUNDED"] as ("PAID" | "REFUNDED")[] } };
  const [total, rows] = await prisma.$transaction([
    prisma.order.count({ where }),
    prisma.order.findMany({ where, include: orderInclude, orderBy: { createdAt: "desc" }, ...skipTake(page, pageSize) }),
  ]);
  return toPage(rows.map(serializeOrder), total, page, pageSize);
}

export async function getOrderRecord(orderId: string, userId?: string) {
  const order = await prisma.order.findFirst({ where: { id: orderId, ...(userId ? { userId } : {}) }, include: orderInclude });
  if (!order) throw notFound("Order");
  return order;
}

export async function getOrder(orderId: string, userId?: string) {
  return serializeOrder(await getOrderRecord(orderId, userId));
}

/**
 * Cancels a PENDING + UNPAID order and returns its stock. The conditional
 * UPDATE makes this idempotent and safe against a concurrent payment or sweep:
 * only one caller can flip the status, and only that caller restocks.
 */
export async function cancelUnpaidOrder(tx: Tx, orderId: string) {
  const flipped = await tx.$executeRaw`
    UPDATE "Order" SET "status" = 'CANCELLED', "cancelledAt" = now(), "updatedAt" = now()
    WHERE "id" = ${orderId}::uuid AND "status" = 'PENDING' AND "paymentStatus" = 'UNPAID'`;
  if (flipped === 0) return false;
  const items = await tx.orderItem.findMany({ where: { orderId }, orderBy: { variantId: "asc" } });
  for (const item of items) {
    await tx.$executeRaw`
      UPDATE "ProductVariant" SET "stock" = "stock" + ${item.quantity}, "updatedAt" = now()
      WHERE "id" = ${item.variantId}::uuid`;
  }
  return true;
}

export async function cancelOrder(userId: string, orderId: string) {
  await getOrderRecord(orderId, userId);
  const cancelled = await prisma.$transaction((tx) => cancelUnpaidOrder(tx, orderId));
  if (!cancelled) throw conflict("Only unpaid pending orders can be cancelled");
  return getOrder(orderId, userId);
}

/** Marks an order paid exactly once. Returns false if it was not PENDING + UNPAID. */
export async function markOrderPaid(orderId: string) {
  const updated = await prisma.$executeRaw`
    UPDATE "Order" SET "paymentStatus" = 'PAID', "paidAt" = now(), "updatedAt" = now()
    WHERE "id" = ${orderId}::uuid AND "status" = 'PENDING' AND "paymentStatus" = 'UNPAID'`;
  return updated > 0;
}

/**
 * Releases stock held by orders that were never paid. Safe to run on every
 * API instance concurrently because each cancellation is a conditional update.
 */
export async function expireUnpaidOrders(olderThanMinutes = env.ORDER_PAYMENT_TIMEOUT_MINUTES, onExpire?: (orderId: string) => Promise<void>) {
  const cutoff = new Date(Date.now() - olderThanMinutes * 60_000);
  const stale = await prisma.order.findMany({
    where: { status: "PENDING", paymentStatus: "UNPAID", createdAt: { lt: cutoff } },
    select: { id: true },
    take: 100,
  });
  let expired = 0;
  for (const { id } of stale) {
    if (await prisma.$transaction((tx) => cancelUnpaidOrder(tx, id))) {
      expired++;
      await onExpire?.(id).catch((err) => logger.warn({ err, orderId: id }, "post-expiry hook failed"));
    }
  }
  if (expired) logger.info({ expired }, "Expired unpaid orders");
  return expired;
}
