import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { guestCart } from '../cart/guestCart'
import { loginAs, mockApi, renderRoute, sampleProduct } from '../test/utils'
import { ProductDetailPage } from './ProductDetailPage'

const renderDetail = () => renderRoute(<ProductDetailPage />, { path: '/products/:slug', route: '/products/nike-air' })

describe('ProductDetailPage', () => {
  it('shows per-size stock status and disables sold-out sizes', async () => {
    mockApi({ 'GET /products/nike-air': { body: sampleProduct } })
    renderDetail()
    const size41 = await screen.findByRole('radio', { name: 'S' })
    expect(size41).toBeDisabled()
    await userEvent.click(screen.getByRole('radio', { name: 'M' }))
    expect(screen.getByText('Only 2 left')).toBeInTheDocument()
  })

  it('requires a size before adding to cart', async () => {
    mockApi({ 'GET /products/nike-air': { body: sampleProduct } })
    renderDetail()
    await userEvent.click(await screen.findByRole('button', { name: 'Add to cart' }))
    expect(screen.getByRole('alert')).toHaveTextContent('Please select a size first.')
    expect(guestCart.items()).toHaveLength(0)
  })

  it('adds the selected size to the guest cart', async () => {
    mockApi({ 'GET /products/nike-air': { body: sampleProduct } })
    renderDetail()
    await userEvent.click(await screen.findByRole('radio', { name: 'L' }))
    await userEvent.click(screen.getByRole('button', { name: 'Add to cart' }))
    expect(await screen.findByText(/Added Nike Club Hoodie \(Size L\) to your cart/)).toBeInTheDocument()
    expect(guestCart.items()).toEqual([expect.objectContaining({ variantId: 'v43', quantity: 1, size: 'L' })])
  })

  it('explains a server-side out-of-stock error and lists other sizes', async () => {
    const { calls } = mockApi({
      ...loginAs(),
      'GET /cart': { body: { items: [], itemCount: 0, subtotalCents: 0 } },
      'GET /products/nike-air': { body: sampleProduct },
      'POST /cart/items': { status: 409, body: { error: { code: 'OUT_OF_STOCK', message: 'Nike Club Hoodie in size M is sold out.', details: { items: [] } } } },
    })
    renderDetail()
    await screen.findByRole('radio', { name: 'M' })
    await waitFor(() => expect(calls.some((c) => c.path === '/auth/me')).toBe(true))
    await userEvent.click(screen.getByRole('radio', { name: 'M' }))
    await userEvent.click(screen.getByRole('button', { name: 'Add to cart' }))
    const alert = await screen.findByText('Nike Club Hoodie in size M is sold out.')
    expect(alert.parentElement).toHaveTextContent('Available sizes: L')
    expect(calls.find((c) => c.method === 'POST')?.body).toEqual({ variantId: 'v42', quantity: 1 })
  })
})
