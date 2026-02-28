import process from 'node:process'
import cors from '@fastify/cors'
import Fastify from 'fastify'
import authPlugin from './plugins/auth'
import { authRoutes } from './routes/auth'
import { healthRoutes } from './routes/health'
import { syncRoutes } from './routes/sync'
import { wordRoutes } from './routes/words'

export function buildApp() {
  const app = Fastify({ logger: true })

  app.register(cors, {
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  })

  app.register(authPlugin)
  app.register(healthRoutes)
  app.register(authRoutes)
  app.register(wordRoutes, { prefix: '/api' })
  app.register(syncRoutes, { prefix: '/api' })

  return app
}

const app = buildApp()

async function start() {
  const port = Number(process.env.PORT) || 3001
  await app.listen({ port, host: '0.0.0.0' })
  console.log(`Server listening on port ${port}`)
}

start().catch((err) => {
  console.error(err)
  process.exit(1)
})

export { app }
