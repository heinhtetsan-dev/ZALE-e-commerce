import express, { Router } from "express";
import { handleWebhook, paymentConfig } from "./payment.service.js";

export const paymentRouter = Router();

paymentRouter.get("/config", (_req, res) => {
  res.json(paymentConfig());
});

/** Must be mounted before the JSON body parser: signature verification needs the raw bytes. */
export const stripeWebhookRouter = Router();

stripeWebhookRouter.post("/", express.raw({ type: "application/json", limit: "1mb" }), async (req, res) => {
  const type = await handleWebhook(req.body as Buffer, req.header("stripe-signature"));
  res.json({ received: true, type });
});
