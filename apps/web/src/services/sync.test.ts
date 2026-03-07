import type { SyncWord, UserProfile, Word } from '@words/shared'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { wordStore } from '../db'
import { db } from '../db/schema'
import { authService } from './auth'
import { mergeServerWordsToLocal, queueDeletedWord, syncService } from './sync'

function makeWord(overrides: Partial<Word> = {}): Word {
  const now = Date.now()
  return {
    id: `test-${now}-${Math.random()}`,
    text: 'ephemeral',
    definitions: [{
      partOfSpeech: 'adjective',
      definitions: [{ definition: 'Lasting briefly.', synonyms: [], antonyms: [] }],
      synonyms: [],
      antonyms: [],
    }],
    pronunciation: '/test/',
    definitionStatus: 'found',
    createdAt: now,
    updatedAt: now,
    ...overrides,
  }
}

function makeSyncWord(overrides: Partial<SyncWord> = {}): SyncWord {
  const now = Date.now()
  return {
    id: `sync-${now}-${Math.random()}`,
    text: 'ephemeral',
    definitions: [{
      partOfSpeech: 'adjective',
      definitions: [{ definition: 'Lasting briefly.', synonyms: [], antonyms: [] }],
      synonyms: [],
      antonyms: [],
    }],
    pronunciation: '/test/',
    definitionStatus: 'found',
    examples: ['An ephemeral moment.'],
    createdAt: now,
    updatedAt: now,
    ...overrides,
  }
}

function makeUser(id: string): UserProfile {
  return {
    id,
    googleId: `${id}-google`,
    displayName: id,
    avatarUrl: null,
  }
}

beforeEach(async () => {
  await db.words.clear()
  localStorage.clear()
})

afterEach(async () => {
  await db.words.clear()
  localStorage.clear()
  vi.unstubAllGlobals()
})

describe('mergeServerWordsToLocal', () => {
  it('inserts new word from server when not in local store', async () => {
    const serverWord = makeSyncWord({ id: 'sw-1', text: 'serendipity' })
    await mergeServerWordsToLocal([serverWord])

    const all = await wordStore.getAll()
    expect(all).toHaveLength(1)
    expect(all[0].text).toBe('serendipity')
    expect(all[0].id).toBe('sw-1')
  })

  it('updates local word when server version is newer (higher updatedAt)', async () => {
    const localWord = makeWord({ id: 'w1', text: 'hello', updatedAt: 1000, definitionStatus: 'pending' })
    await wordStore.add(localWord)

    const serverWord = makeSyncWord({ id: 'sw-1', text: 'hello', updatedAt: 2000, definitionStatus: 'found' })
    await mergeServerWordsToLocal([serverWord])

    const all = await wordStore.getAll()
    expect(all).toHaveLength(1)
    expect(all[0].id).toBe('w1') // keeps original local id
    expect(all[0].definitionStatus).toBe('found')
  })

  it('skips update when server version is older (lower updatedAt)', async () => {
    const localWord = makeWord({ id: 'w1', text: 'hello', updatedAt: 2000, definitionStatus: 'found' })
    await wordStore.add(localWord)

    const serverWord = makeSyncWord({ id: 'sw-1', text: 'hello', updatedAt: 1000, definitionStatus: 'pending' })
    await mergeServerWordsToLocal([serverWord])

    const all = await wordStore.getAll()
    expect(all).toHaveLength(1)
    expect(all[0].definitionStatus).toBe('found') // unchanged
  })

  it('matches words case-insensitively (e.g., "Apple" matches "apple")', async () => {
    const localWord = makeWord({ id: 'w1', text: 'Apple', updatedAt: 1000, definitionStatus: 'pending' })
    await wordStore.add(localWord)

    const serverWord = makeSyncWord({ id: 'sw-1', text: 'apple', updatedAt: 2000, definitionStatus: 'found' })
    await mergeServerWordsToLocal([serverWord])

    const all = await wordStore.getAll()
    expect(all).toHaveLength(1) // no duplicate inserted
    expect(all[0].id).toBe('w1')
    expect(all[0].definitionStatus).toBe('found') // updated
  })

  it('handles null/undefined pronunciation gracefully', async () => {
    const localWord = makeWord({ id: 'w1', text: 'hello', updatedAt: 1000, pronunciation: '/helo/' })
    await wordStore.add(localWord)

    const serverWord = makeSyncWord({ id: 'sw-1', text: 'hello', updatedAt: 2000, pronunciation: undefined })
    await mergeServerWordsToLocal([serverWord])

    const all = await wordStore.getAll()
    expect(all).toHaveLength(1)
    // pronunciation falls back to existing when server is undefined
    expect(all[0].pronunciation).toBe('/helo/')
  })

  it('handles null/undefined examples gracefully', async () => {
    const localWord = makeWord({ id: 'w1', text: 'hello', updatedAt: 1000, examples: ['Hi there'] })
    await wordStore.add(localWord)

    const serverWord = makeSyncWord({ id: 'sw-1', text: 'hello', updatedAt: 2000, examples: undefined })
    await mergeServerWordsToLocal([serverWord])

    const all = await wordStore.getAll()
    expect(all).toHaveLength(1)
    // examples falls back to existing when server is undefined
    expect(all[0].examples).toEqual(['Hi there'])
  })

  it('handles empty definitions array', async () => {
    const serverWord = makeSyncWord({ id: 'sw-1', text: 'newword', definitions: [] })
    await mergeServerWordsToLocal([serverWord])

    const all = await wordStore.getAll()
    expect(all).toHaveLength(1)
    expect(all[0].definitions).toEqual([])
  })

  it('does not duplicate words on repeated merge calls', async () => {
    const serverWord = makeSyncWord({ id: 'sw-1', text: 'hello', updatedAt: 1000 })

    await mergeServerWordsToLocal([serverWord])
    await mergeServerWordsToLocal([serverWord])
    await mergeServerWordsToLocal([serverWord])

    const all = await wordStore.getAll()
    expect(all).toHaveLength(1)
  })
})

describe('syncService contract alignment', () => {
  it('sends pending deleted tombstones and clears queue after successful push', async () => {
    authService.setAuth('token-user-1', makeUser('user-1'))
    await wordStore.add(makeWord({ id: 'w1', text: 'hello' }))
    queueDeletedWord('ghost', 1234)

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ words: [], deleted: [], syncedAt: 5000 }),
    })
    vi.stubGlobal('fetch', fetchMock)

    await syncService.pushAndMerge()
    await syncService.pushAndMerge()

    const firstPayload = JSON.parse(fetchMock.mock.calls[0][1].body as string)
    const secondPayload = JSON.parse(fetchMock.mock.calls[1][1].body as string)

    expect(firstPayload.deleted).toEqual([{ text: 'ghost', deletedAt: 1234 }])
    expect(secondPayload.deleted).toEqual([])
  })

  it('stores sync cursor per-user namespace', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ words: [], deleted: [], syncedAt: 1111 }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ words: [], deleted: [], syncedAt: 2222 }),
      })
    vi.stubGlobal('fetch', fetchMock)

    authService.setAuth('token-user-a', makeUser('user-a'))
    await syncService.pushAndMerge()
    expect(syncService.getLastSyncedAt()).toBe(1111)

    authService.setAuth('token-user-b', makeUser('user-b'))
    expect(syncService.getLastSyncedAt()).toBeUndefined()
    await syncService.pushAndMerge()
    expect(syncService.getLastSyncedAt()).toBe(2222)

    authService.setAuth('token-user-a', makeUser('user-a'))
    expect(syncService.getLastSyncedAt()).toBe(1111)
  })

  it('applies deleted tombstones returned by pull responses', async () => {
    authService.setAuth('token-user-1', makeUser('user-1'))
    await wordStore.add(makeWord({ id: 'w1', text: 'hello' }))

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        words: [],
        deleted: [{ text: 'hello', deletedAt: 4000 }],
        syncedAt: 5000,
      }),
    })
    vi.stubGlobal('fetch', fetchMock)

    await syncService.pull()
    const all = await wordStore.getAll()
    expect(all).toHaveLength(0)
  })
})
