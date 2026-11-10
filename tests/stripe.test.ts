import request from "supertest";
import type Stripe from "stripe";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

// Run a separate app instance in Stripe mode. Network calls to Stripe are
// stubbed; webhook signatures use Stripe's real signing/verification code.
const WEBHOOK_SECRET = "whsec_test_secret";
const address = { fullName: "A", line1: "1 St", city: "C", postalCode: "1", country: "US" };

let app: import("express").Express;
let client: Stripe;
let helpers: typeof import("./helpers.js");
let prisma: typeof import("../src/lib/prisma.js")["prisma"];
let intentStatus: Stripe.PaymentIntent.Status = "requires_payment_method";
let intentCounter = 0;

beforeAll(async () => {
  vi.resetModules();
  Object.assign(process.env, {
    PAYMENTS_MODE: "stripe",
    STRIPE_SECRET_KEY: "sk_test_fake",
    STRIPE_PUBLISHABLE_KEY: "pk_test_fake",
    STRIPE_WEBHOOK_SECRET: WEBHOOK_SECRET,
  });
  ({ prisma } = await import("../src/lib/prisma.js"));
  const payments = await import("../src/modules/payments/payment.service.js");
  helpers = await import("./helpers.js");
  app = (await import("../src/app.js")).createApp();
  client = payments.stripe();
});

beforeEach(async () => {
  await helpers.resetDb();
  vi.restoreAllMocks();
  intentStatus = "requires_payment_method";
  const intents = new Map<string, { amount: number; metadata: Record<string, string> }>();
  vi.spyOn(client.paymentIntents, "create").mockImplementation((async (params: Stripe.PaymentIntentCreateParams) => {
    const id = `pi_${++intentCounter}`;
    intents.set(id, { amount: params.amount, metadata: params.metadata as Record<string, string> });
    return { id, client_secret: `${id}_secret`, status: "requires_payment_method", amount: params.amount, metadata: params.metadata } as Stripe.PaymentIntent;
  }) as never);
  vi.spyOn(client.paymentIntents, "retrieve").mockImplementation((async (id: string) => {
    const i = intents.get(id)!;
    return { id, client_secret: `${id}_secret`, status: intentStatus, amount: i.amount, amount_received: intentStatus === "succeeded" ? i.amount : 0, metadata: i.metadata } as Stripe.PaymentIntent;
  }) as never);
  vi.spyOn(client.paymentIntents, "cancel").mockResolvedValue({} as never);
  vi.spyOn(client.refunds, "create").mockResolvedValue({} as never);
});

afterAll(async () => {
  Object.assign(process.env, { PAYMENTS_MODE: "mock", STRIPE_SECRET_KEY: "", STRIPE_PUBLISHABLE_KEY: "", STRIPE_WEBHOOK_SECRET: "" });
  await prisma.$disconnect();
});

async function checkout() {
  const p = await helpers.createProduct({ priceCents: 4000, variants: [{ size: 42, stock: 3 }] });
  const { user, password } = await helpers.createUser();
  const token = (await request(app).post("/api/v1/auth/login").send({ email: user.email, password })).body.token as string;
  await request(app).post("/api/v1/cart/items").set(helpers.auth(token)).send({ variantId: p.variants[0]!.id });
  const res = await request(app).post("/api/v1/orders").set(helpers.auth(token)).send({ shippingAddress: address });
  return { token, res, variantId: p.variants[0]!.id };
}

function signedEvent(type: string, object: Record<string, unknown>) {
  const payload = JSON.stringify({ id: `evt_${Date.now()}`, object: "event", type, data: { object: { object: "payment_intent", ...object } } });
  const header = client.webhooks.generateTestHeaderString({ payload, secret: WEBHOOK_SECRET });
  return request(app).post("/api/v1/payments/webhook").set("Content-Type", "application/json").set("Stripe-Signature", header).send(payload);
}

describe("Stripe payments (test mode)", () => {
  it("exposes the publishable key", async () => {
    expect((await request(app).get("/api/v1/payments/config")).body).toEqual({ mode: "stripe", publishableKey: "pk_test_fake" });
  });

  it("creates one PaymentIntent per order for the order total and reuses it", async () => {
    const { token, res } = await checkout();
    expect(res.status).toBe(201);
    expect(res.body.payment).toEqual({ mode: "stripe", clientSecret: expect.stringMatching(/^pi_\d+_secret$/) });
    expect(client.paymentIntents.create).toHaveBeenCalledWith(
      expect.objectContaining({ amount: 4800, currency: "usd", metadata: { orderId: res.body.order.id } }),
      { idempotencyKey: `order-${res.body.order.id}-first` },
    );
    const again = await request(app).post(`/api/v1/orders/${res.body.order.id}/payment`).set(helpers.auth(token));
    expect(again.body.clientSecret).toBe(res.body.payment.clientSecret);
    expect(client.paymentIntents.create).toHaveBeenCalledTimes(1);
  });

  it("rejects webhooks with a bad signature", async () => {
    const res = await request(app).post("/api/v1/payments/webhook").set("Content-Type", "application/json").set("Stripe-Signature", "t=1,v1=bad").send("{}");
    expect(res.status).toBe(400);
  });

  it("marks the order paid on payment_intent.succeeded, idempotently", async () => {
    const { res } = await checkout();
    const order = res.body.order;
    const intentId = res.body.payment.clientSecret.replace(/_secret$/, "");
    for (let i = 0; i < 2; i++) {
      const hook = await signedEvent("payment_intent.succeeded", { id: intentId, amount_received: order.totalCents, metadata: { orderId: order.id } });
      expect(hook.status).toBe(200);
    }
    const stored = await prisma.order.findUniqueOrThrow({ where: { id: order.id } });
    expect(stored.paymentStatus).toBe("PAID");
    expect(client.refunds.create).not.toHaveBeenCalled();
  });

  it("ignores an underpaid intent", async () => {
    const { res } = await checkout();
    await signedEvent("payment_intent.succeeded", { id: "pi_x", amount_received: 100, metadata: { orderId: res.body.order.id } });
    expect((await prisma.order.findUniqueOrThrow({ where: { id: res.body.order.id } })).paymentStatus).toBe("UNPAID");
  });

  it("refunds a payment that arrives after the order was cancelled", async () => {
    const { token, res, variantId } = await checkout();
    const cancel = await request(app).post(`/api/v1/orders/${res.body.order.id}/cancel`).set(helpers.auth(token));
    expect(cancel.body.status).toBe("CANCELLED");
    expect(client.paymentIntents.cancel).toHaveBeenCalled();
    expect((await prisma.productVariant.findUniqueOrThrow({ where: { id: variantId } })).stock).toBe(3);

    await signedEvent("payment_intent.succeeded", { id: "pi_late", amount_received: res.body.order.totalCents, metadata: { orderId: res.body.order.id } });
    expect(client.refunds.create).toHaveBeenCalledWith({ payment_intent: "pi_late" }, { idempotencyKey: "refund-pi_late" });
    expect((await prisma.order.findUniqueOrThrow({ where: { id: res.body.order.id } })).paymentStatus).toBe("REFUNDED");
  });

  it("reconciles payment status when the order is fetched (no webhook)", async () => {
    const { token, res } = await checkout();
    expect((await request(app).get(`/api/v1/orders/${res.body.order.id}`).set(helpers.auth(token))).body.paymentStatus).toBe("UNPAID");
    intentStatus = "succeeded";
    expect((await request(app).get(`/api/v1/orders/${res.body.order.id}`).set(helpers.auth(token))).body.paymentStatus).toBe("PAID");
  });

  it("disables mock payments", async () => {
    const { token, res } = await checkout();
    expect((await request(app).post(`/api/v1/orders/${res.body.order.id}/pay/mock`).set(helpers.auth(token))).status).toBe(403);
  });

  it("still creates the order if Stripe is down, and the client can retry", async () => {
    vi.mocked(client.paymentIntents.create).mockRejectedValueOnce(new Error("network"));
    const { token, res } = await checkout();
    expect(res.status).toBe(201);
    expect(res.body.payment).toBeNull();
    const retry = await request(app).post(`/api/v1/orders/${res.body.order.id}/payment`).set(helpers.auth(token));
    expect(retry.body.clientSecret).toMatch(/_secret$/);
  });
});
