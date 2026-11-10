import { expect, test, type Page } from '@playwright/test'

const ADMIN = { email: 'admin@shoeshop.test', password: 'Admin123!' }
const CUSTOMER = { email: 'customer@shoeshop.test', password: 'Customer123!' }

async function login(page: Page, who: { email: string; password: string }) {
  await page.goto('/login')
  await page.getByLabel('Email').fill(who.email)
  await page.getByLabel('Password').fill(who.password)
  await page.getByRole('button', { name: 'Log in' }).click()
  await expect(page).not.toHaveURL(/\/login$/)
}

async function logout(page: Page, isMobile: boolean) {
  if (isMobile) await page.getByRole('button', { name: 'Open menu' }).click()
  await page.getByRole('button', { name: 'Log out' }).last().click()
  await expect(page.getByRole('banner').getByRole('link', { name: 'Log in' })).toBeVisible()
}

test('customers cannot open admin pages', async ({ page }) => {
  await login(page, CUSTOMER)
  await page.goto('/admin')
  await expect(page).toHaveURL(/\/$/)
  await expect(page.getByRole('link', { name: 'Admin' })).toHaveCount(0)
})

test('admin creates a product, stocks sizes, and fulfils an order', async ({ page, isMobile }) => {
  const name = `E2E Runner ${Date.now()}`

  await login(page, ADMIN)
  await expect(page).toHaveURL(/\/admin$/)
  await expect(page.getByRole('heading', { name: 'Sales overview' })).toBeVisible()
  await expect(page.getByRole('img', { name: 'Revenue per day bar chart' })).toBeVisible()

  // Create
  await page.getByRole('navigation', { name: 'Admin' }).getByRole('link', { name: 'Products' }).click()
  await page.getByRole('link', { name: '+ New product' }).click()
  await page.getByLabel('Name').fill(name)
  await page.getByLabel('Brand').selectOption({ label: 'Asics' })
  await page.getByLabel('Category').selectOption({ label: 'Running' })
  await page.getByLabel('Color').fill('Green')
  await page.getByLabel('Price (USD)').fill('99.50')
  await page.getByLabel('Description').fill('Created by an end-to-end test.')
  await page.getByRole('button', { name: 'Create product' }).click()
  await expect(page.getByRole('heading', { name, level: 1 })).toBeVisible()

  // Stock per size: one pair of 44, two of 44.5
  await page.getByRole('button', { name: '+ Add size' }).click()
  await page.getByPlaceholder('Size').last().fill('44')
  await page.getByPlaceholder('Stock').last().fill('1')
  await page.getByRole('button', { name: '+ Add size' }).click()
  await page.getByPlaceholder('Size').last().fill('44.5')
  await page.getByPlaceholder('Stock').last().fill('2')
  await page.getByRole('button', { name: 'Save stock' }).click()
  await expect(page.getByText('Stock updated.')).toBeVisible()
  await expect(page.getByText('3 pairs total')).toBeVisible()
  await logout(page, isMobile)

  // Customer buys the only pair of size 44
  await login(page, CUSTOMER)
  await page.goto(`/?q=${encodeURIComponent(name)}`)
  await page.locator('article a').first().click()
  await expect(page.getByText('$99.50')).toBeVisible()
  await page.getByRole('radio', { name: '44', exact: true }).click()
  await expect(page.getByText('Only 1 left')).toBeVisible()
  await page.getByRole('button', { name: 'Add to cart' }).click()
  await expect(page.getByText(/Added .* to your cart/)).toBeVisible()
  await page.goto('/checkout')
  await page.getByLabel('Full name').fill('Casey Customer')
  await page.getByLabel('Address', { exact: true }).fill('1 Test Street')
  await page.getByLabel('City').fill('Springfield')
  await page.getByLabel('Postal code').fill('12345')
  await page.getByLabel('Country code').fill('US')
  await page.getByRole('button', { name: 'Place order & pay' }).click()
  await page.getByRole('button', { name: /^Pay \$/ }).click()
  await expect(page.getByRole('heading', { name: 'Thank you for your order!' })).toBeVisible()
  const orderNumber = (await page.getByText(/^Order #/).first().textContent())!.match(/#([A-Z0-9]+)/)![1]!

  // Size 44 is now sold out on the product page
  await page.goto(`/?q=${encodeURIComponent(name)}`)
  await page.locator('article a').first().click()
  await expect(page.getByRole('radio', { name: '44', exact: true })).toBeDisabled()
  await logout(page, isMobile)

  // Admin ships and delivers
  await login(page, ADMIN)
  await page.goto('/admin/orders?status=PENDING')
  const row = page.locator('li', { hasText: `#${orderNumber}` })
  await row.getByRole('button', { name: 'Mark shipped' }).click()
  await page.goto('/admin/orders?status=SHIPPED')
  await page.locator('li', { hasText: `#${orderNumber}` }).getByRole('button', { name: 'Mark delivered' }).click()
  await page.goto('/admin/orders?status=DELIVERED')
  await expect(page.locator('li', { hasText: `#${orderNumber}` })).toBeVisible()

  // Stock was decremented at checkout: size 44 now shows 0 in the admin editor
  await page.goto('/admin/products')
  await page.getByRole('searchbox', { name: 'Search products' }).fill(name)
  await page.getByRole('button', { name: 'Search', exact: true }).click()
  await page.getByRole('link', { name: new RegExp(name) }).click()
  await expect(page.getByLabel('Stock for size 44', { exact: true })).toHaveValue('0')
  await expect(page.getByText('2 pairs total')).toBeVisible()

  // Clean up: ordered products are hidden, not deleted
  await page.getByRole('button', { name: 'Delete…' }).click()
  await page.getByRole('button', { name: 'Yes, delete' }).click()
  await expect(page).toHaveURL(/\/admin\/products$/)
})
