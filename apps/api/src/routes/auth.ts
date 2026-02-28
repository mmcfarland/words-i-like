import type { FastifyInstance } from 'fastify'
import process from 'node:process'
import { prisma } from '@words/db'

export async function authRoutes(app: FastifyInstance) {
  // GET /auth/google — redirect to Google OAuth
  // For now, returns instructions; real OAuth requires client credentials
  app.get('/auth/google', async (_request, reply) => {
    const clientId = process.env.GOOGLE_CLIENT_ID
    if (!clientId) {
      return reply.status(503).send({
        error: 'OAuth Not Configured',
        message: 'Google OAuth credentials not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET.',
        statusCode: 503,
      })
    }
    const redirectUri = `${process.env.API_URL || 'http://localhost:3001'}/auth/google/callback`
    const url = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=openid%20profile%20email`
    return reply.redirect(url)
  })

  // GET /auth/google/callback — handle OAuth callback
  app.get('/auth/google/callback', async (request, reply) => {
    const { code } = request.query as { code?: string }
    if (!code) {
      return reply.status(400).send({ error: 'Missing code', statusCode: 400, message: 'Authorization code required' })
    }

    // Exchange code for tokens (stub — real implementation needs Google token exchange)
    // For development, create/find a demo user
    const user = await prisma.user.upsert({
      where: { googleId: 'dev-user' },
      update: {},
      create: {
        googleId: 'dev-user',
        displayName: 'Dev User',
      },
    })

    const token = app.jwt.sign({ userId: user.id })
    return reply.send({ token, user: { id: user.id, displayName: user.displayName, avatarUrl: user.avatarUrl } })
  })

  // POST /auth/dev-login — development-only login (no OAuth needed)
  app.post('/auth/dev-login', async (request, reply) => {
    if (process.env.NODE_ENV === 'production') {
      return reply.status(404).send({ error: 'Not Found', message: 'Not available in production', statusCode: 404 })
    }

    const { displayName } = (request.body as { displayName?: string }) || {}
    const user = await prisma.user.upsert({
      where: { googleId: 'dev-user' },
      update: {},
      create: {
        googleId: 'dev-user',
        displayName: displayName || 'Dev User',
      },
    })

    const token = app.jwt.sign({ userId: user.id })
    return { token, user: { id: user.id, displayName: user.displayName, avatarUrl: user.avatarUrl } }
  })

  // GET /auth/me — get current user
  app.get('/auth/me', { preHandler: [app.authenticate] }, async (request) => {
    const { userId } = request.user
    const user = await prisma.user.findUnique({ where: { id: userId } })
    if (!user) {
      throw new Error('User not found')
    }
    return { id: user.id, displayName: user.displayName, avatarUrl: user.avatarUrl, googleId: user.googleId }
  })

  // POST /auth/logout — client-side token removal (no server state)
  app.post('/auth/logout', async () => {
    return { success: true }
  })
}
