import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { guestCart } from '../cart/guestCart'
import { mockApi, renderRoute, sampleProduct } from '../test/utils'
import { ProductDetailPage } from './ProductDetailPage'
import { ProductListPage } from './ProductListPage'

const facets = { brands: [], categories: [], colors: [], sizes: ['S', 'M'], price: { min: 5000, max: 20000 } }
const page = { items: [{ ...sampleProduct }], page: 1, pageSize: 12, total: 1, totalPages: 1 }

describe("women's / men's shop", () => {
  it('switches audience via tabs, scoping products and facets and dropping size filters', async () => {
    const { calls } = mockApi({ 'GET /products/facets': { body: facets }, 'GET /products': { body: page } })
    const { router } = renderRoute(<ProductListPage />, { path: '/shop', route: '/shop?size=M' })
    await screen.findByText('1 result')
    await userEvent.click(screen.getByRole('tab', { name: 'Women' }))

    expect(router.state.location.search).toBe('?gender=women')
    expect(await screen.findByRole('heading', { level: 1, name: 'Women' })).toBeInTheDocument()
    await waitFor(() => {
      expect(calls.some((c) => c.path === '/products' && c.method === 'GET')).toBe(true)
    })
    const fetchMock = globalThis.fetch as unknown as { mock: { calls: Array<[string]> } }
    const urls = fetchMock.mock.calls.map(([u]) => String(u))
    expect(urls.some((u) => u.includes('/products/facets?gender=women'))).toBe(true)
    expect(urls.some((u) => u.includes('/products?gender=women') && !u.includes('size='))).toBe(true)
    expect(screen.getByRole('tab', { name: 'Women' })).toHaveAttribute('aria-selected', 'true')
  })

  it('shows name, price and color on product cards', async () => {
    mockApi({ 'GET /products/facets': { body: facets }, 'GET /products': { body: page } })
    renderRoute(<ProductListPage />, { path: '/shop', route: '/shop' })
    const card = await screen.findByRole('article')
    expect(card).toHaveTextContent('Nike Club Hoodie')
    expect(card).toHaveTextContent('$120')
    expect(card).toHaveTextContent('Black/White')
  })

  it('shows color dots linking to the other colors when an item has several', async () => {
    const swatches = [
      { slug: 'nike-air', color: 'Black', colorway: 'Black/White' },
      { slug: 'nike-air-red', color: 'Red', colorway: 'University Red' },
    ]
    mockApi({ 'GET /products/facets': { body: facets }, 'GET /products': { body: { ...page, items: [{ ...sampleProduct, swatches }] } } })
    renderRoute(<ProductListPage />, { path: '/shop', route: '/shop' })
    const colors = await screen.findByRole('list', { name: 'Colors' })
    expect(within(colors).getByRole('link', { name: 'University Red' })).toHaveAttribute('href', '/products/nike-air-red')
  })

  it('quick-adds a size from the card without opening the product', async () => {
    mockApi({ 'GET /products/facets': { body: facets }, 'GET /products': { body: page } })
    renderRoute(<ProductListPage />, { path: '/shop', route: '/shop' })
    await userEvent.click(await screen.findByRole('button', { name: 'Quick add' }))
    expect(screen.getByRole('button', { name: 'S, sold out' })).toBeDisabled()
    await userEvent.click(screen.getByRole('button', { name: 'Add size L' }))
    await waitFor(() => expect(guestCart.items()).toEqual([expect.objectContaining({ variantId: 'v43', size: 'L', quantity: 1 })]))
  })
})

describe('product detail', () => {
  it('shows the color, links other colors, credits the photo and links back to the section', async () => {
    mockApi({ 'GET /products/nike-air': { body: sampleProduct } })
    renderRoute(<ProductDetailPage />, { path: '/products/:slug', route: '/products/nike-air' })
    expect(await screen.findByRole('heading', { level: 1, name: 'Nike Club Hoodie' })).toBeInTheDocument()
    expect(screen.getByText('Color:').parentElement).toHaveTextContent('Color: Black/White')
    expect(screen.getByRole('link', { name: 'University Red, sold out' })).toHaveAttribute('href', '/products/nike-air-red')
    expect(screen.getByRole('link', { name: 'Black/White' })).toHaveAttribute('aria-current', 'page')
    expect(screen.getByRole('link', { name: /Jane Doe, CC BY-SA 4.0/ })).toHaveAttribute('href', sampleProduct.imageSourceUrl)
    expect(screen.getByRole('link', { name: 'Men' })).toHaveAttribute('href', '/shop?gender=men')
  })

  it('opens the size guide', async () => {
    mockApi({ 'GET /products/nike-air': { body: sampleProduct } })
    renderRoute(<ProductDetailPage />, { path: '/products/:slug', route: '/products/nike-air' })
    await userEvent.click(await screen.findByRole('button', { name: 'Size guide' }))
    expect(screen.getByRole('dialog', { name: 'Size guide' })).toHaveTextContent('Chest / bust')
    await userEvent.keyboard('{Escape}')
    expect(screen.queryByRole('dialog', { name: 'Size guide' })).not.toBeInTheDocument()
  })
})
