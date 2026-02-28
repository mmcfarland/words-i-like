import { expect, test } from '@playwright/test'

test('app loads and displays word input', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByPlaceholder('What word caught your eye?')).toBeVisible()
})
