import type { FastifyInstance } from 'fastify'
import { randomUUID } from 'node:crypto'
import { prisma } from '@words/db'

const DEMO_USER_ID = 'demo-user-id'

export async function shareRoutes(app: FastifyInstance) {
  // Generate a share link for a list
  app.post('/api/lists/:id/share', async (request, reply) => {
    const { id } = request.params as { id: string }

    const list = await prisma.list.findFirst({
      where: { id, userId: DEMO_USER_ID },
    })

    if (!list) {
      return reply.status(404).send({
        error: 'Not Found',
        message: 'List not found',
        statusCode: 404,
      })
    }

    // If already shared, return existing token
    if (list.shareToken) {
      return { shareToken: list.shareToken, url: `/shared/${list.shareToken}` }
    }

    const shareToken = randomUUID()
    await prisma.list.update({
      where: { id },
      data: { shareToken },
    })

    return { shareToken, url: `/shared/${shareToken}` }
  })

  // Public endpoint — no auth required
  app.get('/shared/:token', async (request, reply) => {
    const { token } = request.params as { token: string }

    const list = await prisma.list.findUnique({
      where: { shareToken: token },
      include: {
        words: {
          include: { word: true },
          orderBy: { word: { createdAt: 'desc' } },
        },
      },
    })

    if (!list) {
      return reply.status(404).send({
        error: 'Not Found',
        message: 'Shared list not found',
        statusCode: 404,
      })
    }

    return {
      name: list.name,
      words: list.words.map(wl => ({
        id: wl.word.id,
        text: wl.word.text,
        definitions: wl.word.definitions,
        pronunciation: wl.word.pronunciation,
        definitionStatus: wl.word.definitionStatus,
      })),
    }
  })
}
