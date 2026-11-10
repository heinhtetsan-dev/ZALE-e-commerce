import type { Prisma } from "../../generated/prisma/client.js";
import { imageUrl, toNumber } from "../products/product.serializer.js";

export const orderInclude = {
  items: { include: { product: { select: { slug: true, images: true } } }, orderBy: { productName: "asc" } },
} satisfies Prisma.OrderInclude;

type OrderWithItems = Prisma.OrderGetPayload<{ include: typeof orderInclude }>;

export const serializeOrder = (o: OrderWithItems) => ({
  id: o.id,
  number: o.id.slice(0, 8).toUpperCase(),
  status: o.status,
  paymentStatus: o.paymentStatus,
  subtotalCents: o.subtotalCents,
  shippingCents: o.shippingCents,
  totalCents: o.totalCents,
  shippingAddress: {
    fullName: o.shipFullName,
    line1: o.shipLine1,
    line2: o.shipLine2,
    city: o.shipCity,
    postalCode: o.shipPostalCode,
    country: o.shipCountry,
    phone: o.shipPhone,
  },
  items: o.items.map((i) => ({
    id: i.id,
    productId: i.productId,
    variantId: i.variantId,
    productName: i.productName,
    productSlug: i.product.slug,
    image: i.product.images[0] ? imageUrl(i.product.images[0]) : null,
    size: toNumber(i.size),
    unitPriceCents: i.unitPriceCents,
    quantity: i.quantity,
    lineTotalCents: i.unitPriceCents * i.quantity,
  })),
  itemCount: o.items.reduce((n, i) => n + i.quantity, 0),
  createdAt: o.createdAt,
  paidAt: o.paidAt,
  shippedAt: o.shippedAt,
  deliveredAt: o.deliveredAt,
  cancelledAt: o.cancelledAt,
});

export type SerializedOrder = ReturnType<typeof serializeOrder>;
