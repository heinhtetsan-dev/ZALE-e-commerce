import type { Gender, Prisma } from "../../generated/prisma/client.js";
import { notFound } from "../../lib/errors.js";
import { skipTake, toPage } from "../../lib/pagination.js";
import { prisma } from "../../lib/prisma.js";
import type { ProductListQuery } from "./product.schemas.js";
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
  return where;
};

export async function listProducts(q: ProductListQuery) {
  const where = buildProductWhere(q);
  const [total, rows] = await prisma.$transaction([
    prisma.product.count({ where }),
    prisma.product.findMany({ where, orderBy: orderBy(q.sort), include: productCardInclude, ...skipTake(q.page, q.pageSize) }),
  ]);
  const swatches = await swatchesFor(rows);
  return toPage(
    rows.map((p) => serializeProductCard(p, swatches(p))),
    total,
    q.page,
    q.pageSize,
  );
}

const sameAudience = (a: Gender, b: Gender) => a === "UNISEX" || b === "UNISEX" || a === b;

/** One query for the whole page: other colors of each listed item (only when it has more than one). */
async function swatchesFor(rows: Array<{ slug: string; styleGroup: string | null; gender: Gender }>) {
  const groups = [...new Set(rows.map((r) => r.styleGroup).filter((g): g is string => !!g))];
  const siblings = groups.length
    ? await prisma.product.findMany({
        where: { styleGroup: { in: groups }, isActive: true },
        select: { slug: true, color: true, colorway: true, gender: true, styleGroup: true },
        orderBy: [{ createdAt: "asc" }, { id: "asc" }],
      })
    : [];
  return (p: { styleGroup: string | null; gender: Gender }) => {
    const mine = siblings.filter((s) => s.styleGroup === p.styleGroup && sameAudience(s.gender, p.gender));
    return mine.length > 1 ? mine.slice(0, 6).map(({ slug, color, colorway }) => ({ slug, color, colorway })) : [];
  };
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
  const [brands, categories] = await Promise.all([
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
  ]);

  return {
    brands: brands.map((b) => ({ name: b.name, slug: b.slug, count: b._count.products })),
    categories: categories.map((c) => ({ name: c.name, slug: c.slug, count: c._count.products })),
  };
}
