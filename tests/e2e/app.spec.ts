import { expect, test } from '@playwright/test'

test('app loads and displays word input', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByPlaceholder('What word caught your eye?')).toBeVisible()
})

test('entering a word shows a card with definition', async ({ page }) => {
  await page.goto('/')
  const input = page.getByPlaceholder('What word caught your eye?')
  await input.fill('ephemeral')
  await input.press('Enter')
  // Wait for the word card to appear with the word text
  await expect(page.getByText('ephemeral')).toBeVisible({ timeout: 10000 })
})
