import { Router } from "express";
import { authenticate, userId } from "../../middleware/auth.js";
import { addItemBody, itemIdParam, mergeBody, updateItemBody } from "./cart.schemas.js";
import * as cart from "./cart.service.js";

export const cartRouter = Router();
cartRouter.use(authenticate);

cartRouter.get("/", async (req, res) => {
  res.json(await cart.getCart(userId(req)));
});

cartRouter.post("/items", async (req, res) => {
  const { variantId, quantity } = addItemBody.parse(req.body);
  res.status(201).json(await cart.addItem(userId(req), variantId, quantity));
});

cartRouter.patch("/items/:itemId", async (req, res) => {
  const { itemId } = itemIdParam.parse(req.params);
  const { quantity } = updateItemBody.parse(req.body);
  res.json(await cart.updateItem(userId(req), itemId, quantity));
});

cartRouter.delete("/items/:itemId", async (req, res) => {
  const { itemId } = itemIdParam.parse(req.params);
  res.json(await cart.removeItem(userId(req), itemId));
});

cartRouter.post("/merge", async (req, res) => {
  const { items } = mergeBody.parse(req.body);
  res.json(await cart.mergeCart(userId(req), items));
});
