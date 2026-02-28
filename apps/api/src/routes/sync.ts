import type { FastifyInstance } from 'fastify'
import { SyncRequestSchema } from '@words/shared'
import { syncService } from '../services/sync'

export async function syncRoutes(app: FastifyInstance) {
  // POST /sync — push local words, get merged result
  app.post('/sync', { preHandler: [app.authenticate] }, async (request, reply) => {
    const parsed = SyncRequestSchema.safeParse(request.body)
    if (!parsed.success) {
      return reply.status(400).send({
        error: 'Validation Error',
        message: parsed.error.issues.map(i => i.message).join(', '),
        statusCode: 400,
      })
    }

    const { userId } = request.user
    return syncService.mergeWords(userId, parsed.data.words)
  })

  // GET /sync — pull server words since timestamp
  app.get('/sync', { preHandler: [app.authenticate] }, async (request) => {
    const { since } = request.query as { since?: string }
    const { userId } = request.user
    return syncService.getWordsSince(userId, since ? Number(since) : undefined)
  })
}
