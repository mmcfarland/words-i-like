import type { FastifyInstance, FastifyRequest } from 'fastify'
import process from 'node:process'
import jwt from '@fastify/jwt'
import fp from 'fastify-plugin'

declare module 'fastify' {
  interface FastifyInstance {
    authenticate: (request: FastifyRequest) => Promise<void>
  }
}

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: { userId: string }
    user: { userId: string }
  }
}

function resolveJwtSecret() {
  const secret = process.env.JWT_SECRET?.trim()
  if (secret)
    return secret

  if (process.env.NODE_ENV === 'test' || process.env.VITEST)
    return 'test-secret'

  throw new Error('JWT_SECRET is required to start the API. Set JWT_SECRET in your environment.')
}

async function authPlugin(app: FastifyInstance) {
  await app.register(jwt, {
    secret: resolveJwtSecret(),
  })

  app.decorate('authenticate', async (request: FastifyRequest) => {
    await request.jwtVerify()
  })
}

export default fp(authPlugin)
