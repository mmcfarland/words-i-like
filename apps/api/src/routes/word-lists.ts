import type { FastifyInstance } from 'fastify'
import { AssignWordToListsSchema } from '@words/shared'
import { listService } from '../services/list'

const DEMO_USER_ID = 'demo-user-id'

export async function wordListRoutes(app: FastifyInstance) {
  // Assign word to lists
  app.post('/words/:id/lists', async (request, reply) => {
    const { id: wordId } = request.params as { id: string }
    const parsed = AssignWordToListsSchema.safeParse(request.body)
    if (!parsed.success) {
      return reply.status(400).send({
        error: 'Validation Error',
        message: parsed.error.issues.map(i => i.message).join(', '),
        statusCode: 400,
      })
    }

    const results = await Promise.all(
      parsed.data.listIds.map(listId => listService.assignWord(wordId, listId, DEMO_USER_ID)),
    )

    if (results.includes(null)) {
      return reply.status(404).send({
        error: 'Not Found',
        message: 'Word or list not found',
        statusCode: 404,
      })
    }

    return reply.status(201).send({ success: true })
  })

  // Remove word from a list
  app.delete('/words/:id/lists/:listId', async (request, reply) => {
    const { id: wordId, listId } = request.params as { id: string, listId: string }
    const result = await listService.removeWord(wordId, listId, DEMO_USER_ID)

    if (result === null) {
      return reply.status(404).send({
        error: 'Not Found',
        message: 'Word or list not found',
        statusCode: 404,
      })
    }

    return reply.status(204).send()
  })

  // Get lists for a word
  app.get('/words/:id/lists', async (request, reply) => {
    const { id: wordId } = request.params as { id: string }
    const result = await listService.getWordLists(wordId, DEMO_USER_ID)

    if (result === null) {
      return reply.status(404).send({
        error: 'Not Found',
        message: 'Word not found',
        statusCode: 404,
      })
    }

    return result.map(wl => wl.list)
  })
}
