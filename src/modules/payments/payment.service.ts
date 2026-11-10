import { env } from "../../config/env.js";
import { AppError, conflict } from "../../lib/errors.js";
import { markOrderPaid } from "../orders/order.service.js";

export interface PaymentSession {
  mode: "stripe" | "mock";
  clientSecret: string | null;
}

export const paymentConfig = () => ({
  mode: env.PAYMENTS_MODE,
  publishableKey: env.PAYMENTS_MODE === "stripe" ? env.STRIPE_PUBLISHABLE_KEY! : null,
});

export async function createPaymentSession(_order: { id: string; totalCents: number }): Promise<PaymentSession> {
  return { mode: "mock", clientSecret: null };
}

/** Called after the sweep cancels an unpaid order. */
export async function onOrderExpired(_orderId: string) {}

/** Local development only: simulates a successful card payment. */
export async function payMock(orderId: string) {
  if (env.PAYMENTS_MODE !== "mock") throw new AppError("FORBIDDEN", "Mock payments are disabled");
  if (!(await markOrderPaid(orderId))) throw conflict("This order cannot be paid");
}
