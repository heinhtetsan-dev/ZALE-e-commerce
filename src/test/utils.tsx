import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render } from '@testing-library/react'
import type { ReactNode } from 'react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { vi } from 'vitest'
import { AuthProvider } from '../auth/AuthContext'
import { BagProvider } from '../cart/BagProvider'
import { guestCart } from '../cart/guestCart'
import type { ProductDetail, User } from '../lib/types'

type Handler = (req: { method: string; url: URL; body: unknown }) => { status?: number; body?: unknown } | undefined

/** Routes fetch calls to handlers keyed by "METHOD /path" (path relative to /api/v1). */
const emptyReviews = { items: [], page: 1, pageSize: 5, total: 0, totalPages: 1, distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } }

export function mockApi(overrides: Record<string, Handler | { status?: number; body?: unknown }>) {
  const handlers: Record<string, Handler | { status?: number; body?: unknown }> = {
    'GET /products/p1/reviews': { body: emptyReviews },
    'GET /products/p1/reviews/mine': { body: { review: null } },
    'GET /wishlist/ids': { body: { productIds: [] } },
    ...overrides,
  }
  const calls: Array<{ method: string; path: string; body: unknown }> = []
  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(String(input), 'http://localhost')
    const method = init?.method ?? 'GET'
    const path = url.pathname.replace(/^\/api\/v1/, '')
    const body = init?.body instanceof Blob ? init.body : init?.body ? JSON.parse(String(init.body)) : undefined
    calls.push({ method, path, body })
    const entry = handlers[`${method} ${path}`]
    const result = typeof entry === 'function' ? entry({ method, url, body }) : entry
    if (!result) return new Response(JSON.stringify({ error: { code: 'NOT_FOUND', message: `No mock for ${method} ${path}` } }), { status: 404 })
    return new Response(result.status === 204 ? null : JSON.stringify(result.body ?? {}), { status: result.status ?? 200, headers: { 'Content-Type': 'application/json' } })
  })
  vi.stubGlobal('fetch', fetchMock)
  return { calls, fetchMock }
}

export function renderRoute(element: ReactNode, { path = '/', route = '/', extraRoutes = [] }: { path?: string; route?: string; extraRoutes?: Array<{ path: string; element: ReactNode }> } = {}) {
  guestCart.reset()
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  const router = createMemoryRouter(
    [
      { path, element },
      ...extraRoutes,
      { path: '*', element: <p>Other page</p> },
    ],
    { initialEntries: [route] },
  )
  return {
    router,
    queryClient,
    ...render(
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <BagProvider>
            <RouterProvider router={router} />
          </BagProvider>
        </AuthProvider>
      </QueryClientProvider>,
    ),
  }
}

export const customer: User = { id: 'u1', email: 'c@test.dev', name: 'Casey', role: 'CUSTOMER', createdAt: '2026-01-01T00:00:00Z' }

export const loginAs = (user: User = customer) => {
  localStorage.setItem('shoeshop.token', 'test-token')
  return { 'GET /auth/me': { body: { user } } }
}

export const sampleProduct: ProductDetail = {
  id: 'p1',
  slug: 'nike-air',
  name: 'Nike Club Hoodie',
  color: 'Black',
  colorway: 'Black/White',
  gender: 'MEN',
  styleGroup: 'nike-air',
  imageCredit: 'Jane Doe, CC BY-SA 4.0 — via Wikimedia Commons',
  imageSourceUrl: 'https://commons.wikimedia.org/wiki/File:Nike_Air.jpg',
  colorways: [
    { slug: 'nike-air', colorway: 'Black/White', color: 'Black', image: null, inStock: true },
    { slug: 'nike-air-red', colorway: 'University Red', color: 'Red', image: null, inStock: false },
  ],
  priceCents: 12000,
  image: null,
  images: [],
  brand: { id: 'b1', name: 'Nike', slug: 'nike' },
  category: { id: 'c1', name: 'Hoodies & Sweatshirts', slug: 'hoodies-and-sweatshirts' },
  ratingAvg: 0,
  ratingCount: 0,
  availableSizes: ['M', 'L'],
  sizes: [
    { variantId: 'v41', size: 'S', stock: 0 },
    { variantId: 'v42', size: 'M', stock: 2 },
    { variantId: 'v43', size: 'L', stock: 9 },
  ],
  swatches: [],
  inStock: true,
  isActive: true,
  createdAt: '2026-01-01T00:00:00Z',
  description: 'A cosy fleece hoodie',
  variants: [
    { id: 'v41', size: 'S', stock: 0, stockStatus: 'out_of_stock' },
    { id: 'v42', size: 'M', stock: 2, stockStatus: 'low_stock' },
    { id: 'v43', size: 'L', stock: 9, stockStatus: 'in_stock' },
  ],
}
