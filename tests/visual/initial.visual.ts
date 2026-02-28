import { expect, test } from '@playwright/test'

test('initial page screenshot', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByPlaceholder('what word do you like?')).toBeVisible()
  await expect(page).toHaveScreenshot('initial-load.png')
})
