import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { guestCart } from '../cart/guestCart'
import { redirectTarget } from '../lib/forms'
import { customer, loginAs, mockApi, renderRoute } from '../test/utils'
import { LoginPage } from './LoginPage'
import { OrdersPage } from './OrdersPage'
import { RegisterPage } from './RegisterPage'

describe('redirectTarget', () => {
  it('only allows same-site relative paths', () => {
    expect(redirectTarget({ from: '/checkout' })).toBe('/checkout')
    expect(redirectTarget({ from: '//evil.example' })).toBe('/')
    expect(redirectTarget({ from: 'https://evil.example' })).toBe('/')
    expect(redirectTarget(null)).toBe('/')
  })
})

describe('LoginPage', () => {
  it('validates input on the client', async () => {
    const { calls } = mockApi({})
    renderRoute(<LoginPage />, { path: '/login', route: '/login' })
    await userEvent.type(screen.getByLabelText('Email'), 'not-an-email')
    await userEvent.click(screen.getByRole('button', { name: 'Log in' }))
    expect(screen.getByText('Enter a valid email address')).toBeInTheDocument()
    expect(screen.getByText('Password is required')).toBeInTheDocument()
    expect(calls).toHaveLength(0)
  })

  it('shows the API error for wrong credentials', async () => {
    mockApi({ 'POST /auth/login': { status: 401, body: { error: { code: 'UNAUTHENTICATED', message: 'Incorrect email or password' } } } })
    renderRoute(<LoginPage />, { path: '/login', route: '/login' })
    await userEvent.type(screen.getByLabelText('Email'), 'a@b.co')
    await userEvent.type(screen.getByLabelText('Password'), 'wrong-pass')
    await userEvent.click(screen.getByRole('button', { name: 'Log in' }))
    expect(await screen.findByText('Incorrect email or password')).toBeInTheDocument()
  })

  it('logs in, merges the guest cart and redirects back', async () => {
    localStorage.setItem(
      'shoeshop.guestCart',
      JSON.stringify([{ variantId: 'v1', quantity: 2, size: 'M', stock: 5, product: { id: 'p', slug: 's', name: 'N', brand: 'B', color: 'C', priceCents: 100, image: null } }]),
    )
    const { calls } = mockApi({
      'POST /auth/login': { body: { token: 't', user: customer } },
      'POST /cart/merge': { body: { items: [], itemCount: 2, subtotalCents: 200 } },
      'GET /cart': { body: { items: [], itemCount: 2, subtotalCents: 200 } },
    })
    const { router } = renderRoute(<LoginPage />, { path: '/login', route: '/login' })
    router.navigate('/login', { state: { from: '/checkout' } })
    await userEvent.type(await screen.findByLabelText('Email'), 'c@test.dev')
    await userEvent.type(screen.getByLabelText('Password'), 'Customer123!')
    await userEvent.click(screen.getByRole('button', { name: 'Log in' }))
    await screen.findByText('Other page')
    expect(router.state.location.pathname).toBe('/checkout')
    expect(calls.find((c) => c.path === '/cart/merge')?.body).toEqual({ items: [{ variantId: 'v1', quantity: 2 }] })
    expect(guestCart.items()).toHaveLength(0)
    expect(localStorage.getItem('shoeshop.token')).toBe('t')
  })
})

describe('RegisterPage', () => {
  it('checks the password confirmation and maps duplicate email to the field', async () => {
    mockApi({ 'POST /auth/register': { status: 409, body: { error: { code: 'CONFLICT', message: 'exists' } } } })
    renderRoute(<RegisterPage />, { path: '/register', route: '/register' })
    await userEvent.type(screen.getByLabelText('Name'), 'Ada')
    await userEvent.type(screen.getByLabelText('Email'), 'ada@example.com')
    await userEvent.type(screen.getByLabelText('Password'), 'password-1')
    await userEvent.type(screen.getByLabelText('Confirm password'), 'password-2')
    await userEvent.click(screen.getByRole('button', { name: 'Create account' }))
    expect(screen.getByText('Passwords do not match')).toBeInTheDocument()

    await userEvent.clear(screen.getByLabelText('Confirm password'))
    await userEvent.type(screen.getByLabelText('Confirm password'), 'password-1')
    await userEvent.click(screen.getByRole('button', { name: 'Create account' }))
    expect(await screen.findByText('An account with this email already exists')).toBeInTheDocument()
  })
})

describe('OrdersPage', () => {
  it('lists the customer orders with status badges', async () => {
    mockApi({
      ...loginAs(),
      'GET /cart': { body: { items: [], itemCount: 0, subtotalCents: 0 } },
      'GET /orders': {
        body: {
          items: [
            { id: 'o1', number: 'ABCD1234', status: 'SHIPPED', paymentStatus: 'PAID', totalCents: 12800, itemCount: 1, createdAt: '2026-03-01T10:00:00Z', items: [] },
          ],
          page: 1,
          pageSize: 10,
          total: 1,
          totalPages: 1,
        },
      },
    })
    renderRoute(<OrdersPage />, { path: '/account/orders', route: '/account/orders' })
    expect(await screen.findByText('Order #ABCD1234')).toBeInTheDocument()
    expect(screen.getByText('Shipped')).toBeInTheDocument()
    expect(screen.getByText('Paid')).toBeInTheDocument()
    expect(screen.getByText('$128')).toBeInTheDocument()
  })
})
