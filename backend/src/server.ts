import { createApp } from "./app.js";
import { env } from "./config/env.js";
import { logger } from "./lib/logger.js";
import { prisma } from "./lib/prisma.js";
import { expireUnpaidOrders } from "./modules/orders/order.service.js";
import { voidPaymentIntent } from "./modules/payments/payment.service.js";

const app = createApp();
const server = app.listen(env.PORT, () => {
  logger.info(`API listening on http://localhost:${env.PORT}/api/v1`);
});

// The sweep is idempotent, so every instance may run it; set the interval to 0
// and use `npm run jobs:expire-orders` from a scheduler instead if preferred.
const sweep =
  env.ORDER_SWEEP_INTERVAL_SECONDS > 0
    ? setInterval(() => {
        expireUnpaidOrders(undefined, voidPaymentIntent).catch((err) => logger.error({ err }, "Order sweep failed"));
      }, env.ORDER_SWEEP_INTERVAL_SECONDS * 1000)
    : undefined;

const shutdown = (signal: string) => {
  logger.info(`${signal} received, shutting down`);
  clearInterval(sweep);
  server.close(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 10_000).unref();
};
process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
