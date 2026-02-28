import type { Prisma } from '@words/db'
import type { CreateWordInput, UpdateWordInput } from '@words/shared'
import { prisma } from '@words/db'

export const wordService = {
  async create(userId: string, input: CreateWordInput) {
    return prisma.word.create({
      data: {
        id: input.id || undefined,
        text: input.text,
        definitions: input.definitions as unknown as Prisma.InputJsonValue,
        pronunciation: input.pronunciation,
        definitionStatus: input.definitionStatus,
        userId,
        createdAt: input.createdAt ? new Date(input.createdAt) : undefined,
        updatedAt: input.updatedAt ? new Date(input.updatedAt) : undefined,
      },
    })
  },

  async getAll(userId: string) {
    return prisma.word.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    })
  },

  async getById(id: string, userId: string) {
    return prisma.word.findFirst({
      where: { id, userId },
    })
  },

  async update(id: string, userId: string, input: UpdateWordInput) {
    return prisma.word.updateMany({
      where: { id, userId },
      data: {
        ...input.text !== undefined && { text: input.text },
        ...input.definitions !== undefined && { definitions: input.definitions as unknown as Prisma.InputJsonValue },
        ...input.pronunciation !== undefined && { pronunciation: input.pronunciation },
        ...input.definitionStatus !== undefined && { definitionStatus: input.definitionStatus },
      },
    })
  },

  async delete(id: string, userId: string) {
    return prisma.word.deleteMany({
      where: { id, userId },
    })
  },
}
