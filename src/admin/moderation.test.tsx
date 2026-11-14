import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { mockApi, renderRoute } from '../test/utils'
import { AdminCustomersPage } from './AdminCustomersPage'
import { CancelRefundActions } from './AdminOrdersPage'
import { AdminReviewsPage } from './AdminReviewsPage'
import type { AdminCustomer, AdminOrder, AdminReview } from './types'

const page = <T,>(items: T[]) => ({ items, page: 1, pageSize: 20, total: items.length, totalPages: 1 })

const order = (over: Partial<AdminOrder> = {}): AdminOrder => ({
  id: 'o1',
  number: 'ABCD1234',
  status: 'PENDING',
  paymentStatus: 'PAID',
  subtotalCents: 5000,
  shippingCents: 800,
  totalCents: 5800,
  shippingAddress: { fullName: 'Casey', line1: '1 St', line2: null, city: 'C', postalCode: '1', country: 'US', phone: null },
  items: [],
  itemCount: 1,
  createdAt: '2026-11-01T10:00:00Z',
  paidAt: '2026-11-01T10:01:00Z',
  shippedAt: null,
  deliveredAt: null,
  cancelledAt: null,
  refundedAt: null,
  customer: { id: 'u1', name: 'Casey', email: 'c@test.dev' },
  ...over,
})

describe('order cancel and refund', () => {
  it('asks before cancelling a paid order, then cancels and refunds it', async () => {
    const { calls } = mockApi({ 'POST /admin/orders/o1/cancel': { body: order({ status: 'CANCELLED', paymentStatus: 'REFUNDED' }) } })
    renderRoute(<CancelRefundActions order={order()} />)

    await userEvent.click(await screen.findByRole('button', { name: 'Cancel & refund' }))
    expect(screen.getByText(/refunded \$58 and the items go back into stock/)).toBeInTheDocument()
    expect(calls.some((c) => c.path.endsWith('/cancel'))).toBe(false)

    await userEvent.click(screen.getByRole('button', { name: 'Yes, cancel order' }))
    await waitFor(() => expect(calls.find((c) => c.path === '/admin/orders/o1/cancel')).toBeTruthy())
  })

  it('offers a refund with optional restock for shipped orders', async () => {
    const { calls } = mockApi({ 'POST /admin/orders/o1/refund': { body: order({ status: 'SHIPPED', paymentStatus: 'REFUNDED' }) } })
    renderRoute(<CancelRefundActions order={order({ status: 'SHIPPED' })} />)

    expect(screen.queryByRole('button', { name: /Cancel/ })).not.toBeInTheDocument()
    await userEvent.click(await screen.findByRole('button', { name: 'Refund' }))
    await userEvent.click(screen.getByRole('checkbox', { name: /put them back in stock/ }))
    await userEvent.click(screen.getByRole('button', { name: 'Refund $58' }))
    await waitFor(() => expect(calls.find((c) => c.path === '/admin/orders/o1/refund')?.body).toEqual({ restock: true }))
  })

  it('shows nothing once an order is refunded', () => {
    mockApi({})
    renderRoute(<CancelRefundActions order={order({ status: 'DELIVERED', paymentStatus: 'REFUNDED' })} />)
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })
})

describe('admin customers', () => {
  const casey: AdminCustomer = { id: 'u1', name: 'Casey', email: 'c@test.dev', createdAt: '2026-10-01T00:00:00Z', disabledAt: null, orderCount: 2, reviewCount: 1, totalSpentCents: 12900 }

  it('lists customers and disables one after confirming', async () => {
    let disabled = false
    const { calls } = mockApi({
      'GET /admin/customers': () => ({ body: page([{ ...casey, disabledAt: disabled ? '2026-11-14T00:00:00Z' : null }]) }),
      'PATCH /admin/customers/u1': ({ body }) => {
        disabled = (body as { disabled: boolean }).disabled
        return { body: { ...casey, orders: [], reviews: [] } }
      },
    })
    renderRoute(<AdminCustomersPage />)

    const row = (await screen.findByText('c@test.dev')).closest('li')!
    expect(within(row).getByText('$129')).toBeInTheDocument()
    expect(within(row).getByText('Active')).toBeInTheDocument()

    await userEvent.click(within(row).getByRole('button', { name: 'Disable account' }))
    await userEvent.click(within(row).getByRole('button', { name: 'Yes, disable' }))
    await waitFor(() => expect(calls.find((c) => c.method === 'PATCH')?.body).toEqual({ disabled: true }))
    expect(await within(row).findByText('Disabled')).toBeInTheDocument()
    expect(within(row).getByRole('button', { name: 'Enable account' })).toBeInTheDocument()
  })
})

describe('admin reviews', () => {
  const review: AdminReview = {
    id: 'r1',
    rating: 1,
    title: 'Buy cheap watches',
    comment: 'spam link',
    createdAt: '2026-11-10T00:00:00Z',
    product: { id: 'p1', name: 'Linen Shirt', slug: 'linen-shirt' },
    author: { id: 'u2', name: 'Spammer', email: 'spam@test.dev' },
  }

  it('deletes a review after confirming', async () => {
    let items = [review]
    const { calls } = mockApi({
      'GET /admin/reviews': () => ({ body: page(items) }),
      'DELETE /admin/reviews/r1': () => {
        items = []
        return { status: 204 }
      },
    })
    renderRoute(<AdminReviewsPage />)

    expect(await screen.findByText('Buy cheap watches')).toBeInTheDocument()
    expect(screen.getByText(/spam@test.dev/)).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Delete' }))
    await userEvent.click(screen.getByRole('button', { name: 'Yes, delete' }))
    await waitFor(() => expect(calls.some((c) => c.method === 'DELETE' && c.path === '/admin/reviews/r1')).toBe(true))
    expect(await screen.findByText('No reviews found')).toBeInTheDocument()
  })

  it('filters by rating through the URL', async () => {
    const { calls } = mockApi({ 'GET /admin/reviews': { body: page([review]) } })
    renderRoute(<AdminReviewsPage />)
    await userEvent.click(await screen.findByRole('button', { name: '1 ★' }))
    await waitFor(() => expect(calls.some((c) => c.path === '/admin/reviews' && c.method === 'GET')).toBe(true))
    await waitFor(() => expect(screen.getByRole('button', { name: '1 ★' })).toHaveAttribute('aria-pressed', 'true'))
  })
})
