import { AppError, badRequest, notFound } from "../../lib/errors.js";
import { prisma } from "../../lib/prisma.js";
import { imageUrl, stockStatus } from "../products/product.serializer.js";
import { describeShortages, shortageMessage } from "../products/stock.js";
import { MAX_LINE_QUANTITY } from "./cart.schemas.js";

const cartInclude = {
  variant: {
    include: {
      product: { select: { id: true, slug: true, name: true, priceCents: true, images: true, color: true, isActive: true, brand: { select: { name: true } } } },
    },
  },
} as const;

/**
 * Cart lines do not reserve stock; `available` is the live stock so the UI can
 * warn before checkout. The authoritative check happens at checkout.
 */
export async function getCart(userId: string) {
  const rows = await prisma.cartItem.findMany({ where: { userId }, include: cartInclude, orderBy: { createdAt: "asc" } });
  const items = rows.map((r) => {
    const p = r.variant.product;
    return {
      id: r.id,
      quantity: r.quantity,
      variant: { id: r.variant.id, size: r.variant.size, stock: r.variant.stock, stockStatus: stockStatus(r.variant.stock) },
      product: { id: p.id, slug: p.slug, name: p.name, brand: p.brand.name, color: p.color, priceCents: p.priceCents, image: p.images[0] ? imageUrl(p.images[0]) : null, isActive: p.isActive },
      lineTotalCents: p.priceCents * r.quantity,
      issue: !p.isActive ? "unavailable" : r.variant.stock === 0 ? "out_of_stock" : r.quantity > r.variant.stock ? "insufficient_stock" : null,
    };
  });
  return {
    items,
    itemCount: items.reduce((n, i) => n + i.quantity, 0),
    subtotalCents: items.reduce((n, i) => n + i.lineTotalCents, 0),
  };
}

async function loadSellableVariant(variantId: string) {
  const variant = await prisma.productVariant.findUnique({ where: { id: variantId }, include: { product: { select: { isActive: true } } } });
  if (!variant || !variant.product.isActive) throw notFound("Product size");
  return variant;
}

async function assertStock(variantId: string, stock: number, requested: number) {
  if (requested <= stock) return;
  const shortages = await describeShortages([{ variantId, requested }]);
  throw new AppError("OUT_OF_STOCK", shortageMessage(shortages), { items: shortages });
}

export async function addItem(userId: string, variantId: string, quantity: number) {
  const variant = await loadSellableVariant(variantId);
  const existing = await prisma.cartItem.findUnique({ where: { userId_variantId: { userId, variantId } } });
  const next = (existing?.quantity ?? 0) + quantity;
  if (next > MAX_LINE_QUANTITY) throw badRequest(`You can buy at most ${MAX_LINE_QUANTITY} of one size`);
  await assertStock(variantId, variant.stock, next);
  await prisma.cartItem.upsert({
    where: { userId_variantId: { userId, variantId } },
    create: { userId, variantId, quantity },
    update: { quantity: next },
  });
  return getCart(userId);
}

export async function updateItem(userId: string, itemId: string, quantity: number) {
  const item = await prisma.cartItem.findFirst({ where: { id: itemId, userId } });
  if (!item) throw notFound("Cart item");
  const variant = await loadSellableVariant(item.variantId);
  // Reducing quantity is always allowed so customers can fix an over-stock line.
  if (quantity > item.quantity) await assertStock(item.variantId, variant.stock, quantity);
  await prisma.cartItem.update({ where: { id: itemId }, data: { quantity } });
  return getCart(userId);
}

export async function removeItem(userId: string, itemId: string) {
  const { count } = await prisma.cartItem.deleteMany({ where: { id: itemId, userId } });
  if (!count) throw notFound("Cart item");
  return getCart(userId);
}

/** Merges a guest (localStorage) cart into the server cart, capping by stock and the line limit. */
export async function mergeCart(userId: string, items: Array<{ variantId: string; quantity: number }>) {
  const combined = new Map<string, number>();
  for (const i of items) combined.set(i.variantId, (combined.get(i.variantId) ?? 0) + i.quantity);

  const variants = await prisma.productVariant.findMany({
    where: { id: { in: [...combined.keys()] }, product: { isActive: true }, stock: { gt: 0 } },
    include: { cartItems: { where: { userId } } },
  });
  await prisma.$transaction(
    variants.map((v) => {
      const quantity = Math.min(MAX_LINE_QUANTITY, v.stock, (v.cartItems[0]?.quantity ?? 0) + combined.get(v.id)!);
      return prisma.cartItem.upsert({
        where: { userId_variantId: { userId, variantId: v.id } },
        create: { userId, variantId: v.id, quantity },
        update: { quantity },
      });
    }),
  );
  return getCart(userId);
}
