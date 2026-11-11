import { expect, test } from '@playwright/test'

test("women's and men's sections, color switching and photo credits", async ({ page, isMobile }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { level: 1, name: 'Quiet layers for colder days' })).toBeVisible()

  if (isMobile) await page.getByRole('button', { name: 'Open menu' }).click()
  await page.getByRole('navigation', { name: isMobile ? 'Mobile' : 'Main' }).getByRole('link', { name: 'Women', exact: true }).click()
  await expect(page).toHaveURL(/\/shop\?gender=women$/)
  await expect(page.getByRole('heading', { level: 1, name: 'Women' })).toBeVisible()
  await expect(page.getByRole('tab', { name: 'Women', exact: true })).toHaveAttribute('aria-selected', 'true')
  await expect(page.locator('article').first()).toBeVisible()

  await page.getByRole('tab', { name: 'Men', exact: true }).click()
  await expect(page).toHaveURL(/\/shop\?gender=men$/)
  await expect(page.getByRole('heading', { level: 1, name: 'Men' })).toBeVisible()

  // Shoes have no section of their own: men's shoes are under Men.
  if (isMobile) await page.getByRole('button', { name: /^Filters/ }).click()
  const filters = isMobile ? page.getByRole('dialog', { name: 'Filters' }) : page.getByRole('complementary', { name: 'Filters' })
  await filters.getByLabel('Shoes').click()
  await expect(page).toHaveURL(/gender=men.*category=shoes|category=shoes.*gender=men/)
  if (isMobile) await filters.getByRole('button', { name: /^Show/ }).click()
  await expect(page.locator('article', { hasText: 'Chelsea Boots' })).toBeVisible()
  await expect(page.locator('article', { hasText: 'Strappy Heeled Sandals' })).toHaveCount(0)

  // The men's Slim Jeans come in three colors, named in text (no color boxes).
  await page.goto('/shop?gender=men&q=slim%20jeans')
  const card = page.locator('article', { hasText: 'Mid Blue' })
  await expect(card).toContainText('3 colors')
  await expect(page.getByRole('list', { name: 'Colors' })).toHaveCount(0)
  await card.getByRole('link', { name: 'Slim Jeans' }).click()

  await expect(page.getByText('Color:').locator('..')).toContainText('Mid Blue')
  await expect(page.getByText(/Photo: Unsplash/)).toBeVisible()
  await page.getByRole('list', { name: 'Other colors' }).getByRole('link', { name: /Dark Indigo/ }).click()
  await expect(page).toHaveURL(/dark-indigo/)
  await expect(page.getByText('Color:').locator('..')).toContainText('Dark Indigo')
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Slim Jeans')
  await expect(page.getByRole('link', { name: /^Mid Blue/ })).toBeVisible()
})

test('newsletter sign-up on the home page', async ({ page }) => {
  await page.goto('/')
  const band = page.getByRole('region', { name: 'Join the ZALE list' })
  await band.getByRole('textbox', { name: 'Email address' }).fill('not-an-email')
  await band.getByRole('button', { name: 'Subscribe' }).click()
  await expect(band.getByRole('alert')).toHaveText('Enter a valid email address')
  await band.getByRole('textbox', { name: 'Email address' }).fill(`e2e-${Date.now()}@example.com`)
  await band.getByRole('button', { name: 'Subscribe' }).click()
  await expect(band.getByText("Thank you, you're on the list.")).toBeVisible()
})
