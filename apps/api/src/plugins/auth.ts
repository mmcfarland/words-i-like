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

async function authPlugin(app: FastifyInstance) {
  await app.register(jwt, {
    secret: process.env.JWT_SECRET || 'dev-secret-change-me',
  })

  app.decorate('authenticate', async (request: FastifyRequest) => {
    await request.jwtVerify()
  })
}

export default fp(authPlugin)
