import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { mockApi, renderRoute, sampleProduct } from '../test/utils'
import { ProductDetailPage } from './ProductDetailPage'
import { ProductListPage } from './ProductListPage'

const facets = { brands: [], categories: [], colors: [], sizes: [40, 42], price: { min: 5000, max: 20000 } }
const page = { items: [{ ...sampleProduct }], page: 1, pageSize: 12, total: 1, totalPages: 1 }

describe("men's / women's catalog", () => {
  it('switches audience via tabs, scoping products and facets and dropping size filters', async () => {
    const { calls } = mockApi({ 'GET /products/facets': { body: facets }, 'GET /products': { body: page } })
    const { router } = renderRoute(<ProductListPage />, { path: '/', route: '/?size=42' })
    await screen.findByText('1 result')
    await userEvent.click(screen.getByRole('tab', { name: 'Women' }))

    expect(router.state.location.search).toBe('?gender=women')
    expect(await screen.findByRole('heading', { name: 'Sneakers, runners and boots for women.' })).toBeInTheDocument()
    await waitFor(() => {
      expect(calls.some((c) => c.path === '/products' && c.method === 'GET')).toBe(true)
    })
    const fetchMock = globalThis.fetch as unknown as { mock: { calls: Array<[string]> } }
    const urls = fetchMock.mock.calls.map(([u]) => String(u))
    expect(urls.some((u) => u.includes('/products/facets?gender=women'))).toBe(true)
    expect(urls.some((u) => u.includes('/products?gender=women') && !u.includes('size='))).toBe(true)
    expect(screen.getByRole('tab', { name: 'Women' })).toHaveAttribute('aria-selected', 'true')
  })

  it('shows gender and colorway on product cards', async () => {
    mockApi({ 'GET /products/facets': { body: facets }, 'GET /products': { body: page } })
    renderRoute(<ProductListPage />)
    const card = await screen.findByRole('article')
    expect(card).toHaveTextContent("Nike · Men's")
    expect(card).toHaveTextContent('Black/White')
  })
})

describe('product detail colorways', () => {
  it('shows colorway, links other colorways and credits the photo', async () => {
    mockApi({ 'GET /products/nike-air': { body: sampleProduct } })
    renderRoute(<ProductDetailPage />, { path: '/products/:slug', route: '/products/nike-air' })
    expect(await screen.findByText("Select size (EU, men's)")).toBeInTheDocument()
    expect(screen.getByText('Colorway:').parentElement).toHaveTextContent('Colorway: Black/White')
    expect(screen.getByRole('link', { name: 'University Red, sold out' })).toHaveAttribute('href', '/products/nike-air-red')
    expect(screen.getByRole('link', { name: 'Black/White' })).toHaveAttribute('aria-current', 'page')
    expect(screen.getByRole('link', { name: /Jane Doe, CC BY-SA 4.0/ })).toHaveAttribute('href', sampleProduct.imageSourceUrl)
    expect(screen.getByRole('link', { name: "Men's" })).toHaveAttribute('href', '/?gender=men')
  })
})
