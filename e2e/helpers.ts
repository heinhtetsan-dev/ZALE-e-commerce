import type { APIRequestContext } from '@playwright/test'

/**
 * Registers a throwaway shopper for tests that place orders, so test
 * purchases never show up in the demo customer's order history.
 */
export async function newShopper(request: APIRequestContext) {
  const shopper = { name: 'Test Shopper', email: `e2e-shopper-${Date.now()}-${Math.floor(Math.random() * 1e6)}@example.com`, password: 'Shopper123!' }
  const res = await request.post('/api/v1/auth/register', { data: shopper })
  if (!res.ok()) throw new Error(`Could not register a test shopper: ${res.status()} ${await res.text()}`)
  return shopper
}
