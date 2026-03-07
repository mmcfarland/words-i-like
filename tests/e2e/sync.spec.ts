/**
 * Sync E2E Tests
 *
 * Validates the sync lifecycle in the browser:
 * - Add words while signed out → login → words sync to server
 * - After sync, words persist across page reloads (server-backed)
 * - Multi-device simulation: words added on "device B" appear on "device A" after sync
 *
 * Requires: docker-compose stack running (API + DB)
 */
import { expect, test } from '@playwright/test'

const API_URL = 'http://localhost:3001'
const REQUIRE_API = !!process.env.CI
const API_UNAVAILABLE_MESSAGE = 'API not reachable — run docker-compose stack first'

async function devLogin(request: ReturnType<typeof test['info']>['config'] extends never ? never : any, name: string) {
  const res = await request.post(`${API_URL}/auth/dev-login`, {
    data: { displayName: name },
  })
  return res.json() as Promise<{ token: string, user: { id: string, displayName: string, avatarUrl: string | null } }>
}

async function setAuth(page: any, token: string, user: any) {
  await page.evaluate(({ token, user }: { token: string, user: any }) => {
    localStorage.setItem('words-auth-token', token)
    localStorage.setItem('words-auth-user', JSON.stringify(user))
  }, { token, user })
}

test.describe('sync flow', () => {
  test.beforeEach(async ({ page }) => {
    try {
      const health = await page.request.get(`${API_URL}/health`)
      if (!health.ok()) {
        if (REQUIRE_API) {
          throw new Error(`${API_UNAVAILABLE_MESSAGE} (status ${health.status()})`)
        }
        test.skip(true, API_UNAVAILABLE_MESSAGE)
      }
    }
    catch (error) {
      if (REQUIRE_API) {
        throw error
      }
      test.skip(true, API_UNAVAILABLE_MESSAGE)
    }
  })

  test('words added before login sync to server after login', async ({ page }) => {
    await page.goto('/')
    const input = page.getByPlaceholder('Words I like')
    await expect(input).toBeVisible({ timeout: 10000 })

    // Add a word while signed out
    await input.fill('ephemeral')
    await input.press('Enter')
    await expect(page.getByText('ephemeral')).toBeVisible({ timeout: 10000 })

    // Now login
    const { token, user } = await devLogin(page.request, 'Sync Tester')
    await setAuth(page, token, user)
    await page.reload()

    // Wait for sync to complete and word to be visible
    await expect(page.getByLabel(/Signed in as/)).toBeVisible({ timeout: 10000 })
    await expect(page.getByText('ephemeral')).toBeVisible({ timeout: 10000 })

    // Verify the word reached the server
    const syncRes = await page.request.get(`${API_URL}/api/sync`, {
      headers: { authorization: `Bearer ${token}` },
    })
    expect(syncRes.ok()).toBe(true)
    const syncData = await syncRes.json()
    const serverWords = syncData.words.map((w: { text: string }) => w.text)
    expect(serverWords).toContain('ephemeral')
  })

  test('server words appear after login and reload', async ({ page, request }) => {
    // Push a word to the server directly via API
    const { token, user } = await devLogin(request, 'Server Words Tester')

    await request.post(`${API_URL}/api/sync`, {
      headers: {
        authorization: `Bearer ${token}`,
        'content-type': 'application/json',
      },
      data: {
        words: [{
          id: `server-word-${Date.now()}`,
          text: 'serendipity',
          definitions: [],
          definitionStatus: 'pending',
          createdAt: Date.now(),
          updatedAt: Date.now(),
        }],
      },
    })

    // Now load the app with that user's auth
    await page.goto('/')
    await setAuth(page, token, user)
    await page.reload()

    // The sync should pull the server word
    await expect(page.getByLabel(/Signed in as/)).toBeVisible({ timeout: 10000 })

    // Give sync a moment to complete, then verify
    // The word should appear after the sync pull
    await expect(page.getByText('serendipity')).toBeVisible({ timeout: 15000 })
  })
})
