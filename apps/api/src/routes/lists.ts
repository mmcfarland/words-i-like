import type { FastifyInstance } from 'fastify'
import { CreateListSchema, UpdateListSchema } from '@words/shared'
import { listService } from '../services/list.js'

export async function listRoutes(app: FastifyInstance) {
  app.post('/lists', { preHandler: [app.authenticate] }, async (request, reply) => {
    const parsed = CreateListSchema.safeParse(request.body)
    if (!parsed.success) {
      return reply.status(400).send({
        error: 'Validation Error',
        message: parsed.error.issues.map(i => i.message).join(', '),
        statusCode: 400,
      })
    }

    const { userId } = request.user
    const list = await listService.create(userId, parsed.data)
    return reply.status(201).send(list)
  })

  app.get('/lists', { preHandler: [app.authenticate] }, async (request) => {
    const { userId } = request.user
    return listService.getAll(userId)
  })

  app.put('/lists/:id', { preHandler: [app.authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const parsed = UpdateListSchema.safeParse(request.body)
    if (!parsed.success) {
      return reply.status(400).send({
        error: 'Validation Error',
        message: parsed.error.issues.map(i => i.message).join(', '),
        statusCode: 400,
      })
    }

    const { userId } = request.user
    const result = await listService.update(id, userId, parsed.data)
    if (result.count === 0) {
      return reply.status(404).send({
        error: 'Not Found',
        message: 'List not found',
        statusCode: 404,
      })
    }

    return listService.getById(id, userId)
  })

  app.delete('/lists/:id', { preHandler: [app.authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const { userId } = request.user
    const result = await listService.delete(id, userId)
    if (result.count === 0) {
      return reply.status(404).send({
        error: 'Not Found',
        message: 'List not found',
        statusCode: 404,
      })
    }
    return reply.status(204).send()
  })
}
