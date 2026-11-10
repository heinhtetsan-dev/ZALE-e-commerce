import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { loginAs, mockApi, renderRoute } from '../test/utils'
import { ProductReviews } from './ProductReviews'
import { WishlistButton } from './WishlistButton'

const review = {
  id: 'r1',
  rating: 4,
  title: 'Comfy',
  comment: 'Great fit',
  createdAt: '2026-03-01T00:00:00Z',
  updatedAt: '2026-03-01T00:00:00Z',
  verifiedPurchase: true,
  author: { id: 'u2', name: 'Ada L.' },
}

const renderReviews = () => renderRoute(<ProductReviews productId="p1" slug="nike-air" ratingAvg={4} ratingCount={1} />, { path: '/products/:slug', route: '/products/nike-air' })

describe('ProductReviews', () => {
  it('lists reviews with verified badge and distribution, and asks guests to log in', async () => {
    mockApi({ 'GET /products/p1/reviews': { body: { items: [review], page: 1, pageSize: 5, total: 1, totalPages: 1, distribution: { 1: 0, 2: 0, 3: 0, 4: 1, 5: 0 } } } })
    renderReviews()
    expect(await screen.findByText('Comfy')).toBeInTheDocument()
    expect(screen.getByText('✓ Verified purchase')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Log in' })).toBeInTheDocument()
  })

  it('requires a star rating, then submits the review', async () => {
    const { calls } = mockApi({ ...loginAs(), 'GET /cart': { body: { items: [], itemCount: 0, subtotalCents: 0 } }, 'POST /products/p1/reviews': { status: 201, body: review } })
    renderReviews()
    await userEvent.click(await screen.findByRole('button', { name: 'Write a review' }))
    await userEvent.click(screen.getByRole('button', { name: 'Submit review' }))
    expect(screen.getByText('Choose a star rating')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('radio', { name: '4 stars' }))
    await userEvent.type(screen.getByLabelText('Your review (optional)'), 'Very comfy')
    await userEvent.click(screen.getByRole('button', { name: 'Submit review' }))
    await waitFor(() => expect(calls.find((c) => c.method === 'POST')?.body).toEqual({ rating: 4, comment: 'Very comfy' }))
  })
})

describe('WishlistButton', () => {
  it('sends guests to login', async () => {
    mockApi({})
    const { router } = renderRoute(<WishlistButton productId="p1" />)
    await userEvent.click(screen.getByRole('button', { name: 'Save to wishlist' }))
    expect(router.state.location.pathname).toBe('/login')
  })

  it('toggles optimistically for customers', async () => {
    const saved = new Set<string>()
    const { calls } = mockApi({
      ...loginAs(),
      'GET /wishlist/ids': () => ({ body: { productIds: [...saved] } }),
      'POST /wishlist': ({ body }) => {
        saved.add((body as { productId: string }).productId)
        return { status: 201, body }
      },
    })
    renderRoute(<WishlistButton productId="p1" />)
    await waitFor(() => expect(calls.some((c) => c.path === '/wishlist/ids')).toBe(true))
    await userEvent.click(screen.getByRole('button', { name: 'Save to wishlist' }))
    expect(await screen.findByRole('button', { name: 'Remove from wishlist' })).toHaveAttribute('aria-pressed', 'true')
    expect(calls.find((c) => c.method === 'POST')?.body).toEqual({ productId: 'p1' })
  })
})
