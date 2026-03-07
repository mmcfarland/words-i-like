/**
 * Share E2E Tests
 *
 * Validates the share flow end-to-end:
 * - Create a share link for an authenticated owner
 * - Read the shared payload anonymously via the public endpoint
 * - Verify invalid tokens return 404
 *
 * Requires: docker-compose stack running (API + DB)
 */
import { expect, test } from '@playwright/test'

const API_URL = 'http://localhost:3001'
const REQUIRE_API = !!process.env.CI
const API_UNAVAILABLE_MESSAGE = 'API not reachable — run docker-compose stack first'

async function devLogin(request: any, name: string) {
  const res = await request.post(`${API_URL}/auth/dev-login`, {
    data: { displayName: name },
  })
  return res.json() as Promise<{ token: string }>
}

test.describe('share flow', () => {
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

  test('shared list is viewable without auth', async ({ page }) => {
    const { token } = await devLogin(page.request, 'E2E Share User')
    const authHeaders = {
      authorization: `Bearer ${token}`,
      'content-type': 'application/json',
    }
    const listRes = await page.request.post(`${API_URL}/api/lists`, {
      headers: authHeaders,
      data: { name: 'E2E Shared List' },
    })
    expect(listRes.ok()).toBe(true)
    const list = await listRes.json() as { id: string }

    const suffix = Date.now().toString(36)
    const luminousText = `luminous-${suffix}`
    const cascadeText = `cascade-${suffix}`
    const luminousRes = await page.request.post(`${API_URL}/api/words`, {
      headers: authHeaders,
      data: { text: luminousText, definitions: [], definitionStatus: 'found' },
    })
    expect(luminousRes.ok()).toBe(true)
    const luminousWord = await luminousRes.json() as { id: string }
    const cascadeRes = await page.request.post(`${API_URL}/api/words`, {
      headers: authHeaders,
      data: { text: cascadeText, definitions: [], definitionStatus: 'found' },
    })
    expect(cascadeRes.ok()).toBe(true)
    const cascadeWord = await cascadeRes.json() as { id: string }

    const assignLuminousRes = await page.request.post(`${API_URL}/api/words/${luminousWord.id}/lists`, {
      headers: authHeaders,
      data: { listIds: [list.id] },
    })
    expect(assignLuminousRes.status()).toBe(201)
    const assignCascadeRes = await page.request.post(`${API_URL}/api/words/${cascadeWord.id}/lists`, {
      headers: authHeaders,
      data: { listIds: [list.id] },
    })
    expect(assignCascadeRes.status()).toBe(201)

    const shareRes = await page.request.post(`${API_URL}/api/lists/${list.id}/share`, {
      headers: { authorization: `Bearer ${token}` },
    })

    expect(shareRes.ok()).toBe(true)
    const { shareToken } = await shareRes.json()
    expect(shareToken).toBeTruthy()

    const sharedRes = await page.request.get(`${API_URL}/shared/${shareToken}`)
    expect(sharedRes.ok()).toBe(true)
    const sharedBody = await sharedRes.json()
    expect(sharedBody.name).toBe('E2E Shared List')
    expect(sharedBody.words.map((w: { text: string }) => w.text).sort()).toEqual([cascadeText, luminousText].sort())
  })

  test('invalid share token returns not found', async ({ page }) => {
    const res = await page.request.get(`${API_URL}/shared/nonexistent-token-12345`)
    expect(res.status()).toBe(404)
  })
})
