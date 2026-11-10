/** One-shot run of the unpaid-order sweep, for cron/scheduler deployments. */
import { prisma } from "../lib/prisma.js";
import { expireUnpaidOrders } from "../modules/orders/order.service.js";
import { onOrderExpired } from "../modules/payments/payment.service.js";

const expired = await expireUnpaidOrders(undefined, onOrderExpired);
console.log(`Expired ${expired} unpaid order(s).`);
await prisma.$disconnect();
