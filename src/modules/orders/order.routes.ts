import { Router } from "express";
import { conflict } from "../../lib/errors.js";
import { logger } from "../../lib/logger.js";
import { authenticate, userId } from "../../middleware/auth.js";
import { createPaymentSession, payMock, reconcileOrderPayment, voidPaymentIntent } from "../payments/payment.service.js";
import { checkoutBody, orderIdParam, orderListQuery } from "./order.schemas.js";
import * as orders from "./order.service.js";

export const orderRouter = Router();
orderRouter.use(authenticate);

orderRouter.post("/", async (req, res) => {
  const { shippingAddress } = checkoutBody.parse(req.body);
  const order = await orders.checkout(userId(req), shippingAddress);
  // Stock is already committed; if the payment provider fails here the
  // client can retry via POST /orders/:id/payment.
  const payment = await createPaymentSession(order).catch(() => null);
  res.status(201).json({ order, payment });
});

orderRouter.get("/", async (req, res) => {
  const { page, pageSize } = orderListQuery.parse(req.query);
  res.json(await orders.listOrders(userId(req), page, pageSize));
});

orderRouter.get("/:id", async (req, res) => {
  const { id } = orderIdParam.parse(req.params);
  await reconcileOrderPayment(await orders.getOrderRecord(id, userId(req)));
  res.json(await orders.getOrder(id, userId(req)));
});

orderRouter.post("/:id/payment", async (req, res) => {
  const { id } = orderIdParam.parse(req.params);
  const order = await orders.getOrder(id, userId(req));
  if (order.status !== "PENDING" || order.paymentStatus !== "UNPAID") throw conflict("This order does not need payment");
  res.json(await createPaymentSession(order));
});

orderRouter.post("/:id/cancel", async (req, res) => {
  const { id } = orderIdParam.parse(req.params);
  const order = await orders.cancelOrder(userId(req), id);
  await voidPaymentIntent(id).catch((err) => logger.warn({ err, orderId: id }, "Could not cancel PaymentIntent"));
  res.json(order);
});

orderRouter.post("/:id/pay/mock", async (req, res) => {
  const { id } = orderIdParam.parse(req.params);
  await orders.getOrderRecord(id, userId(req));
  await payMock(id);
  res.json(await orders.getOrder(id, userId(req)));
});
