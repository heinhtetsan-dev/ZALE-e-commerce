import bcrypt from "bcryptjs";
import type { User } from "../../generated/prisma/client.js";
import { AppError, conflict, notFound } from "../../lib/errors.js";
import { signToken } from "../../lib/jwt.js";
import { prisma } from "../../lib/prisma.js";
import type { z } from "zod";
import type { changePasswordBody, loginBody, registerBody } from "./auth.schemas.js";

const BCRYPT_COST = 12;
// Compared against when the email is unknown so response time doesn't reveal which emails exist.
const DUMMY_HASH = bcrypt.hashSync("dummy-password-for-timing", BCRYPT_COST);

export const publicUser = (u: User) => ({ id: u.id, email: u.email, name: u.name, role: u.role, createdAt: u.createdAt });

const session = (u: User) => ({ token: signToken({ sub: u.id, role: u.role }), user: publicUser(u) });

export async function register(input: z.infer<typeof registerBody>) {
  const existing = await prisma.user.findUnique({ where: { email: input.email } });
  if (existing) throw conflict("An account with this email already exists");
  const user = await prisma.user.create({
    data: { email: input.email, name: input.name, passwordHash: await bcrypt.hash(input.password, BCRYPT_COST) },
  });
  return session(user);
}

export async function login(input: z.infer<typeof loginBody>) {
  const user = await prisma.user.findUnique({ where: { email: input.email } });
  const ok = await bcrypt.compare(input.password, user?.passwordHash ?? DUMMY_HASH);
  if (!user || !ok) throw new AppError("UNAUTHENTICATED", "Incorrect email or password");
  return session(user);
}

export async function getMe(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new AppError("UNAUTHENTICATED", "Account no longer exists");
  return publicUser(user);
}

export async function updateProfile(userId: string, name: string) {
  const user = await prisma.user.update({ where: { id: userId }, data: { name } }).catch(() => {
    throw notFound("User");
  });
  return publicUser(user);
}

export async function changePassword(userId: string, input: z.infer<typeof changePasswordBody>) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw notFound("User");
  if (!(await bcrypt.compare(input.currentPassword, user.passwordHash))) {
    throw new AppError("VALIDATION_ERROR", "Current password is incorrect", [{ path: "currentPassword", message: "Current password is incorrect" }]);
  }
  await prisma.user.update({ where: { id: userId }, data: { passwordHash: await bcrypt.hash(input.newPassword, BCRYPT_COST) } });
}
