import cors from "cors";
import express, { Router } from "express";
import helmet from "helmet";
import { pinoHttp } from "pino-http";
import { env } from "./config/env.js";
import { logger } from "./lib/logger.js";
import { prisma } from "./lib/prisma.js";
import { errorHandler, notFoundHandler } from "./middleware/error-handler.js";
import { globalLimiter } from "./middleware/rate-limit.js";
import { adminRouter } from "./modules/admin/admin.routes.js";
import { authRouter } from "./modules/auth/auth.routes.js";
import { cartRouter } from "./modules/cart/cart.routes.js";
import { orderRouter } from "./modules/orders/order.routes.js";
import { paymentConfig } from "./modules/payments/payment.service.js";
import { productRouter } from "./modules/products/product.routes.js";

export function createApp() {
  const app = express();
  app.disable("x-powered-by");
  // Behind a load balancer / CDN: trust the first proxy so rate limiting sees client IPs.
  app.set("trust proxy", 1);

  app.use(helmet());
  app.use(
    cors({
      origin: env.CORS_ORIGINS,
      methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
      allowedHeaders: ["Content-Type", "Authorization"],
      maxAge: 600,
    }),
  );
  app.use(pinoHttp({ logger, autoLogging: env.NODE_ENV !== "test" }));

  const api = Router();
  api.use(globalLimiter);
  api.use(express.json({ limit: "100kb" }));

  api.get("/health", (_req, res) => {
    res.json({ status: "ok" });
  });
  api.get("/health/ready", async (_req, res) => {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: "ready" });
  });

  api.use("/auth", authRouter);
  api.use("/products", productRouter);
  api.use("/cart", cartRouter);
  api.use("/orders", orderRouter);
  api.get("/payments/config", (_req, res) => {
    res.json(paymentConfig());
  });
  api.use("/admin", adminRouter);

  app.use("/api/v1", api);
  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
