import { expect, test, type Page } from '@playwright/test'
import { newShopper } from './helpers.js'

const ADMIN = { email: 'admin@shoeshop.test', password: 'Admin123!' }
const CUSTOMER = { email: 'customer@shoeshop.test', password: 'Customer123!' }

async function login(page: Page, who: { email: string; password: string }) {
  await page.goto('/login')
  await page.getByLabel('Email').fill(who.email)
  await page.getByLabel('Password').fill(who.password)
  await page.getByRole('button', { name: 'Log in' }).click()
  await expect(page).not.toHaveURL(/\/login$/)
}

async function logout(page: Page) {
  await page.goto('/account')
  await page.getByRole('main').getByRole('button', { name: 'Log out' }).click()
  await expect(page).toHaveURL(/\/$/)
}

// Remove test products even if a test failed midway, so they never linger in the shop.
// The API hides (rather than deletes) products that appear in orders.
test.afterAll(async ({ request }) => {
  const { token } = await (await request.post('/api/v1/auth/login', { data: ADMIN })).json()
  const headers = { Authorization: `Bearer ${token}` }
  const list = await (await request.get('/api/v1/admin/products?q=E2E%20Tee&pageSize=48', { headers })).json()
  for (const p of list.items as Array<{ id: string; name: string; isActive: boolean }>) {
    if (p.name.startsWith('E2E Tee') && p.isActive) await request.delete(`/api/v1/admin/products/${p.id}`, { headers })
  }
})

test('customers cannot open admin pages', async ({ page }) => {
  await login(page, CUSTOMER)
  await page.goto('/admin')
  await expect(page).toHaveURL(/\/$/)
  await expect(page.getByRole('link', { name: 'Admin' })).toHaveCount(0)
})

test('admin creates a product, stocks sizes, and fulfils an order', async ({ page, request }) => {
  const name = `E2E Tee ${Date.now()}`

  await login(page, ADMIN)
  await expect(page).toHaveURL(/\/admin$/)
  await expect(page.getByRole('heading', { name: 'Sales overview' })).toBeVisible()
  await expect(page.getByRole('img', { name: 'Revenue per day bar chart' })).toBeVisible()

  // Create
  await page.getByRole('navigation', { name: 'Admin' }).getByRole('link', { name: 'Products' }).click()
  await page.getByRole('link', { name: '+ New product' }).click()
  await page.getByLabel('Name', { exact: true }).fill(name)
  await page.getByLabel('Brand').selectOption({ label: 'ZALE Essentials' })
  await page.getByLabel('Category').selectOption({ label: 'Tops & T-Shirts' })
  await page.getByLabel('Base color (for filters)').fill('Green')
  await page.getByLabel('Color name (as sold)').fill('Forest Green')
  await page.getByLabel('Gender').selectOption('MEN')
  await page.getByLabel('Price (USD)').fill('99.50')
  await page.getByLabel('Description').fill('Created by an end-to-end test.')
  await page.getByRole('button', { name: 'Create product' }).click()
  await expect(page.getByRole('heading', { name, level: 1 })).toBeVisible()

  // Stock per size: one M, two L
  await page.getByRole('button', { name: '+ Add size' }).click()
  await page.getByPlaceholder('Size').last().fill('m')
  await page.getByPlaceholder('Stock').last().fill('1')
  await page.getByRole('button', { name: '+ Add size' }).click()
  await page.getByPlaceholder('Size').last().fill('L')
  await page.getByPlaceholder('Stock').last().fill('2')
  await page.getByRole('button', { name: 'Save stock' }).click()
  await expect(page.getByText('Stock updated.')).toBeVisible()
  await expect(page.getByText('3 items in stock')).toBeVisible()
  await logout(page)

  // A shopper buys the only size M
  await login(page, await newShopper(request))
  await page.goto(`/shop?q=${encodeURIComponent(name)}`)
  await page.locator('article a').first().click()
  await expect(page.getByText('$99.50')).toBeVisible()
  await page.getByRole('radio', { name: 'M', exact: true }).click()
  await expect(page.getByText('Only 1 left')).toBeVisible()
  await page.getByRole('button', { name: 'Add to bag' }).click()
  await expect(page.getByRole('dialog', { name: 'Shopping bag' }).getByText('Added to your bag')).toBeVisible()
  await page.goto('/checkout')
  await page.getByLabel('Full name').fill('Test Shopper')
  await page.getByLabel('Address', { exact: true }).fill('1 Test Street')
  await page.getByLabel('City').fill('Springfield')
  await page.getByLabel('Postal code').fill('12345')
  await page.getByLabel('Country code').fill('US')
  await page.getByRole('button', { name: 'Place order & pay' }).click()
  await page.getByRole('button', { name: /^Pay \$/ }).click()
  await expect(page.getByRole('heading', { name: 'Thank you for your order!' })).toBeVisible()
  const orderNumber = (await page.getByText(/^Order #/).first().textContent())!.match(/#([A-Z0-9]+)/)![1]!

  // Size M is now sold out on the product page
  await page.goto(`/shop?q=${encodeURIComponent(name)}`)
  await page.locator('article a').first().click()
  await expect(page.getByRole('radio', { name: 'M', exact: true })).toBeDisabled()
  await logout(page)

  // Admin ships and delivers
  await login(page, ADMIN)
  await page.goto('/admin/orders?status=PENDING')
  const row = page.locator('li', { hasText: `#${orderNumber}` })
  await row.getByRole('button', { name: 'Mark shipped' }).click()
  await page.goto('/admin/orders?status=SHIPPED')
  await page.locator('li', { hasText: `#${orderNumber}` }).getByRole('button', { name: 'Mark delivered' }).click()
  await page.goto('/admin/orders?status=DELIVERED')
  await expect(page.locator('li', { hasText: `#${orderNumber}` })).toBeVisible()

  // Stock was decremented at checkout: size M now shows 0 in the admin editor
  await page.goto('/admin/products')
  await page.getByRole('searchbox', { name: 'Search products' }).fill(name)
  await page.getByRole('main').getByRole('button', { name: 'Search', exact: true }).click()
  await page.getByRole('link', { name: new RegExp(name) }).click()
  await expect(page.getByLabel('Stock for size M', { exact: true })).toHaveValue('0')
  await expect(page.getByText('2 items in stock')).toBeVisible()

  // Clean up: ordered products are hidden, not deleted
  await page.getByRole('button', { name: 'Delete…' }).click()
  await page.getByRole('button', { name: 'Yes, delete' }).click()
  await expect(page).toHaveURL(/\/admin\/products$/)
})
