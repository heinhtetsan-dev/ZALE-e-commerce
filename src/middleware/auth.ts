import type { Request, RequestHandler } from "express";
import { AppError } from "../lib/errors.js";
import { verifyToken, type Role, type TokenPayload } from "../lib/jwt.js";
import { prisma } from "../lib/prisma.js";

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

/**
 * Role check against the database, not just the token: an admin who is
 * demoted or deleted loses access immediately instead of when the token
 * expires. One primary-key lookup, only on role-protected routes.
 */
export const requireRole =
  (...roles: Role[]): RequestHandler =>
  async (req, _res, next) => {
    if (!req.auth) throw new AppError("UNAUTHENTICATED", "Authentication required");
    const user = await prisma.user.findUnique({ where: { id: req.auth.sub }, select: { role: true } });
    if (!user) throw new AppError("UNAUTHENTICATED", "Account no longer exists");
    if (!roles.includes(user.role)) throw new AppError("FORBIDDEN", "You do not have permission to do this");
    req.auth.role = user.role;
    next();
  };

/** The authenticated user's id; only valid behind `authenticate`. */
export const userId = (req: Request) => {
  if (!req.auth) throw new AppError("UNAUTHENTICATED", "Authentication required");
  return req.auth.sub;
};
