import { expect, test, type Page } from '@playwright/test'

const CUSTOMER = { email: 'customer@shoeshop.test', password: 'Customer123!' }

async function openFirstInStockProduct(page: Page) {
  await page.goto('/?sort=price_asc')
  const card = page.locator('article').filter({ hasNot: page.getByText('Sold out') }).first()
  await card.locator('a').first().click()
  await expect(page.getByRole('radiogroup', { name: 'Size' })).toBeVisible()
}

async function login(page: Page) {
  await page.getByLabel('Email').fill(CUSTOMER.email)
  await page.getByLabel('Password').fill(CUSTOMER.password)
  await page.getByRole('button', { name: 'Log in' }).click()
}

test('search, filter, sort and paginate the catalog', async ({ page, isMobile }) => {
  await page.goto('/')
  await expect(page.getByText(/\d+ results/)).toBeVisible()

  await page.getByRole('searchbox', { name: 'Search shoes' }).fill('gel')
  await page.getByRole('button', { name: 'Search' }).click()
  await expect(page).toHaveURL(/q=gel/)
  await expect(page.locator('article')).toHaveCount(3)
  await expect(page.locator('article').first()).toContainText('Asics')

  await page.goto('/')
  if (isMobile) await page.getByRole('button', { name: /^Filters/ }).click()
  const filters = isMobile ? page.getByRole('dialog', { name: 'Filters' }) : page.getByRole('complementary', { name: 'Filters' })
  await filters.getByLabel('Boots').click()
  await expect(page).toHaveURL(/category=boots/)
  await filters.getByRole('button', { name: 'Black', exact: true }).click()
  await expect(page).toHaveURL(/color=Black/)
  if (isMobile) await filters.getByRole('button', { name: /^Show/ }).click()
  await expect(page.locator('article').first()).toBeVisible()
  for (const text of await page.locator('article').allTextContents()) expect(text).toMatch(/Boots · Black/)

  await page.goto('/?sort=price_desc')
  const prices = (await page.locator('article p.font-bold').allTextContents()).map((p) => Number(p.replace(/[$,]/g, '')))
  expect(prices).toEqual([...prices].sort((a, b) => b - a))
  await page.getByRole('button', { name: 'Next page' }).click()
  await expect(page).toHaveURL(/page=2/)
  await expect(page.getByRole('button', { name: '2', exact: true })).toHaveAttribute('aria-current', 'page')
})

test('guest cart requires a size, then checks out after login and shows in order history', async ({ page }) => {
  await openFirstInStockProduct(page)
  const name = (await page.getByRole('heading', { level: 1 }).textContent())!.trim()

  await page.getByRole('button', { name: 'Add to cart' }).click()
  await expect(page.getByText('Please select a size first.')).toBeVisible()

  await page.getByRole('radiogroup', { name: 'Size' }).getByRole('radio').and(page.locator(':enabled')).first().click()
  await page.getByRole('button', { name: 'Add to cart' }).click()
  await expect(page.getByText(/Added .* to your cart/)).toBeVisible()

  await page.getByRole('link', { name: /Cart, 1 items/ }).click()
  await expect(page.getByRole('heading', { name: 'Your cart' })).toBeVisible()
  await expect(page.getByText(name).first()).toBeVisible()
  await page.getByRole('button', { name: 'Log in to checkout' }).click()

  await login(page)
  await expect(page).toHaveURL(/\/checkout$/)
  await expect(page.getByText(name).first()).toBeVisible()

  await page.getByLabel('Full name').fill('Casey Customer')
  await page.getByLabel('Address', { exact: true }).fill('1 Test Street')
  await page.getByLabel('City').fill('Springfield')
  await page.getByLabel('Postal code').fill('12345')
  await page.getByLabel('Country code').fill('US')
  await page.getByRole('button', { name: 'Place order & pay' }).click()

  await expect(page).toHaveURL(/\/orders\/.+\/pay$/)
  await page.getByRole('button', { name: /^Pay \$/ }).click()
  await expect(page.getByRole('heading', { name: 'Thank you for your order!' })).toBeVisible()
  const number = (await page.getByText(/^Order #/).first().textContent()) ?? ''
  const orderNumber = number.match(/#([A-Z0-9]+)/)![1]!

  await page.goto('/account/orders')
  await expect(page.getByText(`Order #${orderNumber}`)).toBeVisible()
  await page.getByText(`Order #${orderNumber}`).click()
  await expect(page.getByRole('heading', { name: `Order #${orderNumber}` })).toBeVisible()
  await expect(page.getByText('Paid', { exact: true })).toBeVisible()
  await expect(page.getByText(name).first()).toBeVisible()
})

test('protected pages redirect to login and profile can be updated', async ({ page, isMobile }) => {
  await page.goto('/account')
  await expect(page).toHaveURL(/\/login$/)
  await login(page)
  await expect(page.getByRole('heading', { name: 'My account' })).toBeVisible()
  await page.getByLabel('Name').fill('Casey C.')
  await page.getByRole('button', { name: 'Save changes' }).click()
  await expect(page.getByText('Profile updated.')).toBeVisible()
  await page.getByLabel('Name').fill('Casey Customer')
  await page.getByRole('button', { name: 'Save changes' }).click()

  if (isMobile) await page.getByRole('button', { name: 'Open menu' }).click()
  await page.getByRole('button', { name: 'Log out' }).last().click()
  await expect(page.getByRole('link', { name: 'Log in' })).toBeVisible()
})

test('layout is usable on narrow screens without horizontal scrolling', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 740 })
  for (const path of ['/', '/cart', '/login']) {
    await page.goto(path)
    await page.waitForLoadState('networkidle')
    const overflow = await page.evaluate(() => {
      const el = (globalThis as unknown as { document: { documentElement: { scrollWidth: number; clientWidth: number } } }).document.documentElement
      return el.scrollWidth - el.clientWidth
    })
    expect(overflow, `horizontal overflow on ${path}`).toBeLessThanOrEqual(0)
  }
})
