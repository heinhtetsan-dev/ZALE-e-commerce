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
import { uploadDir } from "./modules/admin/upload.service.js";
import { authRouter } from "./modules/auth/auth.routes.js";
import { cartRouter } from "./modules/cart/cart.routes.js";
import { orderRouter } from "./modules/orders/order.routes.js";
import { paymentRouter, stripeWebhookRouter } from "./modules/payments/payment.routes.js";
import { productRouter } from "./modules/products/product.routes.js";
import { productReviewRouter, reviewRouter } from "./modules/reviews/review.routes.js";
import { newsletterRouter } from "./modules/newsletter/newsletter.routes.js";
import { wishlistRouter } from "./modules/wishlist/wishlist.routes.js";

export function createApp() {
  const app = express();
  app.disable("x-powered-by");
  // Trust X-Forwarded-For only from the configured number of proxies, so
  // rate limiting sees real client IPs and cannot be fooled by a fake header.
  app.set("trust proxy", env.TRUST_PROXY);

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
  // Product photos uploaded by admins (when S3 isn't configured). File names
  // are random UUIDs and never change, so browsers may cache them forever.
  // Served before the rate limiter: a product grid loads many images at once.
  api.use(
    "/uploads",
    express.static(uploadDir(), {
      index: false,
      dotfiles: "deny",
      immutable: true,
      maxAge: "365d",
      setHeaders: (res) => {
        // Let a storefront on another origin show them, but never run them as a page.
        res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
        res.setHeader("Content-Security-Policy", "default-src 'none'; sandbox");
      },
    }),
  );
  api.use(globalLimiter);
  api.use("/payments/webhook", stripeWebhookRouter);
  api.use(express.json({ limit: "100kb" }));

  api.get("/health", (_req, res) => {
    res.json({ status: "ok" });
  });
  api.get("/health/ready", async (_req, res) => {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: "ready" });
  });

  api.use("/auth", authRouter);
  api.use("/products/:productId/reviews", productReviewRouter);
  api.use("/products", productRouter);
  api.use("/reviews", reviewRouter);
  api.use("/wishlist", wishlistRouter);
  api.use("/newsletter", newsletterRouter);
  api.use("/cart", cartRouter);
  api.use("/orders", orderRouter);
  api.use("/payments", paymentRouter);
  api.use("/admin", adminRouter);

  app.use("/api/v1", api);
  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
