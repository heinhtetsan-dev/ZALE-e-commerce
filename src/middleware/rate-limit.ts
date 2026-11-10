import { rateLimit, type Options } from "express-rate-limit";
import { env } from "../config/env.js";

// The default in-memory store is per instance. When running several API
// instances behind a load balancer, plug in a shared store (e.g. rate-limit-redis).
const handler: Options["handler"] = (_req, res) => {
  res.status(429).json({ error: { code: "RATE_LIMITED", message: "Too many requests, please try again later" } });
};

export const globalLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  limit: env.RATE_LIMIT_MAX,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  skip: (req) => req.path.startsWith("/health") || req.path.startsWith("/payments/webhook"),
  handler,
});

export const authLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  limit: env.AUTH_RATE_LIMIT_MAX,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  handler,
});
