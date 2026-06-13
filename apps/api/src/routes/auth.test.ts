import { Buffer } from 'node:buffer'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { buildApp } from '../server'

const mockUserUpsert = vi.hoisted(() => vi.fn(async ({ create, update }: any) => ({
  id: 'user-1',
  googleId: create.googleId,
  displayName: update.displayName ?? create.displayName,
  avatarUrl: update.avatarUrl ?? create.avatarUrl ?? null,
})))
const mockUserFindUnique = vi.hoisted(() => vi.fn())

const fetchMock = vi.hoisted(() => vi.fn())

vi.mock('@words/db', () => ({
  prisma: {
    user: {
      upsert: mockUserUpsert,
      findUnique: mockUserFindUnique,
    },
  },
}))

const ORIGINAL_ENV = { ...process.env }

describe('auth route redirects', () => {
  beforeEach(() => {
    process.env = { ...ORIGINAL_ENV }
    process.env.NODE_ENV = 'development'
    process.env.CORS_ORIGIN = 'http://localhost:5173'
    process.env.JWT_SECRET = 'test-secret'
    delete process.env.GOOGLE_CLIENT_ID
    delete process.env.GOOGLE_CLIENT_SECRET
    delete process.env.API_URL
    mockUserUpsert.mockClear()
    mockUserFindUnique.mockReset()
    fetchMock.mockReset()
    vi.stubGlobal('fetch', fetchMock)
  })

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV }
    vi.unstubAllGlobals()
  })

  it('redirects dev login using auth token in hash fragment', async () => {
    const app = buildApp()
    const response = await app.inject({
      method: 'GET',
      url: '/auth/google',
    })

    expect(response.statusCode).toBe(302)
    const location = response.headers.location
    expect(location).toBeDefined()
    const redirectUrl = new URL(location!)
    expect(redirectUrl.searchParams.get('auth_token')).toBeNull()
    const token = new URLSearchParams(redirectUrl.hash.slice(1)).get('auth_token')
    expect(token).toBeTruthy()
    const decoded = app.jwt.decode(token!) as { exp?: number } | null
    expect(decoded?.exp).toBeTypeOf('number')
    expect(decoded?.exp ?? 0).toBeGreaterThan(Math.floor(Date.now() / 1000))
    await app.close()
  })

  it('redirects with not_configured error when strict mode is requested without OAuth env', async () => {
    const app = buildApp()
    const response = await app.inject({
      method: 'GET',
      url: '/auth/google?strict=1',
    })

    expect(response.statusCode).toBe(302)
    const location = response.headers.location
    expect(location).toBeDefined()
    const redirectUrl = new URL(location!)
    expect(redirectUrl.searchParams.get('auth_error')).toBeNull()
    expect(new URLSearchParams(redirectUrl.hash.slice(1)).get('auth_error')).toBe('not_configured')
    await app.close()
  })

  it('uses request host for callback URI and includes frontend origin in state', async () => {
    process.env.GOOGLE_CLIENT_ID = 'client-id'
    process.env.GOOGLE_CLIENT_SECRET = 'client-secret'
    process.env.API_URL = 'http://localhost:3001'

    const app = buildApp()
    const response = await app.inject({
      method: 'GET',
      url: '/auth/google?strict=1&origin=http%3A%2F%2Flocalhost%3A5174',
      headers: { host: 'localhost:4321' },
    })

    expect(response.statusCode).toBe(302)
    const location = response.headers.location
    expect(location).toBeDefined()
    const redirectUrl = new URL(location!)
    expect(redirectUrl.origin).toBe('https://accounts.google.com')
    expect(redirectUrl.searchParams.get('redirect_uri')).toBe('http://localhost:4321/auth/google/callback')
    const state = redirectUrl.searchParams.get('state')
    expect(state).toBeTruthy()
    const decodedState = JSON.parse(Buffer.from(state!, 'base64url').toString('utf8')) as { frontendUrl?: string }
    expect(decodedState.frontendUrl).toBe('http://localhost:5174')
    await app.close()
  })

  it('redirects callback errors to frontend origin from state', async () => {
    const state = Buffer.from(JSON.stringify({ frontendUrl: 'http://localhost:5174' }), 'utf8').toString('base64url')

    const app = buildApp()
    const response = await app.inject({
      method: 'GET',
      url: `/auth/google/callback?state=${encodeURIComponent(state)}`,
    })

    expect(response.statusCode).toBe(302)
    const location = response.headers.location
    expect(location).toBeDefined()
    const redirectUrl = new URL(location!)
    expect(redirectUrl.origin).toBe('http://localhost:5174')
    expect(new URLSearchParams(redirectUrl.hash.slice(1)).get('auth_error')).toBe('missing_code')
    await app.close()
  })

  it('redirects OAuth callback using auth token in hash fragment', async () => {
    process.env.GOOGLE_CLIENT_ID = 'client-id'
    process.env.GOOGLE_CLIENT_SECRET = 'client-secret'
    process.env.API_URL = 'http://localhost:3001'

    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ access_token: 'google-access-token' }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 'google-1', name: 'OAuth User', picture: null }),
      })

    const app = buildApp()
    const response = await app.inject({
      method: 'GET',
      url: '/auth/google/callback?code=auth-code',
    })

    expect(response.statusCode).toBe(302)
    const location = response.headers.location
    expect(location).toBeDefined()
    const redirectUrl = new URL(location!)
    expect(redirectUrl.searchParams.get('auth_token')).toBeNull()
    const token = new URLSearchParams(redirectUrl.hash.slice(1)).get('auth_token')
    expect(token).toBeTruthy()
    const decoded = app.jwt.decode(token!) as { exp?: number } | null
    expect(decoded?.exp).toBeTypeOf('number')
    expect(decoded?.exp ?? 0).toBeGreaterThan(Math.floor(Date.now() / 1000))
    await app.close()
  })

  it('returns 401 when JWT user no longer exists for /auth/me', async () => {
    mockUserFindUnique.mockResolvedValueOnce(null)

    const app = buildApp()
    await app.ready()
    const token = app.jwt.sign({ userId: 'missing-user-id' })
    const response = await app.inject({
      method: 'GET',
      url: '/auth/me',
      headers: { authorization: `Bearer ${token}` },
    })

    expect(response.statusCode).toBe(401)
    expect(response.json()).toEqual({
      error: 'Unauthorized',
      message: 'Authenticated user no longer exists',
      statusCode: 401,
    })
    expect(mockUserFindUnique).toHaveBeenCalledWith({ where: { id: 'missing-user-id' } })
    await app.close()
  })
})
