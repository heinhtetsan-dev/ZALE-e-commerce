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
 * Verifies the JWT, then confirms the account still exists and is not
 * disabled. The role is taken from the database, not the token, so an admin
 * who is demoted, or a customer whose account is disabled, loses access on
 * their next request instead of when the token expires. One primary-key
 * lookup per authenticated request.
 */
export const authenticate: RequestHandler = async (req, _res, next) => {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) throw new AppError("UNAUTHENTICATED", "Authentication required");
  let payload: TokenPayload;
  try {
    payload = verifyToken(header.slice(7));
  } catch {
    throw new AppError("UNAUTHENTICATED", "Invalid or expired token");
  }
  const user = await prisma.user.findUnique({ where: { id: payload.sub }, select: { role: true, disabledAt: true } });
  if (!user) throw new AppError("UNAUTHENTICATED", "Account no longer exists");
  if (user.disabledAt) throw new AppError("UNAUTHENTICATED", "This account has been disabled");
  req.auth = { ...payload, role: user.role };
  next();
};

/** Only valid behind `authenticate`, which has already refreshed the role from the database. */
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
