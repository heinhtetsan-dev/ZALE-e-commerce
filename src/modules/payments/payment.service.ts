import Stripe from "stripe";
import { env } from "../../config/env.js";
import { AppError, conflict } from "../../lib/errors.js";
import { logger } from "../../lib/logger.js";
import { prisma } from "../../lib/prisma.js";
import { markOrderPaid } from "../orders/order.service.js";

export interface PaymentSession {
  mode: "stripe" | "mock";
  clientSecret: string | null;
}

let client: Stripe | null = null;

/** Lazily created so mock mode never needs Stripe credentials. */
export function stripe(): Stripe {
  if (env.PAYMENTS_MODE !== "stripe" || !env.STRIPE_SECRET_KEY) throw new AppError("PAYMENT_ERROR", "Stripe is not configured");
  client ??= new Stripe(env.STRIPE_SECRET_KEY, { maxNetworkRetries: 2, timeout: 10_000 });
  return client;
}

export const paymentConfig = () => ({
  mode: env.PAYMENTS_MODE,
  publishableKey: env.PAYMENTS_MODE === "stripe" ? env.STRIPE_PUBLISHABLE_KEY! : null,
});

const REUSABLE: Stripe.PaymentIntent.Status[] = ["requires_payment_method", "requires_confirmation", "requires_action", "processing"];

/**
 * Returns a client secret for the order's PaymentIntent, creating it once.
 * The idempotency key makes concurrent/retried calls converge on one intent.
 */
export async function createPaymentSession(order: { id: string; totalCents: number }): Promise<PaymentSession> {
  if (env.PAYMENTS_MODE === "mock") return { mode: "mock", clientSecret: null };

  try {
    const existing = await prisma.order.findUnique({ where: { id: order.id }, select: { stripePaymentIntentId: true } });
    if (existing?.stripePaymentIntentId) {
      const intent = await stripe().paymentIntents.retrieve(existing.stripePaymentIntentId);
      if (REUSABLE.includes(intent.status)) return { mode: "stripe", clientSecret: intent.client_secret };
      if (intent.status === "succeeded") throw conflict("This order is already paid");
    }
    const intent = await stripe().paymentIntents.create(
      {
        amount: order.totalCents,
        currency: "usd",
        automatic_payment_methods: { enabled: true },
        metadata: { orderId: order.id },
        description: `ZALE order ${order.id.slice(0, 8).toUpperCase()}`,
      },
      { idempotencyKey: `order-${order.id}-${existing?.stripePaymentIntentId ?? "first"}` },
    );
    await prisma.order.update({ where: { id: order.id }, data: { stripePaymentIntentId: intent.id } });
    return { mode: "stripe", clientSecret: intent.client_secret };
  } catch (err) {
    if (err instanceof AppError) throw err;
    logger.error({ err, orderId: order.id }, "Stripe PaymentIntent creation failed");
    throw new AppError("PAYMENT_ERROR", "The payment provider is unavailable. Please try again shortly.");
  }
}

/** A payment that succeeded for an order we can no longer fulfil is refunded. */
async function refundOrphanPayment(intent: Stripe.PaymentIntent, orderId: string) {
  await stripe().refunds.create({ payment_intent: intent.id }, { idempotencyKey: `refund-${intent.id}` });
  await prisma.order.updateMany({ where: { id: orderId, paymentStatus: "UNPAID" }, data: { paymentStatus: "REFUNDED" } });
  logger.warn({ orderId, paymentIntent: intent.id }, "Refunded payment for cancelled order");
}

export async function handlePaymentSucceeded(intent: Stripe.PaymentIntent) {
  const orderId = intent.metadata.orderId;
  if (!orderId) return;
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) return;
  if (intent.amount_received < order.totalCents) {
    logger.error({ orderId, intent: intent.id }, "Received amount is lower than the order total");
    return;
  }
  if (await markOrderPaid(orderId)) {
    logger.info({ orderId }, "Order paid");
    return;
  }
  const latest = await prisma.order.findUnique({ where: { id: orderId }, select: { status: true, paymentStatus: true } });
  if (latest?.status === "CANCELLED" && latest.paymentStatus === "UNPAID") await refundOrphanPayment(intent, orderId);
}

/** Verifies the Stripe signature on the raw body and applies the event. */
export async function handleWebhook(rawBody: Buffer, signature: string | undefined) {
  if (!env.STRIPE_WEBHOOK_SECRET) throw new AppError("NOT_IMPLEMENTED", "Webhook secret not configured");
  let event: Stripe.Event;
  try {
    event = stripe().webhooks.constructEvent(rawBody, signature ?? "", env.STRIPE_WEBHOOK_SECRET);
  } catch {
    throw new AppError("VALIDATION_ERROR", "Invalid webhook signature");
  }
  switch (event.type) {
    case "payment_intent.succeeded":
      await handlePaymentSucceeded(event.data.object);
      break;
    case "payment_intent.payment_failed":
      logger.info({ orderId: event.data.object.metadata.orderId }, "Payment failed; customer may retry");
      break;
    default:
      break;
  }
  return event.type;
}

/**
 * For local development without a webhook tunnel: when an unpaid order is
 * fetched, ask Stripe whether its intent has succeeded.
 */
export async function reconcileOrderPayment(order: { id: string; status: string; paymentStatus: string; stripePaymentIntentId: string | null }) {
  if (env.PAYMENTS_MODE !== "stripe" || !order.stripePaymentIntentId || order.status !== "PENDING" || order.paymentStatus !== "UNPAID") return false;
  try {
    const intent = await stripe().paymentIntents.retrieve(order.stripePaymentIntentId);
    if (intent.status === "succeeded") {
      await handlePaymentSucceeded(intent);
      return true;
    }
  } catch (err) {
    logger.warn({ err, orderId: order.id }, "Payment reconciliation failed");
  }
  return false;
}

/** After an unpaid order is cancelled (by the customer or the expiry sweep), void its intent so it cannot be paid later. */
export async function voidPaymentIntent(orderId: string) {
  if (env.PAYMENTS_MODE !== "stripe") return;
  const order = await prisma.order.findUnique({ where: { id: orderId }, select: { stripePaymentIntentId: true } });
  if (!order?.stripePaymentIntentId) return;
  const intent = await stripe().paymentIntents.retrieve(order.stripePaymentIntentId);
  if (REUSABLE.includes(intent.status) && intent.status !== "processing") await stripe().paymentIntents.cancel(intent.id);
}

/**
 * Refunds an order's payment in full at the provider. Mock payments have no
 * provider, so there is nothing to call. The idempotency key (shared with the
 * orphan-payment refund) means a retry can never refund twice.
 */
export async function refundPayment(order: { id: string; stripePaymentIntentId: string | null }) {
  if (env.PAYMENTS_MODE !== "stripe" || !order.stripePaymentIntentId) return;
  try {
    await stripe().refunds.create({ payment_intent: order.stripePaymentIntentId }, { idempotencyKey: `refund-${order.stripePaymentIntentId}` });
  } catch (err) {
    if (err instanceof Stripe.errors.StripeError && err.code === "charge_already_refunded") return;
    logger.error({ err, orderId: order.id }, "Stripe refund failed");
    throw new AppError("PAYMENT_ERROR", "The refund could not be issued by the payment provider. Nothing was changed; please try again.");
  }
}

/** Local development only: simulates a successful card payment. */
export async function payMock(orderId: string) {
  if (env.PAYMENTS_MODE !== "mock") throw new AppError("FORBIDDEN", "Mock payments are disabled");
  if (!(await markOrderPaid(orderId))) throw conflict("This order cannot be paid");
}
