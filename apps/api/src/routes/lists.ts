import type { FastifyInstance } from 'fastify'
import { CreateListSchema, UpdateListSchema } from '@words/shared'
import { listService } from '../services/list'

const DEMO_USER_ID = 'demo-user-id'

export async function listRoutes(app: FastifyInstance) {
  app.post('/lists', async (request, reply) => {
    const parsed = CreateListSchema.safeParse(request.body)
    if (!parsed.success) {
      return reply.status(400).send({
        error: 'Validation Error',
        message: parsed.error.issues.map(i => i.message).join(', '),
        statusCode: 400,
      })
    }

    const list = await listService.create(DEMO_USER_ID, parsed.data)
    return reply.status(201).send(list)
  })

  app.get('/lists', async () => {
    return listService.getAll(DEMO_USER_ID)
  })

  app.put('/lists/:id', async (request, reply) => {
    const { id } = request.params as { id: string }
    const parsed = UpdateListSchema.safeParse(request.body)
    if (!parsed.success) {
      return reply.status(400).send({
        error: 'Validation Error',
        message: parsed.error.issues.map(i => i.message).join(', '),
        statusCode: 400,
      })
    }

    const result = await listService.update(id, DEMO_USER_ID, parsed.data)
    if (result.count === 0) {
      return reply.status(404).send({
        error: 'Not Found',
        message: 'List not found',
        statusCode: 404,
      })
    }

    return listService.getById(id, DEMO_USER_ID)
  })

  app.delete('/lists/:id', async (request, reply) => {
    const { id } = request.params as { id: string }
    const result = await listService.delete(id, DEMO_USER_ID)
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
