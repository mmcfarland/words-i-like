/**
 * Auth Integration Tests
 *
 * Validates the authentication lifecycle against a real Postgres database:
 * - Dev login creates user and returns valid JWT
 * - JWT grants access to protected routes (/auth/me)
 * - Invalid/missing tokens are rejected
 * - Google OAuth redirect is constructed correctly
 * - OAuth callback error paths redirect properly
 */
import type { FastifyInstance } from 'fastify'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { authHeaders, createTestApp, createTestUser, resetDb } from './helpers'

describe('auth integration', () => {
  let app: FastifyInstance

  beforeAll(async () => {
    app = await createTestApp()
  })

  afterAll(async () => {
    await app.close()
  })

  beforeEach(async () => {
    await resetDb()
    vi.unstubAllGlobals()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('dev-login', () => {
    it('creates a user and returns a valid JWT token', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/auth/dev-login',
        payload: { displayName: 'Integration Tester' },
      })

      expect(res.statusCode).toBe(200)
      const body = res.json()
      expect(body.token).toBeTruthy()
      expect(body.user.displayName).toBe('Integration Tester')
      expect(body.user.id).toBeTruthy()
    })

    it('reuses the same user on repeated dev-login calls', async () => {
      const res1 = await app.inject({
        method: 'POST',
        url: '/auth/dev-login',
        payload: {},
      })
      const res2 = await app.inject({
        method: 'POST',
        url: '/auth/dev-login',
        payload: {},
      })

      expect(res1.json().user.id).toBe(res2.json().user.id)
    })
  })

  describe('/auth/me', () => {
    it('returns user profile for a valid JWT', async () => {
      const { user, token } = await createTestUser(app, { displayName: 'Me Test' })

      const res = await app.inject({
        method: 'GET',
        url: '/auth/me',
        headers: authHeaders(token),
      })

      expect(res.statusCode).toBe(200)
      const body = res.json()
      expect(body.id).toBe(user.id)
      expect(body.displayName).toBe('Me Test')
    })

    it('rejects requests without Authorization header', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/auth/me',
      })

      expect(res.statusCode).toBe(401)
    })

    it('rejects requests with an invalid JWT', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/auth/me',
        headers: authHeaders('not-a-real-jwt'),
      })

      expect(res.statusCode).toBe(401)
    })

    it('returns 401 when JWT user no longer exists', async () => {
      const token = app.jwt.sign({ userId: 'missing-user-id' })
      const res = await app.inject({
        method: 'GET',
        url: '/auth/me',
        headers: authHeaders(token),
      })

      expect(res.statusCode).toBe(401)
      expect(res.json()).toMatchObject({
        error: 'Unauthorized',
        statusCode: 401,
      })
      expect(res.json().message).toContain('no longer exists')
    })
  })

  describe('OAuth redirect construction', () => {
    it('falls back to dev-login when Google creds are absent', async () => {
      delete process.env.GOOGLE_CLIENT_ID
      delete process.env.GOOGLE_CLIENT_SECRET

      const res = await app.inject({
        method: 'GET',
        url: '/auth/google',
      })

      expect(res.statusCode).toBe(302)
      const location = res.headers.location as string
      expect(location).toContain('auth_token=')
    })

    it('returns not_configured error in strict mode when creds are absent', async () => {
      delete process.env.GOOGLE_CLIENT_ID
      delete process.env.GOOGLE_CLIENT_SECRET

      const res = await app.inject({
        method: 'GET',
        url: '/auth/google?strict=1',
      })

      expect(res.statusCode).toBe(302)
      const location = res.headers.location as string
      expect(location).toContain('auth_error=not_configured')
    })

    it('redirects to Google when OAuth creds are configured', async () => {
      process.env.GOOGLE_CLIENT_ID = 'test-client-id'
      process.env.GOOGLE_CLIENT_SECRET = 'test-client-secret'

      const res = await app.inject({
        method: 'GET',
        url: '/auth/google?strict=1&origin=http%3A%2F%2Flocalhost%3A5173',
      })

      expect(res.statusCode).toBe(302)
      const location = res.headers.location as string
      expect(location).toContain('accounts.google.com')
      expect(location).toContain('client_id=test-client-id')

      delete process.env.GOOGLE_CLIENT_ID
      delete process.env.GOOGLE_CLIENT_SECRET
    })
  })

  describe('OAuth callback error paths', () => {
    it('redirects with missing_code when no code parameter', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/auth/google/callback',
      })

      expect(res.statusCode).toBe(302)
      const location = res.headers.location as string
      expect(location).toContain('auth_error=missing_code')
    })

    it('redirects with not_configured when creds are missing on callback', async () => {
      delete process.env.GOOGLE_CLIENT_ID
      delete process.env.GOOGLE_CLIENT_SECRET

      const res = await app.inject({
        method: 'GET',
        url: '/auth/google/callback?code=some-code',
      })

      expect(res.statusCode).toBe(302)
      const location = res.headers.location as string
      expect(location).toContain('auth_error=not_configured')
    })

    it('redirects to frontend origin from state on error', async () => {
      const state = Buffer.from(
        JSON.stringify({ frontendUrl: 'http://localhost:9999' }),
        'utf8',
      ).toString('base64url')

      const res = await app.inject({
        method: 'GET',
        url: `/auth/google/callback?state=${encodeURIComponent(state)}`,
      })

      expect(res.statusCode).toBe(302)
      const location = res.headers.location as string
      expect(location).toContain('localhost:9999')
    })

    it('completes OAuth flow when Google returns valid tokens', async () => {
      process.env.GOOGLE_CLIENT_ID = 'test-client-id'
      process.env.GOOGLE_CLIENT_SECRET = 'test-client-secret'

      const fetchMock = vi.fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ access_token: 'google-access-token' }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ id: 'google-user-1', name: 'Google User', picture: 'https://example.com/avatar.jpg' }),
        })
      vi.stubGlobal('fetch', fetchMock)

      const res = await app.inject({
        method: 'GET',
        url: '/auth/google/callback?code=valid-code',
      })

      expect(res.statusCode).toBe(302)
      const location = res.headers.location as string
      expect(location).toContain('auth_token=')
      expect(fetchMock).toHaveBeenCalledTimes(2)

      delete process.env.GOOGLE_CLIENT_ID
      delete process.env.GOOGLE_CLIENT_SECRET
    })
  })
})
