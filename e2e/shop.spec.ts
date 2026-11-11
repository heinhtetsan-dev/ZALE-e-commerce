import { expect, test, type Page } from '@playwright/test'
import { newShopper } from './helpers.js'

const CUSTOMER = { email: 'customer@shoeshop.test', password: 'Customer123!' }

async function openFirstInStockProduct(page: Page) {
  await page.goto('/shop?sort=price_asc')
  const card = page.locator('article').filter({ hasNot: page.getByText('Sold out') }).first()
  await card.locator('a').first().click()
  await expect(page.getByRole('radiogroup', { name: 'Size' })).toBeVisible()
}

async function login(page: Page, who = CUSTOMER) {
  await page.getByLabel('Email').fill(who.email)
  await page.getByLabel('Password').fill(who.password)
  await page.getByRole('button', { name: 'Log in' }).click()
}

test('search, filter, sort and paginate the catalog', async ({ page, isMobile }) => {
  await page.goto('/shop')
  await expect(page.getByText(/\d+ results/)).toBeVisible()

  await page.getByRole('searchbox', { name: 'Search clothing' }).fill('slim jeans')
  await page.getByRole('main').getByRole('button', { name: 'Search' }).click()
  await expect(page).toHaveURL(/q=slim/)
  await expect(page.locator('article')).toHaveCount(3)
  for (const text of await page.locator('article').allTextContents()) expect(text).toContain('Slim Jeans')

  await page.goto('/shop')
  if (isMobile) await page.getByRole('button', { name: /^Filters/ }).click()
  const filters = isMobile ? page.getByRole('dialog', { name: 'Filters' }) : page.getByRole('complementary', { name: 'Filters' })
  await filters.getByLabel('Jackets & Coats').click()
  await expect(page).toHaveURL(/category=jackets-and-coats/)
  await filters.getByRole('button', { name: 'Black', exact: true }).click()
  await expect(page).toHaveURL(/color=Black/)
  if (isMobile) await filters.getByRole('button', { name: /^Show/ }).click()
  await expect(page.locator('article').first()).toBeVisible()
  await expect(page.locator('article')).toHaveCount(2)
  for (const text of await page.locator('article').allTextContents()) expect(text).toMatch(/Black/)

  await page.goto('/shop?sort=price_desc')
  const prices = (await page.locator('article p.font-medium').allTextContents()).map((p) => Number(p.replace(/[$,]/g, '')))
  expect(prices).toEqual([...prices].sort((a, b) => b - a))
  await page.getByRole('button', { name: 'Next page' }).click()
  await expect(page).toHaveURL(/page=2/)
  await expect(page.getByRole('button', { name: '2', exact: true })).toHaveAttribute('aria-current', 'page')
})

test('filters keep the scroll position and there is no brand filter', async ({ page, isMobile }) => {
  test.skip(isMobile, 'Mobile filters live in a drawer; the page underneath does not scroll.')
  await page.goto('/shop')
  const filters = page.getByRole('complementary', { name: 'Filters' })
  await expect(filters.getByText('Category', { exact: true })).toBeVisible()
  await expect(filters.getByText('Brand', { exact: true })).toHaveCount(0)

  const black = filters.getByRole('button', { name: 'Black', exact: true })
  await black.scrollIntoViewIfNeeded()
  const before = await page.evaluate(() => (globalThis as unknown as { scrollY: number }).scrollY)
  expect(before).toBeGreaterThan(200)
  await black.click()
  await expect(page).toHaveURL(/color=Black/)
  await expect(black).toHaveAttribute('aria-pressed', 'true')
  const after = await page.evaluate(() => (globalThis as unknown as { scrollY: number }).scrollY)
  expect(Math.abs(after - before)).toBeLessThan(50)
})

test('guest bag requires a size, opens the bag drawer, then checks out after login', async ({ page, request }) => {
  const shopper = await newShopper(request)
  await openFirstInStockProduct(page)
  const name = (await page.getByRole('heading', { level: 1 }).textContent())!.trim()

  await page.getByRole('button', { name: 'Add to bag' }).click()
  await expect(page.getByText('Please select a size first.')).toBeVisible()

  await page.getByRole('radiogroup', { name: 'Size' }).getByRole('radio').and(page.locator(':enabled')).first().click()
  await page.getByRole('button', { name: 'Add to bag' }).click()

  // Adding opens the bag drawer on the same page.
  const bag = page.getByRole('dialog', { name: 'Shopping bag' })
  await expect(bag.getByText('Added to your bag')).toBeVisible()
  await expect(bag.getByText(name)).toBeVisible()
  await expect(page.getByRole('button', { name: 'Bag, 1 items' })).toBeAttached()
  await bag.getByRole('button', { name: 'Log in to checkout' }).click()

  await login(page, shopper)
  await expect(page).toHaveURL(/\/checkout$/)
  await expect(page.getByText(name).first()).toBeVisible()

  await page.getByLabel('Full name').fill('Test Shopper')
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

test('protected pages redirect to login and profile can be updated', async ({ page }) => {
  await page.goto('/account')
  await expect(page).toHaveURL(/\/login$/)
  await login(page)
  await expect(page.getByRole('heading', { name: 'My account' })).toBeVisible()
  await page.getByLabel('Name').fill('Casey C.')
  await page.getByRole('button', { name: 'Save changes' }).click()
  await expect(page.getByText('Profile updated.')).toBeVisible()
  await page.getByLabel('Name').fill('Casey Customer')
  await page.getByRole('button', { name: 'Save changes' }).click()

  await page.getByRole('main').getByRole('button', { name: 'Log out' }).click()
  await expect(page).toHaveURL(/\/$/)
  await page.goto('/account')
  await expect(page).toHaveURL(/\/login$/)
})

test('quick add from a product card opens the bag drawer', async ({ page }) => {
  await page.goto('/shop?category=accessories&sort=price_asc')
  const card = page.locator('article').filter({ hasNot: page.getByText('Sold out') }).first()
  const name = (await card.getByRole('heading', { level: 3 }).textContent())!.trim()
  await card.hover()
  const quick = card.getByRole('button', { name: /^(Quick add|Add to bag)$/ })
  const label = await quick.textContent()
  await quick.click()
  if (label?.includes('Quick add')) await card.getByRole('button', { name: /^Add size/ }).first().click()
  const bag = page.getByRole('dialog', { name: 'Shopping bag' })
  await expect(bag.getByText('Added to your bag')).toBeVisible()
  await expect(bag.getByText(name)).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(bag).toBeHidden()
})

test('layout is usable on narrow screens without horizontal scrolling', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 740 })
  for (const path of ['/', '/shop', '/products/slim-jeans-mid-blue-mens', '/cart', '/login', '/help/size-guide']) {
    await page.goto(path)
    await page.waitForLoadState('networkidle')
    const overflow = await page.evaluate(() => {
      const el = (globalThis as unknown as { document: { documentElement: { scrollWidth: number; clientWidth: number } } }).document.documentElement
      return el.scrollWidth - el.clientWidth
    })
    expect(overflow, `horizontal overflow on ${path}`).toBeLessThanOrEqual(0)
  }
})
