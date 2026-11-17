import { z } from "zod";
import { paginationQuery } from "../../lib/pagination.js";

const text = (max: number) => z.string().trim().min(1, "Required").max(max);

export const shippingAddress = z.object({
  fullName: text(100),
  line1: text(200),
  line2: z.string().trim().max(200).optional().transform((v) => v || undefined),
  city: text(100),
  postalCode: text(20),
  country: z.string().trim().length(2, "Use a 2-letter country code").toUpperCase(),
  phone: z
    .string()
    .trim()
    .max(30)
    .regex(/^[+0-9 ()-]*$/, "Invalid phone number")
    .optional()
    .transform((v) => v || undefined),
});

export const checkoutBody = z.object({ shippingAddress });
export type ShippingAddress = z.infer<typeof shippingAddress>;

export const orderIdParam = z.object({ id: z.uuid() });
export const orderListQuery = z.object({ ...paginationQuery(10) });
