import { expect, test } from '@playwright/test'

test("men's and women's sections, colorway switching and photo credits", async ({ page, isMobile }) => {
  await page.goto('/')
  if (isMobile) await page.getByRole('button', { name: 'Open menu' }).click()
  await page.getByRole('navigation', { name: isMobile ? 'Mobile' : 'Main' }).getByRole('link', { name: 'Women', exact: true }).click()
  await expect(page).toHaveURL(/\?gender=women$/)
  await expect(page.getByRole('heading', { name: 'Sneakers, runners and boots for women.' })).toBeVisible()
  await expect(page.getByRole('tab', { name: 'Women', exact: true })).toHaveAttribute('aria-selected', 'true')
  await expect(page.locator('article').first()).toBeVisible()
  for (const text of await page.locator('article p.uppercase').allTextContents()) expect(text).toMatch(/Women's|Unisex/)

  await page.getByRole('tab', { name: 'Men', exact: true }).click()
  await expect(page).toHaveURL(/\?gender=men$/)
  await expect(page.locator('article p.uppercase', { hasText: "Women's" })).toHaveCount(0)
  await expect(page.locator('article').first()).toBeVisible()
  for (const text of await page.locator('article p.uppercase').allTextContents()) expect(text).toMatch(/Men's|Unisex/)

  // Dunk Low has two colorways for men: Panda (unisex) and Varsity Green.
  await page.getByRole('searchbox', { name: 'Search shoes' }).fill('dunk')
  await page.getByRole('button', { name: 'Search' }).click()
  await page.locator('article', { hasText: 'Varsity Green' }).locator('a').first().click()
  await expect(page.getByText('Colorway:').locator('..')).toContainText('White/Varsity Green')
  await expect(page.getByText(/via Wikimedia Commons/)).toBeVisible()
  await page.getByRole('list', { name: 'Other colorways' }).getByRole('link', { name: /Panda/ }).click()
  await expect(page).toHaveURL(/panda/)
  await expect(page.getByText('Colorway:').locator('..')).toContainText('White/Black (Panda)')
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Nike Dunk Low Retro')
})
