/**
 * Test helpers for API integration tests.
 *
 * Provides utilities to create isolated Fastify instances, authenticate
 * test users, and clean database state between tests.
 */
import type { FastifyInstance } from 'fastify'
import { prisma } from '@words/db'

// Dynamic import so the API server module resolves after DATABASE_URL is set
async function importBuildApp() {
  const mod = await import('../../../apps/api/src/server.js')
  return mod.buildApp
}

/**
 * Create an isolated Fastify test app.
 * Call `app.close()` in afterEach/afterAll to release resources.
 */
export async function createTestApp(): Promise<FastifyInstance> {
  const buildApp = await importBuildApp()
  const app = buildApp()
  await app.ready()
  return app
}

/**
 * Create a user directly in the database and return a signed JWT.
 */
export async function createTestUser(
  app: FastifyInstance,
  opts: {
    googleId?: string
    displayName?: string
    avatarUrl?: string | null
  } = {},
) {
  const googleId = opts.googleId || `test-${Date.now()}-${Math.random().toString(36).slice(2)}`
  const displayName = opts.displayName || 'Test User'

  const user = await prisma.user.create({
    data: {
      googleId,
      displayName,
      avatarUrl: opts.avatarUrl ?? null,
    },
  })

  const token = app.jwt.sign({ userId: user.id })

  return { user, token }
}

/**
 * Build Authorization header for an authenticated request.
 */
export function authHeaders(token: string): Record<string, string> {
  return { authorization: `Bearer ${token}` }
}

/**
 * Truncate all tables to reset database state between tests.
 * Uses TRUNCATE CASCADE for referential integrity.
 */
export async function resetDb() {
  await prisma.$executeRawUnsafe(`
    TRUNCATE TABLE "WordList", "WordTombstone", "Word", "List", "User" CASCADE;
  `)
}
