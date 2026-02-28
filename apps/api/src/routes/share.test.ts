import { describe, expect, it, vi } from 'vitest'
import { buildApp } from '../server'

// Mock @words/db before importing anything that uses it
vi.mock('@words/db', () => {
  const lists = new Map<string, { id: string, name: string, userId: string, shareToken: string | null, createdAt: Date, updatedAt: Date }>()
  const wordLists: { wordId: string, listId: string }[] = []
  const words = new Map<string, { id: string, text: string, definitions: unknown[], pronunciation: string | null, definitionStatus: string, userId: string, createdAt: Date, updatedAt: Date }>()

  return {
    prisma: {
      list: {
        findFirst: vi.fn(async ({ where }: { where: { id: string, userId: string } }) => {
          const list = lists.get(where.id)
          if (list && list.userId === where.userId)
            return list
          return null
        }),
        findUnique: vi.fn(async ({ where, include }: { where: { shareToken: string }, include?: { words?: { include?: { word?: boolean }, orderBy?: unknown } } }) => {
          const list = [...lists.values()].find(l => l.shareToken === where.shareToken)
          if (!list)
            return null
          if (include?.words) {
            const wls = wordLists.filter(wl => wl.listId === list.id)
            return {
              ...list,
              words: wls.map(wl => ({
                word: words.get(wl.wordId),
                wordId: wl.wordId,
                listId: wl.listId,
              })),
            }
          }
          return list
        }),
        update: vi.fn(async ({ where, data }: { where: { id: string }, data: { shareToken: string } }) => {
          const list = lists.get(where.id)
          if (list) {
            list.shareToken = data.shareToken
            lists.set(where.id, list)
          }
          return list
        }),
        create: vi.fn(async ({ data }: { data: { id?: string, name: string, userId: string, shareToken?: string } }) => {
          const id = data.id || `list-${Date.now()}`
          const list = {
            id,
            name: data.name,
            userId: data.userId,
            shareToken: data.shareToken || null,
            createdAt: new Date(),
            updatedAt: new Date(),
          }
          lists.set(id, list)
          return list
        }),
      },
      word: {
        create: vi.fn(async ({ data }: { data: { id?: string, text: string, userId: string, definitions?: unknown[], pronunciation?: string } }) => {
          const id = data.id || `word-${Date.now()}`
          const word = {
            id,
            text: data.text,
            definitions: data.definitions || [],
            pronunciation: data.pronunciation || null,
            definitionStatus: 'found',
            userId: data.userId,
            createdAt: new Date(),
            updatedAt: new Date(),
          }
          words.set(id, word)
          return word
        }),
      },
      wordList: {
        create: vi.fn(async ({ data }: { data: { wordId: string, listId: string } }) => {
          wordLists.push(data)
          return data
        }),
      },
      _lists: lists,
      _words: words,
      _wordLists: wordLists,
    },
  }
})

describe('share routes', () => {
  it('generates a share token via POST /api/lists/:id/share', async () => {
    const { prisma } = await import('@words/db')
    // Seed a list
    await (prisma.list as any).create({ data: { id: 'list-1', name: 'My Words', userId: 'demo-user-id' } })

    const app = buildApp()
    const response = await app.inject({
      method: 'POST',
      url: '/api/lists/list-1/share',
    })

    expect(response.statusCode).toBe(200)
    const body = response.json()
    expect(body.shareToken).toBeDefined()
    expect(body.url).toMatch(/^\/shared\//)
    await app.close()
  })

  it('returns existing token if already shared', async () => {
    const { prisma } = await import('@words/db')
    const list = (prisma as any)._lists.get('list-1')
    const existingToken = list?.shareToken

    const app = buildApp()
    const response = await app.inject({
      method: 'POST',
      url: '/api/lists/list-1/share',
    })

    expect(response.statusCode).toBe(200)
    const body = response.json()
    expect(body.shareToken).toBe(existingToken)
    await app.close()
  })

  it('returns 404 for unknown list', async () => {
    const app = buildApp()
    const response = await app.inject({
      method: 'POST',
      url: '/api/lists/nonexistent/share',
    })

    expect(response.statusCode).toBe(404)
    await app.close()
  })

  it('returns list with words via GET /shared/:token (no auth)', async () => {
    const { prisma } = await import('@words/db')

    // Seed a word and assign it to the list
    await (prisma.word as any).create({ data: { id: 'word-1', text: 'serendipity', userId: 'demo-user-id', definitions: [{ partOfSpeech: 'noun', definitions: [{ definition: 'happy accident' }] }] } })
    await (prisma.wordList as any).create({ data: { wordId: 'word-1', listId: 'list-1' } })

    const list = (prisma as any)._lists.get('list-1')

    const app = buildApp()
    const response = await app.inject({
      method: 'GET',
      url: `/shared/${list.shareToken}`,
    })

    expect(response.statusCode).toBe(200)
    const body = response.json()
    expect(body.name).toBe('My Words')
    expect(body.words).toHaveLength(1)
    expect(body.words[0].text).toBe('serendipity')
    await app.close()
  })

  it('returns 404 for invalid token', async () => {
    const app = buildApp()
    const response = await app.inject({
      method: 'GET',
      url: '/shared/invalid-token',
    })

    expect(response.statusCode).toBe(404)
    await app.close()
  })
})
