import type { FastifyInstance, FastifyRequest } from 'fastify'
import process from 'node:process'
import { prisma } from '@words/db'

const ALLOWED_ORIGINS = (process.env.CORS_ORIGIN || 'http://localhost:5173').split(',').map(s => s.trim())
const FRONTEND_URL = ALLOWED_ORIGINS[0]
const DEFAULT_API_URL = 'http://localhost:3001'
// Long-lived session: this is a local-first PWA with no refresh-token flow, so a
// short expiry silently logs users out on reload. Keep them signed in for 30 days.
const AUTH_TOKEN_EXPIRY = '30d'

function resolveFrontendUrl(value?: string) {
  if (!value)
    return FRONTEND_URL

  try {
    const origin = new URL(value).origin
    if (process.env.NODE_ENV === 'production' && !ALLOWED_ORIGINS.includes(origin))
      return FRONTEND_URL
    return origin
  }
  catch {
    return FRONTEND_URL
  }
}

function resolveApiUrl(request: FastifyRequest) {
  const forwardedProtoHeader = request.headers['x-forwarded-proto']
  const forwardedProto = Array.isArray(forwardedProtoHeader) ? forwardedProtoHeader[0] : forwardedProtoHeader
  const protocol = forwardedProto?.split(',')[0]?.trim() || request.protocol || 'http'
  const host = request.headers.host
  const requestApiUrl = host ? `${protocol}://${host}` : undefined

  if (process.env.NODE_ENV !== 'production' && requestApiUrl)
    return requestApiUrl
  if (process.env.API_URL)
    return process.env.API_URL
  return requestApiUrl || DEFAULT_API_URL
}

function encodeAuthState(frontendUrl: string) {
  return Buffer.from(JSON.stringify({ frontendUrl }), 'utf8').toString('base64url')
}

function decodeAuthState(state?: string) {
  if (!state)
    return undefined

  try {
    const parsed = JSON.parse(Buffer.from(state, 'base64url').toString('utf8')) as { frontendUrl?: string }
    return parsed.frontendUrl
  }
  catch {
    return undefined
  }
}

function redirectToFrontend(frontendUrl: string, params?: Record<string, string>) {
  if (!params)
    return frontendUrl

  return `${frontendUrl}#${new URLSearchParams(params).toString()}`
}

export async function authRoutes(app: FastifyInstance) {
  async function signInAsDevUser(displayName = 'Dev User') {
    const user = await prisma.user.upsert({
      where: { googleId: 'dev-user' },
      update: { displayName },
      create: {
        googleId: 'dev-user',
        displayName,
      },
    })
    const token = app.jwt.sign({ userId: user.id }, { expiresIn: AUTH_TOKEN_EXPIRY })
    return { token, user }
  }

  // GET /auth/google — redirect to Google OAuth consent screen
  app.get('/auth/google', async (request, reply) => {
    const clientId = process.env.GOOGLE_CLIENT_ID
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET
    const { strict, origin } = request.query as { strict?: string, origin?: string }
    const useStrictOauth = strict === '1' || strict === 'true'
    const frontendUrl = resolveFrontendUrl(origin)
    if (!clientId || !clientSecret) {
      if (!useStrictOauth && process.env.NODE_ENV !== 'production') {
        const { token } = await signInAsDevUser()
        return reply.redirect(redirectToFrontend(frontendUrl, { auth_token: token }))
      }
      if (process.env.NODE_ENV !== 'production')
        return reply.redirect(redirectToFrontend(frontendUrl, { auth_error: 'not_configured' }))
      return reply.status(503).send({
        error: 'OAuth Not Configured',
        message: 'Google OAuth credentials not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET.',
        statusCode: 503,
      })
    }
    const redirectUri = `${resolveApiUrl(request)}/auth/google/callback`
    const state = encodeAuthState(frontendUrl)
    const url = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=openid%20profile%20email&state=${encodeURIComponent(state)}`
    return reply.redirect(url)
  })

  // GET /auth/google/callback — exchange code for tokens, create/update user, redirect to frontend
  app.get('/auth/google/callback', async (request, reply) => {
    const { code, state } = request.query as { code?: string, state?: string }
    const frontendUrl = resolveFrontendUrl(decodeAuthState(state))
    if (!code) {
      return reply.redirect(redirectToFrontend(frontendUrl, { auth_error: 'missing_code' }))
    }

    const clientId = process.env.GOOGLE_CLIENT_ID
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET
    const redirectUri = `${resolveApiUrl(request)}/auth/google/callback`

    if (!clientId || !clientSecret) {
      return reply.redirect(redirectToFrontend(frontendUrl, { auth_error: 'not_configured' }))
    }

    try {
      // Exchange authorization code for tokens
      const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          code,
          client_id: clientId,
          client_secret: clientSecret,
          redirect_uri: redirectUri,
          grant_type: 'authorization_code',
        }),
      })

      if (!tokenResponse.ok) {
        app.log.error({ status: tokenResponse.status }, 'Google token exchange failed')
        return reply.redirect(redirectToFrontend(frontendUrl, { auth_error: 'token_exchange_failed' }))
      }

      const tokens = await tokenResponse.json() as { access_token: string, id_token?: string }

      // Fetch user profile from Google
      const profileResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: { Authorization: `Bearer ${tokens.access_token}` },
      })

      if (!profileResponse.ok) {
        app.log.error({ status: profileResponse.status }, 'Google profile fetch failed')
        return reply.redirect(redirectToFrontend(frontendUrl, { auth_error: 'profile_fetch_failed' }))
      }

      const profile = await profileResponse.json() as {
        id: string
        name: string
        picture?: string
        email?: string
      }

      // Upsert user in database
      const user = await prisma.user.upsert({
        where: { googleId: profile.id },
        update: {
          displayName: profile.name,
          avatarUrl: profile.picture || null,
        },
        create: {
          googleId: profile.id,
          displayName: profile.name,
          avatarUrl: profile.picture || null,
        },
      })

      // Sign JWT and redirect to frontend with token
      const token = app.jwt.sign({ userId: user.id }, { expiresIn: AUTH_TOKEN_EXPIRY })
      return reply.redirect(redirectToFrontend(frontendUrl, { auth_token: token }))
    }
    catch (err) {
      app.log.error(err, 'OAuth callback error')
      return reply.redirect(redirectToFrontend(frontendUrl, { auth_error: 'server_error' }))
    }
  })

  // POST /auth/dev-login — development-only login (no OAuth needed)
  app.post('/auth/dev-login', async (request, reply) => {
    if (process.env.NODE_ENV === 'production') {
      return reply.status(404).send({ error: 'Not Found', message: 'Not available in production', statusCode: 404 })
    }

    const { displayName } = (request.body as { displayName?: string }) || {}
    const { token, user } = await signInAsDevUser(displayName || 'Dev User')
    return { token, user: { id: user.id, displayName: user.displayName, avatarUrl: user.avatarUrl } }
  })

  // GET /auth/me — get current user
  app.get('/auth/me', { preHandler: [app.authenticate] }, async (request, reply) => {
    const { userId } = request.user
    const user = await prisma.user.findUnique({ where: { id: userId } })
    if (!user) {
      return reply.status(401).send({
        error: 'Unauthorized',
        message: 'Authenticated user no longer exists',
        statusCode: 401,
      })
    }
    return { id: user.id, displayName: user.displayName, avatarUrl: user.avatarUrl, googleId: user.googleId }
  })

  // POST /auth/logout — client-side token removal (no server state)
  app.post('/auth/logout', async () => {
    return { success: true }
  })
}
