import { Router } from "express";
import { z } from "zod";
import { paginationQuery } from "../../lib/pagination.js";
import { authenticate, userId } from "../../middleware/auth.js";
import * as reviews from "./review.service.js";

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((v) => v || undefined);

const reviewBody = z.object({
  rating: z.number().int().min(1, "Choose 1 to 5 stars").max(5, "Choose 1 to 5 stars"),
  title: optionalText(120),
  comment: optionalText(2000),
});

const productParam = z.object({ productId: z.uuid() });
const reviewParam = z.object({ id: z.uuid() });
const listQuery = z.object({ ...paginationQuery(5) });

/** Mounted at /products/:productId/reviews */
export const productReviewRouter = Router({ mergeParams: true });

productReviewRouter.get("/", async (req, res) => {
  const { productId } = productParam.parse(req.params);
  const { page, pageSize } = listQuery.parse(req.query);
  res.set("Cache-Control", "no-cache");
  res.json(await reviews.listReviews(productId, page, pageSize));
});

productReviewRouter.get("/mine", authenticate, async (req, res) => {
  const { productId } = productParam.parse(req.params);
  res.json({ review: await reviews.getMyReview(productId, userId(req)) });
});

productReviewRouter.post("/", authenticate, async (req, res) => {
  const { productId } = productParam.parse(req.params);
  res.status(201).json(await reviews.createReview(productId, userId(req), reviewBody.parse(req.body)));
});

/** Mounted at /reviews */
export const reviewRouter = Router();
reviewRouter.use(authenticate);

reviewRouter.patch("/:id", async (req, res) => {
  const { id } = reviewParam.parse(req.params);
  res.json(await reviews.updateReview(id, userId(req), req.auth!.role, reviewBody.partial().parse(req.body)));
});

reviewRouter.delete("/:id", async (req, res) => {
  const { id } = reviewParam.parse(req.params);
  await reviews.deleteReview(id, userId(req), req.auth!.role);
  res.status(204).end();
});
