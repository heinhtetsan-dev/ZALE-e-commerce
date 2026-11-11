import { expect, test } from '@playwright/test'

test("men's and women's sections, colorway switching and photo credits", async ({ page, isMobile }) => {
  await page.goto('/')
  if (isMobile) await page.getByRole('button', { name: 'Open menu' }).click()
  await page.getByRole('navigation', { name: isMobile ? 'Mobile' : 'Main' }).getByRole('link', { name: 'Women', exact: true }).click()
  await expect(page).toHaveURL(/\?gender=women$/)
  await expect(page.getByRole('heading', { name: 'Dresses, knitwear, coats and essentials for women.' })).toBeVisible()
  await expect(page.getByRole('tab', { name: 'Women', exact: true })).toHaveAttribute('aria-selected', 'true')
  await expect(page.locator('article').first()).toBeVisible()
  for (const text of await page.locator('article p.uppercase').allTextContents()) expect(text).toMatch(/Women's|Unisex/)

  await page.getByRole('tab', { name: 'Men', exact: true }).click()
  await expect(page).toHaveURL(/\?gender=men$/)
  await expect(page.locator('article p.uppercase', { hasText: "Women's" })).toHaveCount(0)
  await expect(page.locator('article').first()).toBeVisible()
  for (const text of await page.locator('article p.uppercase').allTextContents()) expect(text).toMatch(/Men's|Unisex/)

  // The men's Levi's 501 comes in two washes.
  await page.getByRole('searchbox', { name: 'Search clothing' }).fill('501')
  await page.getByRole('button', { name: 'Search' }).click()
  await page.locator('article', { hasText: 'Medium Stonewash' }).locator('a').first().click()
  await expect(page.getByText('Color:').locator('..')).toContainText('Medium Stonewash')
  await expect(page.getByText(/via Wikimedia Commons/)).toBeVisible()
  await page.getByRole('list', { name: 'Other colors' }).getByRole('link', { name: /Light Indigo/ }).click()
  await expect(page).toHaveURL(/light-indigo/)
  await expect(page.getByText('Color:').locator('..')).toContainText('Light Indigo Destructed')
  await expect(page.getByRole('heading', { level: 1 })).toHaveText("Levi's 501 Original Fit Jeans")
})
