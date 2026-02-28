import type { CreateListInput, UpdateListInput } from '@words/shared'
import { prisma } from '@words/db'

export const listService = {
  async create(userId: string, input: CreateListInput) {
    return prisma.list.create({
      data: {
        name: input.name,
        userId,
      },
    })
  },

  async getAll(userId: string) {
    return prisma.list.findMany({
      where: { userId },
      orderBy: { createdAt: 'asc' },
    })
  },

  async getById(id: string, userId: string) {
    return prisma.list.findFirst({
      where: { id, userId },
    })
  },

  async update(id: string, userId: string, input: UpdateListInput) {
    return prisma.list.updateMany({
      where: { id, userId },
      data: { name: input.name },
    })
  },

  async delete(id: string, userId: string) {
    return prisma.list.deleteMany({
      where: { id, userId },
    })
  },

  async assignWord(wordId: string, listId: string, userId: string) {
    // Verify both word and list belong to user
    const [word, list] = await Promise.all([
      prisma.word.findFirst({ where: { id: wordId, userId } }),
      prisma.list.findFirst({ where: { id: listId, userId } }),
    ])
    if (!word || !list)
      return null

    return prisma.wordList.upsert({
      where: { wordId_listId: { wordId, listId } },
      update: {},
      create: { wordId, listId },
    })
  },

  async removeWord(wordId: string, listId: string, userId: string) {
    // Verify ownership
    const [word, list] = await Promise.all([
      prisma.word.findFirst({ where: { id: wordId, userId } }),
      prisma.list.findFirst({ where: { id: listId, userId } }),
    ])
    if (!word || !list)
      return null

    return prisma.wordList.deleteMany({
      where: { wordId, listId },
    })
  },

  async getWordLists(wordId: string, userId: string) {
    const word = await prisma.word.findFirst({ where: { id: wordId, userId } })
    if (!word)
      return null

    return prisma.wordList.findMany({
      where: { wordId },
      include: { list: true },
    })
  },
}
