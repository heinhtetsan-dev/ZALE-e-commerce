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

  // The men's Levi's 501 comes in two washes, shown as color dots on the card.
  await page.getByRole('searchbox', { name: 'Search clothing' }).fill('501')
  await page.getByRole('main').getByRole('button', { name: 'Search' }).click()
  const card = page.locator('article', { hasText: '$79.50' })
  await expect(card.getByRole('list', { name: 'Colors' }).getByRole('link')).toHaveCount(2)
  await card.getByRole('link', { name: "Levi's 501 Original Fit Jeans" }).click()

  await expect(page.getByText('Color:').locator('..')).toContainText('Medium Stonewash')
  await expect(page.getByText(/via Wikimedia Commons/)).toBeVisible()
  await page.getByRole('list', { name: 'Other colors' }).getByRole('link', { name: /Light Indigo/ }).click()
  await expect(page).toHaveURL(/light-indigo/)
  await expect(page.getByText('Color:').locator('..')).toContainText('Light Indigo Destructed')
  await expect(page.getByRole('heading', { level: 1 })).toHaveText("Levi's 501 Original Fit Jeans")
})

test('newsletter sign-up on the home page', async ({ page }) => {
  await page.goto('/')
  const band = page.getByRole('region', { name: 'Join the LUNE list' })
  await band.getByRole('textbox', { name: 'Email address' }).fill('not-an-email')
  await band.getByRole('button', { name: 'Subscribe' }).click()
  await expect(band.getByRole('alert')).toHaveText('Enter a valid email address')
  await band.getByRole('textbox', { name: 'Email address' }).fill(`e2e-${Date.now()}@example.com`)
  await band.getByRole('button', { name: 'Subscribe' }).click()
  await expect(band.getByText("Thank you, you're on the list.")).toBeVisible()
})
