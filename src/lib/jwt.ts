import jwt, { type SignOptions } from "jsonwebtoken";
import { env } from "../config/env.js";

export type Role = "CUSTOMER" | "ADMIN";

export interface TokenPayload {
  sub: string;
  role: Role;
}

export const signToken = (payload: TokenPayload) =>
  jwt.sign(payload, env.JWT_SECRET, {
    algorithm: "HS256",
    expiresIn: env.JWT_EXPIRES_IN as SignOptions["expiresIn"],
  });

export const verifyToken = (token: string): TokenPayload => {
  const decoded = jwt.verify(token, env.JWT_SECRET, { algorithms: ["HS256"] });
  if (typeof decoded !== "object" || typeof decoded.sub !== "string" || (decoded.role !== "CUSTOMER" && decoded.role !== "ADMIN")) {
    throw new Error("Malformed token");
  }
  return { sub: decoded.sub, role: decoded.role };
};
