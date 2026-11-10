import { z } from "zod";
import { paginationQuery } from "../../lib/pagination.js";

const csvList = z
  .string()
  .optional()
  .transform((v) => (v ? v.split(",").map((s) => s.trim()).filter(Boolean) : []));

const csv = (item: z.ZodString) => csvList.pipe(z.array(item).max(30));
const csvNumbers = (item: z.ZodNumber) =>
  csvList.pipe(z.array(z.string().transform(Number).pipe(item)).max(30));

export const productSorts = ["newest", "price_asc", "price_desc", "rating", "name"] as const;

export const productListQuery = z
  .object({
    q: z.string().trim().max(100).optional(),
    brand: csv(z.string().max(60)),
    category: csv(z.string().max(60)),
    color: csv(z.string().max(30)),
    size: csvNumbers(z.number().positive().max(60)),
    minPrice: z.coerce.number().int().nonnegative().optional(),
    maxPrice: z.coerce.number().int().nonnegative().optional(),
    sort: z.enum(productSorts).default("newest"),
    ...paginationQuery(12),
  })
  .refine((q) => q.minPrice === undefined || q.maxPrice === undefined || q.minPrice <= q.maxPrice, {
    message: "minPrice must be less than or equal to maxPrice",
    path: ["minPrice"],
  });

export type ProductListQuery = z.infer<typeof productListQuery>;

export const slugParam = z.object({ slug: z.string().min(1).max(200) });
