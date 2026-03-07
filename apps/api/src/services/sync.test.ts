import type { SyncRequest } from '@words/shared'
import { DEFINITION_STATUS_RANK } from '@words/shared'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockPrisma = {
  word: {
    create: vi.fn(),
    deleteMany: vi.fn(),
    findFirst: vi.fn(),
    findMany: vi.fn(),
    update: vi.fn(),
  },
  wordTombstone: {
    delete: vi.fn(),
    findMany: vi.fn(),
    findUnique: vi.fn(),
    upsert: vi.fn(),
  },
}

vi.mock('@words/db', () => ({
  prisma: mockPrisma,
}))

const { syncService } = await import('./sync')

function buildRequest(overrides: Partial<SyncRequest> = {}): SyncRequest {
  return {
    words: [],
    deleted: [],
    ...overrides,
  }
}

function dbWord(overrides: Record<string, unknown> = {}) {
  return {
    id: 'word-1',
    text: 'ephemeral',
    definitions: [],
    examples: [],
    pronunciation: null,
    pronunciationAudio: null,
    sourceUrl: null,
    definitionStatus: 'pending',
    userId: 'user-1',
    syncedAt: null,
    createdAt: new Date(1000),
    updatedAt: new Date(1000),
    ...overrides,
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  mockPrisma.word.create.mockResolvedValue(dbWord())
  mockPrisma.word.deleteMany.mockResolvedValue({ count: 0 })
  mockPrisma.word.findFirst.mockResolvedValue(null)
  mockPrisma.word.findMany.mockResolvedValue([])
  mockPrisma.word.update.mockResolvedValue(dbWord())
  mockPrisma.wordTombstone.delete.mockResolvedValue({})
  mockPrisma.wordTombstone.findMany.mockResolvedValue([])
  mockPrisma.wordTombstone.findUnique.mockResolvedValue(null)
  mockPrisma.wordTombstone.upsert.mockResolvedValue({})
})

describe('sync merge logic', () => {
  it('ranks found > not_found > pending', () => {
    expect(DEFINITION_STATUS_RANK.found).toBeGreaterThan(DEFINITION_STATUS_RANK.not_found)
    expect(DEFINITION_STATUS_RANK.not_found).toBeGreaterThan(DEFINITION_STATUS_RANK.pending)
  })

  it('merges richer examples from client payload', async () => {
    mockPrisma.word.findFirst.mockResolvedValue(dbWord({
      examples: ['old example'],
      definitionStatus: 'pending',
    }))
    mockPrisma.word.findMany.mockResolvedValue([
      dbWord({
        examples: ['old example', 'new example'],
        definitionStatus: 'found',
        updatedAt: new Date(2000),
      }),
    ])

    const result = await syncService.mergeWords('user-1', buildRequest({
      words: [{
        id: 'client-1',
        text: 'ephemeral',
        definitions: [],
        pronunciation: '/ɪˈfɛm(ə)r(ə)l/',
        definitionStatus: 'found',
        examples: ['old example', 'new example'],
        createdAt: 1000,
        updatedAt: 2000,
      }],
    }))

    expect(mockPrisma.word.update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        examples: ['old example', 'new example'],
      }),
    }))
    expect(result.words[0].examples).toEqual(['old example', 'new example'])
  })

  it('records tombstones and prevents stale re-creation', async () => {
    const deletedAt = 5000
    mockPrisma.wordTombstone.findUnique.mockResolvedValue({
      id: 'tombstone-1',
      text: 'ghost',
      userId: 'user-1',
      deletedAt: new Date(deletedAt),
      createdAt: new Date(deletedAt),
      updatedAt: new Date(deletedAt),
    })
    mockPrisma.wordTombstone.findMany.mockResolvedValue([
      { text: 'ghost', deletedAt: new Date(deletedAt) },
    ])

    const result = await syncService.mergeWords('user-1', buildRequest({
      deleted: [{ text: 'ghost', deletedAt }],
      words: [{
        id: 'client-2',
        text: 'ghost',
        definitions: [],
        definitionStatus: 'pending',
        createdAt: 1000,
        updatedAt: 4000,
      }],
    }))

    expect(mockPrisma.word.deleteMany).toHaveBeenCalledWith({
      where: { text: 'ghost', userId: 'user-1' },
    })
    expect(mockPrisma.wordTombstone.upsert).toHaveBeenCalled()
    expect(mockPrisma.word.findFirst).not.toHaveBeenCalled()
    expect(result.deleted).toEqual([{ text: 'ghost', deletedAt }])
  })

  it('returns deleted tombstones on pull', async () => {
    mockPrisma.word.findMany.mockResolvedValue([
      dbWord({
        examples: ['An ephemeral moment.'],
        updatedAt: new Date(3000),
      }),
    ])
    mockPrisma.wordTombstone.findMany.mockResolvedValue([
      { text: 'removed-word', deletedAt: new Date(2500) },
    ])

    const result = await syncService.getWordsSince('user-1', 2000)

    expect(mockPrisma.word.findMany).toHaveBeenCalledWith({
      where: { userId: 'user-1', updatedAt: { gte: new Date(2000) } },
      orderBy: { createdAt: 'desc' },
    })
    expect(mockPrisma.wordTombstone.findMany).toHaveBeenCalledWith({
      where: { userId: 'user-1', deletedAt: { gte: new Date(2000) } },
      orderBy: { deletedAt: 'desc' },
    })
    expect(result.words[0].examples).toEqual(['An ephemeral moment.'])
    expect(result.deleted).toEqual([{ text: 'removed-word', deletedAt: 2500 }])
  })
})
