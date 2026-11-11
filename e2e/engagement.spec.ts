import { expect, test, type Page } from '@playwright/test'

async function loginAsCustomer(page: Page) {
  await page.goto('/login')
  await page.getByLabel('Email').fill('customer@shoeshop.test')
  await page.getByLabel('Password').fill('Customer123!')
  await page.getByRole('button', { name: 'Log in' }).click()
  await expect(page).not.toHaveURL(/\/login$/)
}

test('wishlist: save from the detail page, view, and remove', async ({ page }) => {
  await loginAsCustomer(page)
  await page.goto('/shop?q=barbour%20wax')
  await page.locator('article a').first().click()
  await expect(page).toHaveURL(/\/products\//)
  const name = (await page.getByRole('heading', { level: 1 }).textContent())!.trim()

  const heart = page.getByRole('main').getByRole('button', { name: /wishlist/ }).first()
  if ((await heart.getAttribute('aria-pressed')) === 'true') await heart.click()
  await expect(heart).toHaveAttribute('aria-pressed', 'false')
  await heart.click()
  await expect(heart).toHaveAttribute('aria-pressed', 'true')

  await page.goto('/wishlist')
  const card = page.locator('article', { hasText: name })
  await expect(card).toBeVisible()
  await card.getByRole('button', { name: 'Remove from wishlist' }).click()
  await expect(page.locator('article', { hasText: name })).toHaveCount(0)
})

test('reviews: write, see the rating update, edit and delete', async ({ page }) => {
  await loginAsCustomer(page)
  await page.goto('/shop?q=trucker')
  await page.locator('article a').first().click()
  await expect(page).toHaveURL(/\/products\//)
  const reviews = page.locator('#reviews')

  // Start clean if a previous run left a review behind (wait until we know which it is).
  await expect(reviews.getByRole('button', { name: /Write a review|Edit your review/ })).toBeVisible()
  if (await reviews.getByRole('button', { name: 'Edit your review' }).isVisible()) {
    await reviews.getByRole('button', { name: 'Edit your review' }).click()
    await reviews.getByRole('button', { name: 'Delete review' }).click()
  }

  await reviews.getByRole('button', { name: 'Write a review' }).click()
  await reviews.getByRole('radio', { name: '5 stars' }).click()
  await reviews.getByLabel('Title (optional)').fill('Classic look')
  await reviews.getByLabel('Your review (optional)').fill('True to size and very comfortable.')
  await reviews.getByRole('button', { name: 'Submit review' }).click()
  await expect(reviews.getByText('Classic look')).toBeVisible()
  await expect(page.getByRole('link', { name: /5\.0 \(1\)/ })).toBeVisible()

  await reviews.getByRole('button', { name: 'Edit your review' }).click()
  await reviews.getByRole('radio', { name: '3 stars' }).click()
  await reviews.getByRole('button', { name: 'Update review' }).click()
  await expect(page.getByRole('link', { name: /3\.0 \(1\)/ })).toBeVisible()

  await reviews.getByRole('button', { name: 'Edit your review' }).click()
  await reviews.getByRole('button', { name: 'Delete review' }).click()
  await expect(reviews.getByText('No reviews yet.', { exact: false })).toBeVisible()
})
