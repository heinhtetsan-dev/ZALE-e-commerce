import { z } from 'zod'

const required = (label: string, max: number) => z.string().trim().min(1, `${label} is required`).max(max, `${label} is too long`)

export const addressSchema = z.object({
  fullName: required('Full name', 100),
  line1: required('Address', 200),
  line2: z.string().trim().max(200).optional(),
  city: required('City', 100),
  postalCode: required('Postal code', 20),
  country: z
    .string()
    .trim()
    .regex(/^[A-Za-z]{2}$/, 'Use a 2-letter country code, e.g. US')
    .transform((v) => v.toUpperCase()),
  phone: z
    .string()
    .trim()
    .max(30)
    .regex(/^[+0-9 ()-]*$/, 'Use digits, spaces, +, ( ) or -')
    .optional(),
})

export type AddressInput = z.input<typeof addressSchema>

export const fieldErrorsOf = (error: z.ZodError) => {
  const out: Record<string, string> = {}
  for (const issue of error.issues) {
    const key = issue.path.join('.')
    if (!out[key]) out[key] = issue.message
  }
  return out
}
