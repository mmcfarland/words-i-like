import { describe, expect, it, vi } from 'vitest'
import { buildApp } from '../server'

// Mock @words/db before importing anything that uses it
vi.mock('@words/db', () => {
  const lists = new Map<string, { id: string, name: string, userId: string, shareToken: string | null, createdAt: Date, updatedAt: Date }>()
  const wordLists: { wordId: string, listId: string }[] = []
  const words = new Map<string, { id: string, text: string, definitions: unknown[], pronunciation: string | null, pronunciationAudio: string | null, definitionStatus: string, examples: unknown[], sourceUrl: string | null, shareToken: string | null, userId: string, createdAt: Date, updatedAt: Date }>()
  const users = new Map<string, { id: string, googleId: string, displayName: string }>()

  return {
    prisma: {
      list: {
        findFirst: vi.fn(async ({ where }: { where: { id: string, userId: string } }) => {
          const list = lists.get(where.id)
          if (list && list.userId === where.userId)
            return list
          return null
        }),
        findUnique: vi.fn(async ({
          where,
          include,
          select,
        }: {
          where: { shareToken?: string, id?: string }
          include?: { words?: { include?: { word?: boolean }, orderBy?: unknown } }
          select?: { shareToken?: boolean }
        }) => {
          const list = where.id ? lists.get(where.id) : [...lists.values()].find(l => l.shareToken === where.shareToken)
          if (!list)
            return null
          if (select?.shareToken)
            return { shareToken: list.shareToken }
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
        updateMany: vi.fn(async ({ where, data }: { where: { id: string, shareToken?: null }, data: { shareToken: string } }) => {
          const list = lists.get(where.id)
          if (!list)
            return { count: 0 }
          if (where.shareToken === null && list.shareToken !== null)
            return { count: 0 }
          list.shareToken = data.shareToken
          lists.set(where.id, list)
          return { count: 1 }
        }),
        create: vi.fn(async ({ data }: { data: { id?: string, name: string, userId: string, shareToken?: string } }) => {
          const id = data.id || `list-${Date.now()}`
          if (lists.has(id)) {
            throw Object.assign(new Error('Unique constraint failed'), { code: 'P2002' })
          }
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
      user: {
        create: vi.fn(async ({ data }: { data: { googleId: string, displayName: string } }) => {
          const id = `user-${Date.now()}-${users.size}`
          const user = {
            id,
            googleId: data.googleId,
            displayName: data.displayName,
          }
          users.set(id, user)
          return user
        }),
      },
      word: {
        findFirst: vi.fn(async ({ where }: { where: { id: string, userId: string } }) => {
          const word = words.get(where.id)
          if (word && word.userId === where.userId)
            return word
          return null
        }),
        findUnique: vi.fn(async ({ where, select }: { where: { shareToken?: string, id?: string }, select?: { shareToken?: boolean } }) => {
          const word = where.id ? words.get(where.id) : [...words.values()].find(w => w.shareToken === where.shareToken)
          if (!word)
            return null
          if (select?.shareToken)
            return { shareToken: word.shareToken }
          return word
        }),
        updateMany: vi.fn(async ({ where, data }: { where: { id: string, shareToken?: null }, data: { shareToken: string } }) => {
          const word = words.get(where.id)
          if (!word)
            return { count: 0 }
          if (where.shareToken === null && word.shareToken !== null)
            return { count: 0 }
          word.shareToken = data.shareToken
          words.set(where.id, word)
          return { count: 1 }
        }),
        create: vi.fn(async ({ data }: { data: { id?: string, text: string, userId: string, definitions?: unknown[], pronunciation?: string, pronunciationAudio?: string, examples?: unknown[], sourceUrl?: string } }) => {
          const id = data.id || `word-${Date.now()}`
          const word = {
            id,
            text: data.text,
            definitions: data.definitions || [],
            pronunciation: data.pronunciation || null,
            pronunciationAudio: data.pronunciationAudio || null,
            definitionStatus: 'found',
            examples: data.examples || [],
            sourceUrl: data.sourceUrl || null,
            shareToken: null as string | null,
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
      _users: users,
    },
  }
})

describe('share routes', () => {
  it('generates a share token via POST /api/lists/:id/share', async () => {
    const { prisma } = await import('@words/db')
    // Seed a list
    await (prisma.list as any).create({ data: { id: 'list-1', name: 'My Words', userId: 'demo-user-id' } })

    const app = buildApp()
    await app.ready()
    const token = app.jwt.sign({ userId: 'demo-user-id' })
    const response = await app.inject({
      method: 'POST',
      url: '/api/lists/list-1/share',
      headers: { authorization: `Bearer ${token}` },
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
    await app.ready()
    const token = app.jwt.sign({ userId: 'demo-user-id' })
    const response = await app.inject({
      method: 'POST',
      url: '/api/lists/list-1/share',
      headers: { authorization: `Bearer ${token}` },
    })

    expect(response.statusCode).toBe(200)
    const body = response.json()
    expect(body.shareToken).toBe(existingToken)
    await app.close()
  })

  it('returns 401 when unauthenticated', async () => {
    const app = buildApp()
    const response = await app.inject({
      method: 'POST',
      url: '/api/lists/nonexistent/share',
    })

    expect(response.statusCode).toBe(401)
    await app.close()
  })

  it('returns 404 when list is not owned by authenticated user', async () => {
    const { prisma } = await import('@words/db')
    await (prisma.list as any).create({ data: { id: 'owner-list', name: 'Owner List', userId: 'owner-user-id' } })

    const app = buildApp()
    await app.ready()
    const token = app.jwt.sign({ userId: 'other-user-id' })
    const response = await app.inject({
      method: 'POST',
      url: '/api/lists/owner-list/share',
      headers: { authorization: `Bearer ${token}` },
    })

    expect(response.statusCode).toBe(404)
    await app.close()
  })

  it('returns persisted token when concurrent share assignment wins', async () => {
    const { prisma } = await import('@words/db')
    await (prisma.list as any).create({ data: { id: 'list-race', name: 'Race Words', userId: 'demo-user-id' } })

    vi.spyOn(prisma.list as any, 'updateMany').mockImplementationOnce(async () => {
      const list = (prisma as any)._lists.get('list-race')
      if (list) {
        list.shareToken = 'race-token'
        const lists = (prisma as any)._lists
        lists.set('list-race', list)
      }
      return { count: 0 }
    })

    const app = buildApp()
    await app.ready()
    const token = app.jwt.sign({ userId: 'demo-user-id' })
    const response = await app.inject({
      method: 'POST',
      url: '/api/lists/list-race/share',
      headers: { authorization: `Bearer ${token}` },
    })

    expect(response.statusCode).toBe(200)
    const body = response.json()
    expect(body.shareToken).toBe('race-token')
    expect(body.url).toBe('/shared/race-token')
    await app.close()
  })

  it('returns list with words via GET /shared/:token (no auth)', async () => {
    const { prisma } = await import('@words/db')

    // Ensure list-1 exists with a share token (seeded by earlier tests)
    const existingList = (prisma as any)._lists.get('list-1')
    if (!existingList) {
      await (prisma.list as any).create({ data: { id: 'list-1', name: 'My Words', userId: 'demo-user-id', shareToken: 'preset-token' } })
    }

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

  // Word sharing tests
  it('generates a share token via POST /api/words/:id/share', async () => {
    const { prisma } = await import('@words/db')
    await (prisma.word as any).create({ data: { id: 'word-share-1', text: 'ephemeral', userId: 'demo-user-id', definitions: [{ partOfSpeech: 'adjective', definitions: [{ definition: 'lasting a short time' }] }] } })

    const app = buildApp()
    await app.ready()
    const token = app.jwt.sign({ userId: 'demo-user-id' })
    const response = await app.inject({
      method: 'POST',
      url: '/api/words/word-share-1/share',
      headers: { authorization: `Bearer ${token}` },
    })

    expect(response.statusCode).toBe(200)
    const body = response.json()
    expect(body.shareToken).toBeDefined()
    expect(body.url).toMatch(/^\/shared\/word\//)
    await app.close()
  })

  it('returns existing token on re-share of a word', async () => {
    const { prisma } = await import('@words/db')
    const word = (prisma as any)._words.get('word-share-1')
    const existingToken = word?.shareToken

    const app = buildApp()
    await app.ready()
    const token = app.jwt.sign({ userId: 'demo-user-id' })
    const response = await app.inject({
      method: 'POST',
      url: '/api/words/word-share-1/share',
      headers: { authorization: `Bearer ${token}` },
    })

    expect(response.statusCode).toBe(200)
    const body = response.json()
    expect(body.shareToken).toBe(existingToken)
    await app.close()
  })

  it('returns 401 for word share without auth', async () => {
    const app = buildApp()
    const response = await app.inject({
      method: 'POST',
      url: '/api/words/nonexistent/share',
    })

    expect(response.statusCode).toBe(401)
    await app.close()
  })

  it('returns 404 for word not owned by user', async () => {
    const { prisma } = await import('@words/db')
    await (prisma.word as any).create({ data: { id: 'word-other-owner', text: 'private', userId: 'other-owner-id' } })

    const app = buildApp()
    await app.ready()
    const token = app.jwt.sign({ userId: 'not-the-owner' })
    const response = await app.inject({
      method: 'POST',
      url: '/api/words/word-other-owner/share',
      headers: { authorization: `Bearer ${token}` },
    })

    expect(response.statusCode).toBe(404)
    await app.close()
  })

  it('returns word data via GET /shared/word/:token (no auth)', async () => {
    const { prisma } = await import('@words/db')
    const word = (prisma as any)._words.get('word-share-1')

    const app = buildApp()
    const response = await app.inject({
      method: 'GET',
      url: `/shared/word/${word.shareToken}`,
    })

    expect(response.statusCode).toBe(200)
    const body = response.json()
    expect(body.text).toBe('ephemeral')
    expect(body.definitions).toBeDefined()
    expect(body.definitionStatus).toBe('found')
    await app.close()
  })

  it('returns 404 for invalid word share token', async () => {
    const app = buildApp()
    const response = await app.inject({
      method: 'GET',
      url: '/shared/word/invalid-word-token',
    })

    expect(response.statusCode).toBe(404)
    await app.close()
  })
})
