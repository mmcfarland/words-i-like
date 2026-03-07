import process from 'node:process'
import cors from '@fastify/cors'
import Fastify from 'fastify'
import authPlugin from './plugins/auth.js'
import { aiRoutes } from './routes/ai.js'
import { authRoutes } from './routes/auth.js'
import { healthRoutes } from './routes/health.js'
import { listRoutes } from './routes/lists.js'
import { shareRoutes } from './routes/share.js'
import { syncRoutes } from './routes/sync.js'
import { wordListRoutes } from './routes/word-lists.js'
import { wordRoutes } from './routes/words.js'

export function buildApp() {
  const app = Fastify({ logger: true })

  const corsOrigin = process.env.CORS_ORIGIN || 'http://localhost:5173'
  app.register(cors, {
    origin: corsOrigin.includes(',') ? corsOrigin.split(',').map(s => s.trim()) : corsOrigin,
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
