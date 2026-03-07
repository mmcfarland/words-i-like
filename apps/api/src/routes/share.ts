import type { FastifyInstance } from 'fastify'
import { randomUUID } from 'node:crypto'
import { prisma } from '@words/db'

async function getOrCreateShareToken(listId: string, existingShareToken: string | null) {
  if (existingShareToken)
    return existingShareToken

  const shareToken = randomUUID()
  const updated = await prisma.list.updateMany({
    where: { id: listId, shareToken: null },
    data: { shareToken },
  })

  if (updated.count > 0)
    return shareToken

  const latest = await prisma.list.findUnique({
    where: { id: listId },
    select: { shareToken: true },
  })

  if (latest?.shareToken)
    return latest.shareToken

  throw new Error('Failed to assign share token')
}

async function getOrCreateWordShareToken(wordId: string, existingShareToken: string | null) {
  if (existingShareToken)
    return existingShareToken

  const shareToken = randomUUID()
  const updated = await prisma.word.updateMany({
    where: { id: wordId, shareToken: null },
    data: { shareToken },
  })

  if (updated.count > 0)
    return shareToken

  const latest = await prisma.word.findUnique({
    where: { id: wordId },
    select: { shareToken: true },
  })

  if (latest?.shareToken)
    return latest.shareToken

  throw new Error('Failed to assign word share token')
}

export async function shareRoutes(app: FastifyInstance) {
  // Generate a share link for a word
  app.post('/api/words/:id/share', { preHandler: [app.authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const { userId } = request.user
    const word = await prisma.word.findFirst({
      where: { id, userId },
    })

    if (!word) {
      return reply.status(404).send({
        error: 'Not Found',
        message: 'Word not found',
        statusCode: 404,
      })
    }

    const shareToken = await getOrCreateWordShareToken(id, word.shareToken)
    return { shareToken, url: `/shared/word/${shareToken}` }
  })

  // Public endpoint for shared words — no auth required
  app.get('/shared/word/:token', async (request, reply) => {
    const { token } = request.params as { token: string }

    const word = await prisma.word.findUnique({
      where: { shareToken: token },
    })

    if (!word) {
      return reply.status(404).send({
        error: 'Not Found',
        message: 'Shared word not found',
        statusCode: 404,
      })
    }

    return {
      text: word.text,
      definitions: word.definitions,
      pronunciation: word.pronunciation,
      pronunciationAudio: word.pronunciationAudio,
      definitionStatus: word.definitionStatus,
      examples: word.examples,
      sourceUrl: word.sourceUrl,
    }
  })

  // Generate a share link for a list
  app.post('/api/lists/:id/share', { preHandler: [app.authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const { userId } = request.user
    const body = (request.body || {}) as {
      listName?: string
      words?: Array<{
        text?: string
        definitions?: unknown[]
        pronunciation?: string
        definitionStatus?: string
      }>
    }

    const list = await prisma.list.findFirst({
      where: { id, userId },
    })

    if (list) {
      const shareToken = await getOrCreateShareToken(id, list.shareToken)
      return { shareToken, url: `/shared/${shareToken}` }
    }

    // List doesn't exist on server — create a snapshot from client data
    const listName = body.listName?.trim()
    if (!listName) {
      return reply.status(404).send({
        error: 'Not Found',
        message: 'List not found',
        statusCode: 404,
      })
    }

    const shareToken = randomUUID()
    const newList = await prisma.list.create({
      data: {
        id,
        name: listName,
        userId,
        shareToken,
      },
    })

    const fallbackWords = Array.isArray(body.words) ? body.words : []
    let wordIndex = 0
    for (const word of fallbackWords) {
      const text = word.text?.trim()
      if (!text)
        continue

      // Check if user already has this word on server
      const existing = await prisma.word.findFirst({
        where: { text, userId },
      })

      const wordId = existing?.id ?? `${newList.id}-shared-${wordIndex++}`
      if (!existing) {
        await prisma.word.create({
          data: {
            id: wordId,
            text,
            definitions: (Array.isArray(word.definitions) ? word.definitions : []) as Parameters<typeof prisma.word.create>[0]['data']['definitions'],
            pronunciation: word.pronunciation || null,
            definitionStatus: typeof word.definitionStatus === 'string' ? word.definitionStatus : 'found',
            userId,
          },
        })
      }

      await prisma.wordList.upsert({
        where: { wordId_listId: { wordId, listId: newList.id } },
        update: {},
        create: { wordId, listId: newList.id },
      })
    }

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
