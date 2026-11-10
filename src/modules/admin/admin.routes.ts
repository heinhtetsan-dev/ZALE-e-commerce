import { Router } from "express";
import { prisma } from "../../lib/prisma.js";
import { authenticate, requireRole } from "../../middleware/auth.js";
import {
  adminOrderQuery,
  adminProductQuery,
  idParam,
  orderStatusBody,
  presignBody,
  productBody,
  productUpdateBody,
  summaryQuery,
  variantsBody,
  variantStockBody,
} from "./admin.schemas.js";
import * as admin from "./admin.service.js";

export const adminRouter = Router();
adminRouter.use(authenticate, requireRole("ADMIN"));

adminRouter.get("/brands", async (_req, res) => {
  res.json({ items: await prisma.brand.findMany({ orderBy: { name: "asc" } }) });
});

adminRouter.get("/categories", async (_req, res) => {
  res.json({ items: await prisma.category.findMany({ orderBy: { name: "asc" } }) });
});

adminRouter.get("/products", async (req, res) => {
  res.json(await admin.listAdminProducts(adminProductQuery.parse(req.query)));
});

adminRouter.get("/products/:id", async (req, res) => {
  res.json(await admin.getAdminProduct(idParam.parse(req.params).id));
});

adminRouter.post("/products", async (req, res) => {
  res.status(201).json(await admin.createProduct(productBody.parse(req.body)));
});

adminRouter.patch("/products/:id", async (req, res) => {
  res.json(await admin.updateProduct(idParam.parse(req.params).id, productUpdateBody.parse(req.body)));
});

adminRouter.delete("/products/:id", async (req, res) => {
  res.json(await admin.deleteProduct(idParam.parse(req.params).id));
});

adminRouter.put("/products/:id/variants", async (req, res) => {
  res.json(await admin.replaceVariants(idParam.parse(req.params).id, variantsBody.parse(req.body)));
});

adminRouter.patch("/variants/:id", async (req, res) => {
  const { stock } = variantStockBody.parse(req.body);
  res.json(await admin.setVariantStock(idParam.parse(req.params).id, stock));
});

adminRouter.get("/orders", async (req, res) => {
  res.json(await admin.listAdminOrders(adminOrderQuery.parse(req.query)));
});

adminRouter.patch("/orders/:id/status", async (req, res) => {
  const { status } = orderStatusBody.parse(req.body);
  res.json(await admin.updateOrderStatus(idParam.parse(req.params).id, status));
});

adminRouter.get("/summary", async (req, res) => {
  const { from, to } = summaryQuery.parse(req.query);
  res.json(await admin.salesSummary(from, to));
});

adminRouter.post("/uploads/presign", async (req, res) => {
  const { fileName, contentType } = presignBody.parse(req.body);
  res.json(await admin.presignUpload(fileName, contentType));
});
