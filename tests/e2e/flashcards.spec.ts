import { expect, test } from '@playwright/test'

async function addWord(page: import('@playwright/test').Page, word: string) {
  const input = page.getByPlaceholder('Words I like')
  await input.fill(word)
  await input.press('Enter')
  await expect(page.getByText(word).first()).toBeVisible({ timeout: 10000 })
}

test('flashcards: open, flip, advance, and complete', async ({ page }) => {
  await page.goto('/')
  await addWord(page, 'ephemeral')
  await addWord(page, 'serendipity')

  await page.getByLabel('Flashcards').click()
  await expect(page.getByTestId('flashcards-page')).toBeVisible()

  // Front shows count; flipping reveals the definition
  await expect(page.getByText('1 / 2')).toBeVisible()
  const card = page.getByRole('button', { name: /reveal definition/i })
  await card.focus()
  await page.keyboard.press('Enter')
  await expect(page.getByRole('button', { name: /Definition of/i })).toHaveAttribute('aria-pressed', 'true')

  // Advance to the last card, then finish to the summary
  await page.getByLabel('Next card').click()
  await expect(page.getByText('2 / 2')).toBeVisible()
  await page.getByLabel('Next card').click()
  await expect(page.getByText('All done!')).toBeVisible()

  // Reshuffle restarts the deck
  await page.getByRole('button', { name: /Reshuffle/i }).click()
  await expect(page.getByText('1 / 2')).toBeVisible({ timeout: 10000 })
})

test('flashcards: list switcher defaults to All Words', async ({ page }) => {
  await page.goto('/')
  await addWord(page, 'mellifluous')
  await page.getByLabel('Flashcards').click()
  await expect(page.getByRole('button', { name: 'All Words' })).toBeVisible()
})

test.describe('flashcards touch gestures', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true })

  test('swipes forward from the flipped definition side', async ({ page }) => {
    await page.goto('/')
    await addWord(page, 'ephemeral')
    await addWord(page, 'serendipity')
    await addWord(page, 'mellifluous')

    await page.getByLabel('Flashcards').click()
    await expect(page.getByText('1 / 3')).toBeVisible()
    const card = page.getByRole('button', { name: /reveal definition/i }).first()
    await card.focus()
    await page.keyboard.press('Enter')
    await expect(page.getByRole('button', { name: /Definition of/i }).first()).toHaveAttribute('aria-pressed', 'true')

    const box = (await page.getByTestId('flashcards-page').boundingBox())!
    const y = box.y + 260
    await page.mouse.move(330, y)
    await page.mouse.down()
    for (const x of [300, 250, 170, 90, 30])
      await page.mouse.move(x, y, { steps: 3 })
    await page.mouse.up()

    await expect(page.getByText('2 / 3')).toBeVisible({ timeout: 3000 })
  })
})
