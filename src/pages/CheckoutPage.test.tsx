import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { loginAs, mockApi, renderRoute } from '../test/utils'
import { CheckoutPage } from './CheckoutPage'

const cart = {
  items: [
    {
      id: 'ci1',
      quantity: 1,
      variant: { id: 'v42', size: 42, stock: 1, stockStatus: 'low_stock' },
      product: { id: 'p1', slug: 'nike-air', name: 'Nike Air', brand: 'Nike', color: 'Black', priceCents: 12000, image: null, isActive: true },
      lineTotalCents: 12000,
      issue: null,
    },
  ],
  itemCount: 1,
  subtotalCents: 12000,
}

async function fillAddress() {
  await userEvent.type(screen.getByLabelText('Address'), '1 Main St')
  await userEvent.type(screen.getByLabelText('City'), 'Springfield')
  await userEvent.type(screen.getByLabelText('Postal code'), '12345')
}

describe('CheckoutPage', () => {
  it('validates the address before calling the API', async () => {
    const { calls } = mockApi({ ...loginAs(), 'GET /cart': { body: cart } })
    renderRoute(<CheckoutPage />, { path: '/checkout', route: '/checkout' })
    await userEvent.click(await screen.findByRole('button', { name: 'Place order & pay' }))
    expect(screen.getByText('Address is required')).toBeInTheDocument()
    expect(calls.some((c) => c.method === 'POST')).toBe(false)
  })

  it('shows a clear sold-out message with alternative sizes when the last pair is gone', async () => {
    mockApi({
      ...loginAs(),
      'GET /cart': { body: cart },
      'POST /orders': {
        status: 409,
        body: {
          error: {
            code: 'OUT_OF_STOCK',
            message: 'Nike Air in size 42 is sold out.',
            details: {
              items: [
                {
                  variantId: 'v42',
                  productId: 'p1',
                  productName: 'Nike Air',
                  productSlug: 'nike-air',
                  size: 42,
                  requested: 1,
                  available: 0,
                  alternatives: [
                    { variantId: 'v43', size: 43, stock: 4 },
                    { variantId: 'v44', size: 44, stock: 2 },
                  ],
                },
              ],
            },
          },
        },
      },
    })
    renderRoute(<CheckoutPage />, { path: '/checkout', route: '/checkout' })
    await screen.findByRole('button', { name: 'Place order & pay' })
    await fillAddress()
    await userEvent.click(screen.getByRole('button', { name: 'Place order & pay' }))

    expect(await screen.findByText('Sorry — Nike Air in EU 42 just sold out.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'EU 43' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'EU 44' })).toBeInTheDocument()
  })

  it('places the order and moves to payment', async () => {
    const { calls } = mockApi({
      ...loginAs(),
      'GET /cart': { body: cart },
      'POST /orders': { status: 201, body: { order: { id: 'o1' }, payment: { mode: 'mock', clientSecret: null } } },
    })
    const { router } = renderRoute(<CheckoutPage />, { path: '/checkout', route: '/checkout' })
    await screen.findByRole('button', { name: 'Place order & pay' })
    await fillAddress()
    await userEvent.click(screen.getByRole('button', { name: 'Place order & pay' }))
    await screen.findByText('Other page')
    expect(router.state.location.pathname).toBe('/orders/o1/pay')
    expect(calls.find((c) => c.method === 'POST')?.body).toEqual({
      shippingAddress: { fullName: 'Casey', line1: '1 Main St', line2: '', city: 'Springfield', postalCode: '12345', country: 'US', phone: '' },
    })
  })
})
