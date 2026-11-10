import { z } from 'zod'

export const productFormSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(150),
  slug: z
    .string()
    .trim()
    .max(120)
    .regex(/^([a-z0-9]+(?:-[a-z0-9]+)*)?$/, 'Lowercase letters, numbers and hyphens only')
    .transform((v) => v || undefined),
  description: z.string().trim().min(1, 'Description is required').max(5000),
  brandId: z.string().min(1, 'Choose a brand'),
  categoryId: z.string().min(1, 'Choose a category'),
  color: z.string().trim().min(1, 'Color is required').max(30),
  price: z
    .string()
    .trim()
    .regex(/^\d+(\.\d{1,2})?$/, 'Enter a price like 129.99')
    .transform((v) => Math.round(Number(v) * 100)),
  images: z
    .string()
    .transform((v) =>
      v
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean),
    )
    .pipe(z.array(z.string().refine((s) => /^https:\/\//.test(s) || /^[\w./-]+$/.test(s), 'Each image must be an https URL or CDN key')).max(8, 'At most 8 images')),
  isActive: z.boolean(),
})

export type ProductFormValues = z.input<typeof productFormSchema>

export const sizeRowSchema = z.object({
  size: z.number({ error: 'Enter a size' }).positive('Size must be positive').max(60).multipleOf(0.5, 'Whole or half sizes only'),
  stock: z.number({ error: 'Enter stock' }).int('Whole numbers only').min(0, 'Stock cannot be negative').max(100000),
})

export const variantsSchema = z
  .array(sizeRowSchema)
  .max(40)
  .refine((rows) => new Set(rows.map((r) => r.size)).size === rows.length, 'Each size may only appear once')
