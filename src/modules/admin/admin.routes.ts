import { Router } from "express";
import { prisma } from "../../lib/prisma.js";
import { authenticate, requireRole } from "../../middleware/auth.js";

export const adminRouter = Router();
adminRouter.use(authenticate, requireRole("ADMIN"));

adminRouter.get("/brands", async (_req, res) => {
  res.json({ items: await prisma.brand.findMany({ orderBy: { name: "asc" } }) });
});

adminRouter.get("/categories", async (_req, res) => {
  res.json({ items: await prisma.category.findMany({ orderBy: { name: "asc" } }) });
});
