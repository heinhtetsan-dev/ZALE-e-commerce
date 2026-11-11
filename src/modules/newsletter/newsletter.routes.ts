import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../lib/prisma.js";
import { authLimiter } from "../../middleware/rate-limit.js";

const body = z.object({
  email: z.string().trim().toLowerCase().pipe(z.email("Enter a valid email address")).pipe(z.string().max(254)),
});

export const newsletterRouter = Router();

/**
 * Idempotent sign-up. The response is the same whether or not the address was
 * already subscribed, so the endpoint can't be used to check who is on the list.
 */
newsletterRouter.post("/", authLimiter, async (req, res) => {
  const { email } = body.parse(req.body);
  await prisma.newsletterSubscriber.upsert({ where: { email }, create: { email }, update: {} });
  res.status(201).json({ subscribed: true });
});
