import { env } from "../../config/env.js";
import type { Prisma } from "../../generated/prisma/client.js";
import { compareSizes } from "../../lib/sizes.js";

export type StockStatus = "in_stock" | "low_stock" | "out_of_stock";

export const LOW_STOCK_THRESHOLD = 5;

export const stockStatus = (stock: number): StockStatus =>
  stock <= 0 ? "out_of_stock" : stock < LOW_STOCK_THRESHOLD ? "low_stock" : "in_stock";

/** Images are stored either as absolute URLs or as object keys on the CDN. */
export const imageUrl = (img: string) => (/^https?:\/\//.test(img) ? img : `${env.CDN_BASE_URL.replace(/\/$/, "")}/${img.replace(/^\//, "")}`);

export const productCardInclude = {
  brand: { select: { id: true, name: true, slug: true } },
  category: { select: { id: true, name: true, slug: true } },
  variants: { select: { id: true, size: true, stock: true } },
} satisfies Prisma.ProductInclude;

type ProductWithCard = Prisma.ProductGetPayload<{ include: typeof productCardInclude }>;

/** Size labels don't sort correctly as text ("L" < "M" < "S"), so order them in code. */
export const bySize = <T extends { size: string }>(variants: T[]) => [...variants].sort((a, b) => compareSizes(a.size, b.size));

export const serializeVariant = (v: { id: string; size: string; stock: number }) => ({
  id: v.id,
  size: v.size,
  stock: v.stock,
  stockStatus: stockStatus(v.stock),
});

/** Other colors of the same item, shown as dots on product cards. */
export interface Swatch {
  slug: string;
  color: string;
  colorway: string | null;
}

export const serializeProductCard = (p: ProductWithCard, swatches: Swatch[] = []) => {
  const sorted = bySize(p.variants);
  const availableSizes = sorted.filter((v) => v.stock > 0).map((v) => v.size);
  return {
    id: p.id,
    slug: p.slug,
    name: p.name,
    color: p.color,
    colorway: p.colorway,
    gender: p.gender,
    styleGroup: p.styleGroup,
    priceCents: p.priceCents,
    image: p.images[0] ? imageUrl(p.images[0]) : null,
    brand: p.brand,
    category: p.category,
    ratingAvg: Math.round(p.ratingAvg * 10) / 10,
    ratingCount: p.ratingCount,
    availableSizes,
    // Lets cards offer "quick add" without loading the product page.
    sizes: sorted.map((v) => ({ variantId: v.id, size: v.size, stock: v.stock })),
    swatches,
    inStock: availableSizes.length > 0,
    isActive: p.isActive,
    createdAt: p.createdAt,
  };
};

export interface ColorwayLink {
  slug: string;
  colorway: string | null;
  color: string;
  image: string | null;
  inStock: boolean;
}

export const serializeProductDetail = (p: ProductWithCard, colorways: ColorwayLink[] = []) => ({
  ...serializeProductCard(p),
  description: p.description,
  images: p.images.map(imageUrl),
  imageCredit: p.imageCredit,
  imageSourceUrl: p.imageSourceUrl,
  variants: bySize(p.variants).map(serializeVariant),
  colorways,
});
