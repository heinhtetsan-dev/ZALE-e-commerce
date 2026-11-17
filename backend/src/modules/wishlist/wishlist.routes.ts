import { Router } from "express";
import { z } from "zod";
import { notFound } from "../../lib/errors.js";
import { paginationQuery, skipTake, toPage } from "../../lib/pagination.js";
import { prisma } from "../../lib/prisma.js";
import { authenticate, userId } from "../../middleware/auth.js";
import { productCardInclude, serializeProductCard } from "../products/product.serializer.js";

const productIdBody = z.object({ productId: z.uuid() });
const productIdParam = z.object({ productId: z.uuid() });
const listQuery = z.object({ ...paginationQuery(24) });

export const wishlistRouter = Router();
wishlistRouter.use(authenticate);

wishlistRouter.get("/", async (req, res) => {
  const { page, pageSize } = listQuery.parse(req.query);
  const where = { userId: userId(req) };
  const [total, rows] = await prisma.$transaction([
    prisma.wishlistItem.count({ where }),
    prisma.wishlistItem.findMany({ where, include: { product: { include: productCardInclude } }, orderBy: [{ createdAt: "desc" }, { id: "asc" }], ...skipTake(page, pageSize) }),
  ]);
  res.json(toPage(rows.map((r) => ({ addedAt: r.createdAt, product: serializeProductCard(r.product) })), total, page, pageSize));
});

/** Lightweight list for rendering heart toggles across the catalog. */
wishlistRouter.get("/ids", async (req, res) => {
  const rows = await prisma.wishlistItem.findMany({ where: { userId: userId(req) }, select: { productId: true }, take: 1000 });
  res.json({ productIds: rows.map((r) => r.productId) });
});

wishlistRouter.post("/", async (req, res) => {
  const { productId } = productIdBody.parse(req.body);
  const product = await prisma.product.findFirst({ where: { id: productId, isActive: true }, select: { id: true } });
  if (!product) throw notFound("Product");
  // Idempotent: adding twice is not an error.
  await prisma.wishlistItem.upsert({
    where: { userId_productId: { userId: userId(req), productId } },
    create: { userId: userId(req), productId },
    update: {},
  });
  res.status(201).json({ productId });
});

wishlistRouter.delete("/:productId", async (req, res) => {
  const { productId } = productIdParam.parse(req.params);
  await prisma.wishlistItem.deleteMany({ where: { userId: userId(req), productId } });
  res.status(204).end();
});
