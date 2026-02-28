import { expect, test } from '@playwright/test'

test('initial page screenshot', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByText('Words I Like')).toBeVisible()
  await expect(page).toHaveScreenshot('initial-load.png')
})
