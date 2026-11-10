import { z } from "zod";
import { paginationQuery } from "../../lib/pagination.js";

const slug = z
  .string()
  .trim()
  .min(1)
  .max(120)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use lowercase letters, numbers and hyphens");

const imageRef = z
  .string()
  .trim()
  .min(1)
  .max(500)
  .refine((v) => /^https:\/\//.test(v) || /^[\w./-]+$/.test(v), "Use an https URL or a CDN object key");

export const productBody = z.object({
  name: z.string().trim().min(1).max(150),
  slug: slug.optional(),
  description: z.string().trim().min(1).max(5000),
  brandId: z.uuid(),
  categoryId: z.uuid(),
  color: z.string().trim().min(1).max(30),
  colorway: z.string().trim().max(80).nullish().transform((v) => v || null),
  gender: z.enum(["MEN", "WOMEN", "UNISEX"]).default("UNISEX"),
  styleGroup: z
    .string()
    .trim()
    .max(80)
    .regex(/^([a-z0-9]+(?:-[a-z0-9]+)*)?$/, "Use lowercase letters, numbers and hyphens")
    .nullish()
    .transform((v) => v || null),
  priceCents: z.number().int().min(0).max(10_000_00),
  images: z.array(imageRef).max(8).default([]),
  imageCredit: z.string().trim().max(500).nullish().transform((v) => v || null),
  imageSourceUrl: z.url({ protocol: /^https$/ }).max(500).nullish().or(z.literal("").transform(() => null)),
  isActive: z.boolean().default(true),
});

export const productUpdateBody = productBody.partial();

const size = z.number().positive().max(60).multipleOf(0.5, "Sizes must be whole or half sizes");

export const variantsBody = z.object({
  variants: z
    .array(z.object({ size, stock: z.number().int().min(0).max(100_000) }))
    .max(40)
    .refine((v) => new Set(v.map((x) => x.size)).size === v.length, "Each size may only appear once"),
});

export const variantStockBody = z.object({ stock: z.number().int().min(0).max(100_000) });

export const idParam = z.object({ id: z.uuid() });

export const adminProductQuery = z.object({
  q: z.string().trim().max(100).optional(),
  includeInactive: z
    .enum(["true", "false"])
    .default("true")
    .transform((v) => v === "true"),
  ...paginationQuery(20),
});

export const orderStatuses = ["PENDING", "SHIPPED", "DELIVERED", "CANCELLED"] as const;

export const adminOrderQuery = z.object({
  status: z.enum(orderStatuses).optional(),
  q: z.string().trim().max(100).optional(),
  ...paginationQuery(20),
});

export const orderStatusBody = z.object({ status: z.enum(["SHIPPED", "DELIVERED"]) });

export const summaryQuery = z
  .object({
    from: z.coerce.date().optional(),
    to: z.coerce.date().optional(),
  })
  .transform(({ from, to }) => {
    const end = to ?? new Date();
    const start = from ?? new Date(end.getTime() - 30 * 86_400_000);
    return { from: start, to: end };
  })
  .refine((r) => r.from <= r.to, { message: "from must be before to" })
  .refine((r) => r.to.getTime() - r.from.getTime() <= 366 * 86_400_000, { message: "Range may not exceed one year" });

export const presignBody = z.object({
  fileName: z.string().trim().min(1).max(200),
  contentType: z.enum(["image/jpeg", "image/png", "image/webp", "image/avif"]),
});
