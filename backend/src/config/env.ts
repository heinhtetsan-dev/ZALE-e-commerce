import "dotenv/config";
import { z } from "zod";

const optional = z
  .string()
  .optional()
  .transform((v) => (v ? v : undefined));

const schema = z
  .object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    PORT: z.coerce.number().int().positive().default(4000),
    DATABASE_URL: z.string().url(),
    JWT_SECRET: z.string().min(32, "JWT_SECRET must be at least 32 characters"),
    JWT_EXPIRES_IN: z.string().default("1d"),
    /**
     * Number of reverse proxies (load balancer, CDN) in front of the API. Only
     * then is X-Forwarded-For trusted for the client IP; with 0 a client could
     * otherwise fake its IP and dodge rate limits.
     */
    TRUST_PROXY: z.coerce.number().int().min(0).max(10).default(0),
    CORS_ORIGINS: z
      .string()
      .default("http://localhost:5173")
      .transform((v) => v.split(",").map((s) => s.trim()).filter(Boolean)),
    PAYMENTS_MODE: z.enum(["stripe", "mock"]).default("mock"),
    STRIPE_SECRET_KEY: optional,
    STRIPE_PUBLISHABLE_KEY: optional,
    STRIPE_WEBHOOK_SECRET: optional,
    CDN_BASE_URL: z.string().url().default("https://cdn.example.com"),
    S3_BUCKET: optional,
    S3_REGION: optional,
    S3_ENDPOINT: optional,
    S3_ACCESS_KEY_ID: optional,
    S3_SECRET_ACCESS_KEY: optional,
    /** Where admin photo uploads are stored when S3 is not configured. */
    UPLOAD_DIR: z.string().default("uploads"),
    RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(15 * 60 * 1000),
    RATE_LIMIT_MAX: z.coerce.number().int().positive().default(1000),
    AUTH_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(20),
    ORDER_PAYMENT_TIMEOUT_MINUTES: z.coerce.number().int().positive().default(30),
    ORDER_SWEEP_INTERVAL_SECONDS: z.coerce.number().int().nonnegative().default(60),
    SHIPPING_FLAT_CENTS: z.coerce.number().int().nonnegative().default(800),
    FREE_SHIPPING_THRESHOLD_CENTS: z.coerce.number().int().nonnegative().default(10000),
  })
  .superRefine((env, ctx) => {
    if (env.PAYMENTS_MODE === "stripe" && (!env.STRIPE_SECRET_KEY || !env.STRIPE_PUBLISHABLE_KEY)) {
      ctx.addIssue({ code: "custom", message: "PAYMENTS_MODE=stripe requires STRIPE_SECRET_KEY and STRIPE_PUBLISHABLE_KEY" });
    }
    if (env.PAYMENTS_MODE === "stripe" && env.STRIPE_SECRET_KEY && !env.STRIPE_SECRET_KEY.startsWith("sk_test_")) {
      ctx.addIssue({ code: "custom", message: "Only Stripe test keys (sk_test_...) are supported" });
    }
    if (env.PAYMENTS_MODE === "mock" && env.NODE_ENV === "production") {
      ctx.addIssue({ code: "custom", message: "PAYMENTS_MODE=mock is not allowed in production" });
    }
  });

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  console.error("Invalid environment configuration:");
  for (const issue of parsed.error.issues) console.error(`  ${issue.path.join(".") || "(root)"}: ${issue.message}`);
  process.exit(1);
}

export const env = parsed.data;
export type Env = typeof env;
