import type { DefinitionStatusPrecedence, SyncDeletedWord, SyncRequest, SyncResponse, SyncWord } from '@words/shared'
import { prisma } from '@words/db'
import { DEFINITION_STATUS_RANK } from '@words/shared'

function betterDefinitionStatus(a: string, b: string): string {
  const rankA = DEFINITION_STATUS_RANK[a as DefinitionStatusPrecedence] || 0
  const rankB = DEFINITION_STATUS_RANK[b as DefinitionStatusPrecedence] || 0
  return rankA >= rankB ? a : b
}

function hasRicherDefinitions(a: unknown, b: unknown): boolean {
  const aArr = Array.isArray(a) ? a : []
  const bArr = Array.isArray(b) ? b : []
  if (aArr.length === 0 && bArr.length > 0)
    return false
  if (aArr.length > 0 && bArr.length === 0)
    return true
  return aArr.length >= bArr.length
}

function hasRicherExamples(a: unknown, b: unknown): boolean {
  const aArr = Array.isArray(a) ? a : []
  const bArr = Array.isArray(b) ? b : []
  if (aArr.length === 0 && bArr.length > 0)
    return false
  if (aArr.length > 0 && bArr.length === 0)
    return true
  return aArr.length >= bArr.length
}

function mapSyncWords(words: Array<{
  id: string
  text: string
  definitions: unknown
  examples: unknown
  pronunciation: string | null
  pronunciationAudio: string | null
  sourceUrl: string | null
  shareToken: string | null
  definitionStatus: string
  createdAt: Date
  updatedAt: Date
}>): SyncWord[] {
  return words.map(w => ({
    id: w.id,
    text: w.text,
    definitions: w.definitions as any,
    examples: Array.isArray(w.examples) ? w.examples as string[] : undefined,
    pronunciation: w.pronunciation || undefined,
    pronunciationAudio: w.pronunciationAudio || undefined,
    sourceUrl: w.sourceUrl || undefined,
    shareToken: w.shareToken || undefined,
    definitionStatus: w.definitionStatus as any,
    createdAt: w.createdAt.getTime(),
    updatedAt: w.updatedAt.getTime(),
  }))
}

function mapSyncDeletedWords(deletedWords: Array<{ text: string, deletedAt: Date }>): SyncDeletedWord[] {
  return deletedWords.map(word => ({
    text: word.text,
    deletedAt: word.deletedAt.getTime(),
  }))
}

export const syncService = {
  async mergeWords(userId: string, payload: SyncRequest): Promise<SyncResponse> {
    const syncedAt = Date.now()

    for (const deletedWord of payload.deleted) {
      const where = { text_userId: { text: deletedWord.text, userId } }
      await prisma.word.deleteMany({
        where: { text: deletedWord.text, userId },
      })
      await prisma.wordTombstone.upsert({
        where,
        create: {
          text: deletedWord.text,
          userId,
          deletedAt: new Date(deletedWord.deletedAt),
        },
        update: {
          deletedAt: new Date(deletedWord.deletedAt),
        },
      })
    }

    for (const clientWord of payload.words) {
      const where = { text_userId: { text: clientWord.text, userId } }
      const tombstone = await prisma.wordTombstone.findUnique({ where })
      if (tombstone) {
        if (clientWord.updatedAt <= tombstone.deletedAt.getTime())
          continue
        await prisma.wordTombstone.delete({ where })
      }

      const existing = await prisma.word.findFirst({
        where: { text: clientWord.text, userId },
      })

      if (existing) {
        // Smart merge: keep richer definition, better status
        const bestStatus = betterDefinitionStatus(existing.definitionStatus, clientWord.definitionStatus)
        const useClientDefs = !hasRicherDefinitions(existing.definitions, clientWord.definitions)
        const useClientExamples = !hasRicherExamples(existing.examples, clientWord.examples)

        await prisma.word.update({
          where: { id: existing.id },
          data: {
            definitionStatus: bestStatus,
            definitions: useClientDefs ? (clientWord.definitions as any) : undefined,
            examples: useClientExamples ? (clientWord.examples as any) || [] : undefined,
            pronunciation: clientWord.pronunciation || existing.pronunciation || undefined,
            pronunciationAudio: clientWord.pronunciationAudio || existing.pronunciationAudio || undefined,
            sourceUrl: clientWord.sourceUrl || existing.sourceUrl || undefined,
            syncedAt: new Date(syncedAt),
          },
        })
      }
      else {
        // New word from client
        await prisma.word.create({
          data: {
            text: clientWord.text,
            definitions: (clientWord.definitions as any) || [],
            examples: (clientWord.examples as any) || [],
            pronunciation: clientWord.pronunciation,
            pronunciationAudio: clientWord.pronunciationAudio,
            sourceUrl: clientWord.sourceUrl,
            definitionStatus: clientWord.definitionStatus,
            userId,
            createdAt: new Date(clientWord.createdAt),
            syncedAt: new Date(syncedAt),
          },
        })
      }
    }

    // Return all server words
    const allWords = await prisma.word.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    })
    const deletedWhere: any = { userId }
    if (payload.lastSyncedAt !== undefined) {
      deletedWhere.deletedAt = { gte: new Date(payload.lastSyncedAt) }
    }
    const deletedWords = await prisma.wordTombstone.findMany({
      where: deletedWhere,
      orderBy: { deletedAt: 'desc' },
    })

    return {
      words: mapSyncWords(allWords),
      deleted: mapSyncDeletedWords(deletedWords),
      syncedAt,
    }
  },

  async getWordsSince(userId: string, since?: number): Promise<SyncResponse> {
    const where: any = { userId }
    if (since !== undefined) {
      where.updatedAt = { gte: new Date(since) }
    }
    const deletedWhere: any = { userId }
    if (since !== undefined) {
      deletedWhere.deletedAt = { gte: new Date(since) }
    }

    const [words, deletedWords] = await Promise.all([
      prisma.word.findMany({
        where,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.wordTombstone.findMany({
        where: deletedWhere,
        orderBy: { deletedAt: 'desc' },
      }),
    ])

    return {
      words: mapSyncWords(words),
      deleted: mapSyncDeletedWords(deletedWords),
      syncedAt: Date.now(),
    }
  },
}
