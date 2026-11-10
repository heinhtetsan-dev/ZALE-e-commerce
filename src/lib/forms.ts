import type { z } from 'zod'

/** First error message per field path, e.g. { email: 'Enter a valid email address' }. */
export const fieldErrorsOf = (error: z.ZodError) => {
  const out: Record<string, string> = {}
  for (const issue of error.issues) {
    const key = issue.path.join('.')
    if (!out[key]) out[key] = issue.message
  }
  return out
}

/** Post-login destination: only same-site relative paths, never protocol-relative URLs. */
export const redirectTarget = (state: unknown) => {
  const from = (state as { from?: string } | null)?.from
  return from && from.startsWith('/') && !from.startsWith('//') ? from : '/'
}
