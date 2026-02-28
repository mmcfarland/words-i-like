import process from 'node:process'
import cors from '@fastify/cors'
import Fastify from 'fastify'
import authPlugin from './plugins/auth'
import { aiRoutes } from './routes/ai'
import { authRoutes } from './routes/auth'
import { healthRoutes } from './routes/health'
import { listRoutes } from './routes/lists'
import { shareRoutes } from './routes/share'
import { syncRoutes } from './routes/sync'
import { wordListRoutes } from './routes/word-lists'
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
  app.register(listRoutes, { prefix: '/api' })
  app.register(wordListRoutes, { prefix: '/api' })
  app.register(syncRoutes, { prefix: '/api' })
  app.register(aiRoutes, { prefix: '/api' })
  app.register(shareRoutes)

  return app
}

if (!process.env.VITEST) {
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
}
