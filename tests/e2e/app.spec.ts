import { expect, test } from '@playwright/test'

test('app loads and displays word input', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByPlaceholder('what word do you like?')).toBeVisible()
})

test('entering a word shows a card with definition', async ({ page }) => {
  await page.goto('/')
  const input = page.getByPlaceholder('what word do you like?')
  await input.fill('ephemeral')
  await input.press('Enter')
  await expect(page.getByText('ephemeral')).toBeVisible({ timeout: 10000 })
})

test('words persist across page reloads', async ({ page }) => {
  await page.goto('/')
  const input = page.getByPlaceholder('what word do you like?')
  await input.fill('serendipity')
  await input.press('Enter')
  await expect(page.getByText('serendipity')).toBeVisible({ timeout: 10000 })

  // Reload the page
  await page.reload()
  await expect(page.getByPlaceholder('what word do you like?')).toBeVisible()

  // Word should still be visible
  await expect(page.getByText('serendipity')).toBeVisible({ timeout: 5000 })
})
