import { env } from "../../config/env.js";
import type { Prisma } from "../../generated/prisma/client.js";

export type StockStatus = "in_stock" | "low_stock" | "out_of_stock";

export const LOW_STOCK_THRESHOLD = 5;

export const stockStatus = (stock: number): StockStatus =>
  stock <= 0 ? "out_of_stock" : stock < LOW_STOCK_THRESHOLD ? "low_stock" : "in_stock";

/** Images are stored either as absolute URLs or as object keys on the CDN. */
export const imageUrl = (img: string) => (/^https?:\/\//.test(img) ? img : `${env.CDN_BASE_URL.replace(/\/$/, "")}/${img.replace(/^\//, "")}`);

export const toNumber = (d: Prisma.Decimal | number) => (typeof d === "number" ? d : d.toNumber());

export const productCardInclude = {
  brand: { select: { id: true, name: true, slug: true } },
  category: { select: { id: true, name: true, slug: true } },
  variants: { select: { id: true, size: true, stock: true }, orderBy: { size: "asc" } },
} satisfies Prisma.ProductInclude;

type ProductWithCard = Prisma.ProductGetPayload<{ include: typeof productCardInclude }>;

export const serializeVariant = (v: { id: string; size: Prisma.Decimal; stock: number }) => ({
  id: v.id,
  size: toNumber(v.size),
  stock: v.stock,
  stockStatus: stockStatus(v.stock),
});

export const serializeProductCard = (p: ProductWithCard) => {
  const availableSizes = p.variants.filter((v) => v.stock > 0).map((v) => toNumber(v.size));
  return {
    id: p.id,
    slug: p.slug,
    name: p.name,
    color: p.color,
    priceCents: p.priceCents,
    image: p.images[0] ? imageUrl(p.images[0]) : null,
    brand: p.brand,
    category: p.category,
    ratingAvg: Math.round(p.ratingAvg * 10) / 10,
    ratingCount: p.ratingCount,
    availableSizes,
    inStock: availableSizes.length > 0,
    isActive: p.isActive,
    createdAt: p.createdAt,
  };
};

export const serializeProductDetail = (p: ProductWithCard) => ({
  ...serializeProductCard(p),
  description: p.description,
  images: p.images.map(imageUrl),
  variants: p.variants.map(serializeVariant),
});
