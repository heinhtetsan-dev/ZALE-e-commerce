import { z } from "zod";

const email = z.string().trim().toLowerCase().pipe(z.email("Enter a valid email address")).pipe(z.string().max(254));
const password = z.string().min(8, "Password must be at least 8 characters").max(128);
const name = z.string().trim().min(1, "Name is required").max(100);

export const registerBody = z.object({ name, email, password });
export const loginBody = z.object({ email, password: z.string().min(1).max(128) });
export const updateProfileBody = z.object({ name });
export const changePasswordBody = z.object({ currentPassword: z.string().min(1).max(128), newPassword: password });
