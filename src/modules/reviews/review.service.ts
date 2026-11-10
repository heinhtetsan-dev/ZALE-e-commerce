import type { Review } from "../../generated/prisma/client.js";
import { AppError, conflict, notFound } from "../../lib/errors.js";
import { skipTake, toPage } from "../../lib/pagination.js";
import { prisma, type Tx } from "../../lib/prisma.js";

export interface ReviewInput {
  rating: number;
  title?: string;
  comment?: string;
}

/** "Ada Lovelace" -> "Ada L." so reviews never expose full names. */
const displayName = (name: string) => {
  const [first = "Customer", ...rest] = name.trim().split(/\s+/);
  const last = rest.at(-1);
  return last ? `${first} ${last[0]!.toUpperCase()}.` : first;
};

const serialize = (r: Review & { user: { id: string; name: string } }, verified: boolean) => ({
  id: r.id,
  rating: r.rating,
  title: r.title,
  comment: r.comment,
  createdAt: r.createdAt,
  updatedAt: r.updatedAt,
  verifiedPurchase: verified,
  author: { id: r.user.id, name: displayName(r.user.name) },
});

async function verifiedBuyers(productId: string, userIds: string[]) {
  if (!userIds.length) return new Set<string>();
  const rows = await prisma.order.findMany({
    where: { userId: { in: userIds }, paymentStatus: "PAID", items: { some: { productId } } },
    select: { userId: true },
    distinct: ["userId"],
  });
  return new Set(rows.map((r) => r.userId));
}

/**
 * Recomputes the denormalised rating in the same transaction as the write.
 * The product row is locked first so concurrent reviews on the same product
 * serialise and the aggregate always reflects every committed review.
 */
async function lockAndRecompute(tx: Tx, productId: string, write: () => Promise<unknown>) {
  await tx.$queryRaw`SELECT id FROM "Product" WHERE id = ${productId}::uuid FOR UPDATE`;
  const result = await write();
  await tx.$executeRaw`
    UPDATE "Product" p SET
      "ratingAvg" = COALESCE((SELECT AVG(rating)::float FROM "Review" WHERE "productId" = p.id), 0),
      "ratingCount" = (SELECT COUNT(*)::int FROM "Review" WHERE "productId" = p.id)
    WHERE p.id = ${productId}::uuid`;
  return result;
}

export async function listReviews(productId: string, page: number, pageSize: number) {
  const where = { productId };
  const [total, rows] = await prisma.$transaction([
    prisma.review.count({ where }),
    prisma.review.findMany({ where, include: { user: { select: { id: true, name: true } } }, orderBy: [{ createdAt: "desc" }, { id: "asc" }], ...skipTake(page, pageSize) }),
  ]);
  const verified = await verifiedBuyers(productId, rows.map((r) => r.userId));
  const distribution = await prisma.review.groupBy({ by: ["rating"], where, _count: { _all: true } });
  return {
    ...toPage(rows.map((r) => serialize(r, verified.has(r.userId))), total, page, pageSize),
    distribution: Object.fromEntries([1, 2, 3, 4, 5].map((n) => [n, distribution.find((d) => d.rating === n)?._count._all ?? 0])),
  };
}

export async function getMyReview(productId: string, userId: string) {
  const r = await prisma.review.findUnique({ where: { userId_productId: { userId, productId } }, include: { user: { select: { id: true, name: true } } } });
  if (!r) return null;
  return serialize(r, (await verifiedBuyers(productId, [userId])).has(userId));
}

export async function createReview(productId: string, userId: string, input: ReviewInput) {
  const product = await prisma.product.findFirst({ where: { id: productId, isActive: true }, select: { id: true } });
  if (!product) throw notFound("Product");
  if (await prisma.review.findUnique({ where: { userId_productId: { userId, productId } } })) {
    throw conflict("You have already reviewed this product. Edit your existing review instead.");
  }
  const review = await prisma.$transaction((tx) =>
    lockAndRecompute(tx, productId, () => tx.review.create({ data: { productId, userId, ...input } })),
  );
  return getMyReview(productId, userId).then((r) => r ?? review);
}

async function loadOwned(reviewId: string, userId: string, role: "CUSTOMER" | "ADMIN", allowAdmin: boolean) {
  const review = await prisma.review.findUnique({ where: { id: reviewId } });
  if (!review) throw notFound("Review");
  if (review.userId !== userId && !(allowAdmin && role === "ADMIN")) throw new AppError("FORBIDDEN", "You can only change your own reviews");
  return review;
}

export async function updateReview(reviewId: string, userId: string, role: "CUSTOMER" | "ADMIN", input: Partial<ReviewInput>) {
  const review = await loadOwned(reviewId, userId, role, false);
  await prisma.$transaction((tx) => lockAndRecompute(tx, review.productId, () => tx.review.update({ where: { id: reviewId }, data: input })));
  return getMyReview(review.productId, userId);
}

export async function deleteReview(reviewId: string, userId: string, role: "CUSTOMER" | "ADMIN") {
  const review = await loadOwned(reviewId, userId, role, true);
  await prisma.$transaction((tx) => lockAndRecompute(tx, review.productId, () => tx.review.delete({ where: { id: reviewId } })));
}
