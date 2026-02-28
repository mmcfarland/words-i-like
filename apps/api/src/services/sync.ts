import type { DefinitionStatusPrecedence, SyncWord } from '@words/shared'
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

export const syncService = {
  async mergeWords(userId: string, clientWords: SyncWord[]): Promise<{ words: SyncWord[], syncedAt: number }> {
    const now = Date.now()
    const syncedAt = now

    for (const clientWord of clientWords) {
      const existing = await prisma.word.findFirst({
        where: { text: clientWord.text, userId },
      })

      if (existing) {
        // Smart merge: keep richer definition, better status
        const bestStatus = betterDefinitionStatus(existing.definitionStatus, clientWord.definitionStatus)
        const useClientDefs = !hasRicherDefinitions(existing.definitions, clientWord.definitions)

        await prisma.word.update({
          where: { id: existing.id },
          data: {
            definitionStatus: bestStatus,
            definitions: useClientDefs ? (clientWord.definitions as any) : undefined,
            pronunciation: clientWord.pronunciation || existing.pronunciation || undefined,
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
            pronunciation: clientWord.pronunciation,
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

    return {
      words: allWords.map(w => ({
        id: w.id,
        text: w.text,
        definitions: w.definitions as any,
        pronunciation: w.pronunciation || undefined,
        definitionStatus: w.definitionStatus as any,
        createdAt: w.createdAt.getTime(),
        updatedAt: w.updatedAt.getTime(),
      })),
      syncedAt,
    }
  },

  async getWordsSince(userId: string, since?: number): Promise<{ words: SyncWord[], syncedAt: number }> {
    const where: any = { userId }
    if (since) {
      where.updatedAt = { gte: new Date(since) }
    }

    const words = await prisma.word.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    })

    return {
      words: words.map(w => ({
        id: w.id,
        text: w.text,
        definitions: w.definitions as any,
        pronunciation: w.pronunciation || undefined,
        definitionStatus: w.definitionStatus as any,
        createdAt: w.createdAt.getTime(),
        updatedAt: w.updatedAt.getTime(),
      })),
      syncedAt: Date.now(),
    }
  },
}
