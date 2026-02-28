import type { FastifyInstance } from 'fastify'
import { CreateWordSchema, UpdateWordSchema } from '@words/shared'
import { wordService } from '../services/word'

// Temporary: use a demo user until auth is implemented in Phase 6
const DEMO_USER_ID = 'demo-user-id'

export async function wordRoutes(app: FastifyInstance) {
  app.post('/words', async (request, reply) => {
    const parsed = CreateWordSchema.safeParse(request.body)
    if (!parsed.success) {
      return reply.status(400).send({
        error: 'Validation Error',
        message: parsed.error.issues.map(i => i.message).join(', '),
        statusCode: 400,
      })
    }

    try {
      const word = await wordService.create(DEMO_USER_ID, parsed.data)
      return reply.status(201).send(word)
    }
    catch (error: unknown) {
      if (error && typeof error === 'object' && 'code' in error && error.code === 'P2002') {
        return reply.status(409).send({
          error: 'Conflict',
          message: 'A word with this text already exists',
          statusCode: 409,
        })
      }
      throw error
    }
  })

  app.get('/words', async () => {
    return wordService.getAll(DEMO_USER_ID)
  })

  app.get('/words/:id', async (request, reply) => {
    const { id } = request.params as { id: string }
    const word = await wordService.getById(id, DEMO_USER_ID)
    if (!word) {
      return reply.status(404).send({
        error: 'Not Found',
        message: 'Word not found',
        statusCode: 404,
      })
    }
    return word
  })

  app.put('/words/:id', async (request, reply) => {
    const { id } = request.params as { id: string }
    const parsed = UpdateWordSchema.safeParse(request.body)
    if (!parsed.success) {
      return reply.status(400).send({
        error: 'Validation Error',
        message: parsed.error.issues.map(i => i.message).join(', '),
        statusCode: 400,
      })
    }

    const result = await wordService.update(id, DEMO_USER_ID, parsed.data)
    if (result.count === 0) {
      return reply.status(404).send({
        error: 'Not Found',
        message: 'Word not found',
        statusCode: 404,
      })
    }

    return wordService.getById(id, DEMO_USER_ID)
  })

  app.delete('/words/:id', async (request, reply) => {
    const { id } = request.params as { id: string }
    const result = await wordService.delete(id, DEMO_USER_ID)
    if (result.count === 0) {
      return reply.status(404).send({
        error: 'Not Found',
        message: 'Word not found',
        statusCode: 404,
      })
    }
    return reply.status(204).send()
  })
}
