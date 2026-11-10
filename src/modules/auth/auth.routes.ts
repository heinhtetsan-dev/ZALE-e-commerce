import { Router } from "express";
import { authenticate, userId } from "../../middleware/auth.js";
import { authLimiter } from "../../middleware/rate-limit.js";
import { changePasswordBody, loginBody, registerBody, updateProfileBody } from "./auth.schemas.js";
import * as auth from "./auth.service.js";

export const authRouter = Router();

authRouter.post("/register", authLimiter, async (req, res) => {
  res.status(201).json(await auth.register(registerBody.parse(req.body)));
});

authRouter.post("/login", authLimiter, async (req, res) => {
  res.json(await auth.login(loginBody.parse(req.body)));
});

authRouter.get("/me", authenticate, async (req, res) => {
  res.json({ user: await auth.getMe(userId(req)) });
});

authRouter.patch("/me", authenticate, async (req, res) => {
  const { name } = updateProfileBody.parse(req.body);
  res.json({ user: await auth.updateProfile(userId(req), name) });
});

authRouter.post("/change-password", authenticate, authLimiter, async (req, res) => {
  await auth.changePassword(userId(req), changePasswordBody.parse(req.body));
  res.status(204).end();
});
