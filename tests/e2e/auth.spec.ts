/**
 * Auth E2E Tests
 *
 * Validates the authentication flow in the browser:
 * - Dev-login via API creates a session
 * - Avatar changes to signed-in state
 * - Sign-out clears session
 * - OAuth error callback shows appropriate state
 *
 * Requires: docker-compose stack running (API + DB)
 */
import { expect, test } from '@playwright/test'

const API_URL = 'http://localhost:3001'
const REQUIRE_API = !!process.env.CI
const API_UNAVAILABLE_MESSAGE = 'API not reachable — run docker-compose stack first'

test.describe('auth flow', () => {
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

  test('dev-login sets auth state and shows signed-in avatar', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByPlaceholder('Words I like')).toBeVisible({ timeout: 10000 })

    // Should start signed out
    await expect(page.getByLabel('Sign in')).toBeVisible()

    // Use dev-login API to get a token
    const loginRes = await page.request.post(`${API_URL}/auth/dev-login`, {
      data: { displayName: 'E2E Tester' },
    })
    expect(loginRes.ok()).toBe(true)
    const { token, user } = await loginRes.json()

    // Set auth in localStorage and reload
    await page.evaluate(({ token, user }) => {
      localStorage.setItem('words-auth-token', token)
      localStorage.setItem('words-auth-user', JSON.stringify(user))
    }, { token, user })

    await page.reload()
    await expect(page.getByLabel(/Signed in as/)).toBeVisible({ timeout: 5000 })
  })

  test('sign-out clears auth state', async ({ page }) => {
    await page.goto('/')

    // Login via dev-login
    const loginRes = await page.request.post(`${API_URL}/auth/dev-login`, {
      data: { displayName: 'Logout Tester' },
    })
    const { token, user } = await loginRes.json()

    await page.evaluate(({ token, user }) => {
      localStorage.setItem('words-auth-token', token)
      localStorage.setItem('words-auth-user', JSON.stringify(user))
    }, { token, user })

    await page.reload()
    await expect(page.getByLabel(/Signed in as/)).toBeVisible({ timeout: 10000 })

    // Click the avatar to open menu, then sign out
    await page.getByLabel(/Signed in as/).click()
    await page.getByRole('menuitem', { name: 'Sign out' }).click()

    // Should return to signed-out state
    await expect(page.getByRole('button', { name: 'Sign in', exact: true })).toBeVisible({ timeout: 10000 })
  })

  test('auth error in URL shows signed-out state', async ({ page }) => {
    // Navigate with an auth error parameter
    await page.goto('/#auth_error=token_exchange_failed')

    // Should be signed out (no crash)
    await expect(page.getByRole('button', { name: 'Sign in', exact: true })).toBeVisible({ timeout: 10000 })
  })

  test('OAuth redirect goes to Google when API has creds configured', async ({ page }) => {
    // Intercept the redirect to Google to prevent actually navigating there
    let googleRedirectUrl = ''
    await page.route('**/accounts.google.com/**', (route) => {
      googleRedirectUrl = route.request().url()
      // Abort the request — we just want to capture the redirect URL
      route.abort()
    })

    // Try hitting the auth endpoint directly
    const res = await page.request.get(`${API_URL}/auth/google?strict=1&origin=http://localhost:5173`, {
      maxRedirects: 0,
    })

    const location = res.headers()['location'] || ''
    if (location.includes('accounts.google.com')) {
      expect(location).toContain('client_id=')
      expect(location).toContain('redirect_uri=')
    }
    else {
      // If Google creds aren't configured, we get a not_configured error — that's also valid
      expect(location).toContain('auth_error=not_configured')
    }
  })
})
