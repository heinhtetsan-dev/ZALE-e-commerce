import type { Gender, Prisma } from "../../generated/prisma/client.js";
import { notFound } from "../../lib/errors.js";
import { skipTake, toPage } from "../../lib/pagination.js";
import { prisma } from "../../lib/prisma.js";
import type { ProductListQuery } from "./product.schemas.js";
import { compareSizes } from "../../lib/sizes.js";
import { imageUrl, productCardInclude, serializeProductCard, serializeProductDetail } from "./product.serializer.js";

const orderBy = (sort: ProductListQuery["sort"]): Prisma.ProductOrderByWithRelationInput[] => {
  // `id` as a tiebreaker keeps pagination stable when the primary key ties.
  switch (sort) {
    case "price_asc":
      return [{ priceCents: "asc" }, { id: "asc" }];
    case "price_desc":
      return [{ priceCents: "desc" }, { id: "asc" }];
    case "rating":
      return [{ ratingAvg: "desc" }, { ratingCount: "desc" }, { id: "asc" }];
    case "name":
      return [{ name: "asc" }, { id: "asc" }];
    default:
      return [{ createdAt: "desc" }, { id: "asc" }];
  }
};

export const audienceGenders = (g: "men" | "women"): Gender[] => (g === "men" ? ["MEN", "UNISEX"] : ["WOMEN", "UNISEX"]);

export const buildProductWhere =(q: Omit<ProductListQuery, "sort" | "page" | "pageSize">, includeInactive = false) => {
  const where: Prisma.ProductWhereInput = {};
  if (!includeInactive) where.isActive = true;
  if (q.q) {
    where.OR = [
      { name: { contains: q.q, mode: "insensitive" } },
      { brand: { name: { contains: q.q, mode: "insensitive" } } },
      { colorway: { contains: q.q, mode: "insensitive" } },
      { description: { contains: q.q, mode: "insensitive" } },
    ];
  }
  if (q.gender) where.gender = { in: audienceGenders(q.gender) };
  if (q.brand.length) where.brand = { slug: { in: q.brand } };
  if (q.category.length) where.category = { slug: { in: q.category } };
  if (q.color.length) where.color = { in: q.color, mode: "insensitive" };
  if (q.size.length) where.variants = { some: { size: { in: q.size }, stock: { gt: 0 } } };
  if (q.minPrice !== undefined || q.maxPrice !== undefined) {
    where.priceCents = { gte: q.minPrice, lte: q.maxPrice };
  }
  return where;
};

export async function listProducts(q: ProductListQuery) {
  const where = buildProductWhere(q);
  const [total, rows] = await prisma.$transaction([
    prisma.product.count({ where }),
    prisma.product.findMany({ where, orderBy: orderBy(q.sort), include: productCardInclude, ...skipTake(q.page, q.pageSize) }),
  ]);
  return toPage(rows.map(serializeProductCard), total, q.page, q.pageSize);
}

export async function getProductBySlug(slug: string) {
  const product = await prisma.product.findFirst({ where: { slug, isActive: true }, include: productCardInclude });
  if (!product) throw notFound("Product");
  return serializeProductDetail(product, await colorwaysOf(product.styleGroup, product.gender));
}

/** Active colorways of the same model for the same audience (current product included). */
export async function colorwaysOf(styleGroup: string | null, gender: Gender) {
  if (!styleGroup) return [];
  const rows = await prisma.product.findMany({
    where: { styleGroup, isActive: true, gender: { in: gender === "UNISEX" ? ["MEN", "WOMEN", "UNISEX"] : [gender, "UNISEX"] } },
    select: { slug: true, colorway: true, color: true, images: true, variants: { where: { stock: { gt: 0 } }, select: { id: true }, take: 1 } },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    take: 12,
  });
  return rows.map((r) => ({ slug: r.slug, colorway: r.colorway, color: r.color, image: r.images[0] ? imageUrl(r.images[0]) : null, inStock: r.variants.length > 0 }));
}

export async function getFacets(gender?: "men" | "women") {
  const active: Prisma.ProductWhereInput = { isActive: true, ...(gender ? { gender: { in: audienceGenders(gender) } } : {}) };
  const [brands, categories, colors, sizes, price] = await Promise.all([
    prisma.brand.findMany({
      where: { products: { some: active } },
      select: { name: true, slug: true, _count: { select: { products: { where: active } } } },
      orderBy: { name: "asc" },
    }),
    prisma.category.findMany({
      where: { products: { some: active } },
      select: { name: true, slug: true, _count: { select: { products: { where: active } } } },
      orderBy: { name: "asc" },
    }),
    prisma.product.groupBy({ by: ["color"], where: active, _count: { _all: true }, orderBy: { color: "asc" } }),
    prisma.productVariant.findMany({
      where: { stock: { gt: 0 }, product: active },
      distinct: ["size"],
      select: { size: true },
    }),
    prisma.product.aggregate({ where: active, _min: { priceCents: true }, _max: { priceCents: true } }),
  ]);

  return {
    brands: brands.map((b) => ({ name: b.name, slug: b.slug, count: b._count.products })),
    categories: categories.map((c) => ({ name: c.name, slug: c.slug, count: c._count.products })),
    colors: colors.map((c) => ({ name: c.color, count: c._count._all })),
    sizes: sizes.map((s) => s.size).sort(compareSizes),
    price: { min: price._min.priceCents ?? 0, max: price._max.priceCents ?? 0 },
  };
}
