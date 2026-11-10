import type { Request, RequestHandler } from "express";
import { AppError } from "../lib/errors.js";
import { verifyToken, type Role, type TokenPayload } from "../lib/jwt.js";

declare module "express-serve-static-core" {
  interface Request {
    auth?: TokenPayload;
  }
}

/**
 * Stateless authentication: the JWT carries the user id and role, so any API
 * instance can authorise a request without a session store.
 */
export const authenticate: RequestHandler = (req, _res, next) => {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) throw new AppError("UNAUTHENTICATED", "Authentication required");
  try {
    req.auth = verifyToken(header.slice(7));
  } catch {
    throw new AppError("UNAUTHENTICATED", "Invalid or expired token");
  }
  next();
};

export const requireRole =
  (...roles: Role[]): RequestHandler =>
  (req, _res, next) => {
    if (!req.auth) throw new AppError("UNAUTHENTICATED", "Authentication required");
    if (!roles.includes(req.auth.role)) throw new AppError("FORBIDDEN", "You do not have permission to do this");
    next();
  };

/** The authenticated user's id; only valid behind `authenticate`. */
export const userId = (req: Request) => {
  if (!req.auth) throw new AppError("UNAUTHENTICATED", "Authentication required");
  return req.auth.sub;
};
