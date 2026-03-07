/**
 * Share Integration Tests
 *
 * Validates the authenticated share lifecycle against a real Postgres database:
 * - Creating a share link for a user-owned list
 * - Retrieving shared list by token
 * - 404 for invalid tokens
 * - Idempotent sharing (same list ID reuses token for owner)
 */
import type { FastifyInstance } from 'fastify'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { prisma } from '@words/db'
import { authHeaders, createTestApp, createTestUser, resetDb } from './helpers'

describe('share integration', () => {
  let app: FastifyInstance

  beforeAll(async () => {
    app = await createTestApp()
  })

  afterAll(async () => {
    await app.close()
  })

  beforeEach(async () => {
    await resetDb()
  })

  describe('POST /api/lists/:id/share', () => {
    it('returns 401 when unauthenticated', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/lists/nonexistent/share',
      })

      expect(res.statusCode).toBe(401)
    })

    it('authenticated user shares their own list (uses real userId)', async () => {
      const { user, token } = await createTestUser(app, { displayName: 'Share Owner' })

      // Create a list owned by this user
      const list = await prisma.list.create({
        data: { id: 'auth-share-list', name: 'My Auth List', userId: user.id },
      })

      const res = await app.inject({
        method: 'POST',
        url: `/api/lists/${list.id}/share`,
        headers: authHeaders(token),
      })

      expect(res.statusCode).toBe(200)
      const body = res.json()
      expect(body.shareToken).toBeTruthy()
      expect(body.url).toContain(body.shareToken)

      // No orphan snapshot users should be created
      const users = await prisma.user.findMany()
      expect(users).toHaveLength(1)
      expect(users[0].id).toBe(user.id)
    })

    it('returns the same token for owner re-sharing the same list', async () => {
      const { user, token } = await createTestUser(app, { displayName: 'Share Owner Idempotent' })
      const list = await prisma.list.create({
        data: { id: 'idempotent-list', name: 'Idempotent List', userId: user.id },
      })

      const res1 = await app.inject({
        method: 'POST',
        url: `/api/lists/${list.id}/share`,
        headers: authHeaders(token),
      })
      const res2 = await app.inject({
        method: 'POST',
        url: `/api/lists/${list.id}/share`,
        headers: authHeaders(token),
      })

      expect(res1.statusCode).toBe(200)
      expect(res2.statusCode).toBe(200)
      expect(res1.json().shareToken).toBe(res2.json().shareToken)
    })

    it('returns 404 when list is not owned by authenticated user', async () => {
      const { user: owner } = await createTestUser(app, { displayName: 'List Owner' })
      const { token } = await createTestUser(app, { displayName: 'Different User' })
      const list = await prisma.list.create({
        data: { id: 'owner-only-list', name: 'Owner Only', userId: owner.id },
      })

      const res = await app.inject({
        method: 'POST',
        url: `/api/lists/${list.id}/share`,
        headers: authHeaders(token),
      })

      expect(res.statusCode).toBe(404)
    })
  })

  describe('GET /shared/:token', () => {
    it('returns shared list words by valid token', async () => {
      const { user, token } = await createTestUser(app, { displayName: 'Share Reader Owner' })
      const list = await prisma.list.create({
        data: { id: 'share-read-test', name: 'Readable List', userId: user.id },
      })
      const solitude = await prisma.word.create({
        data: {
          id: 'word-solitude',
          text: 'solitude',
          definitions: [{ partOfSpeech: 'noun', definitions: [{ definition: 'The state of being alone' }] }],
          definitionStatus: 'found',
          userId: user.id,
        },
      })
      const tranquil = await prisma.word.create({
        data: {
          id: 'word-tranquil',
          text: 'tranquil',
          definitions: [],
          definitionStatus: 'pending',
          userId: user.id,
        },
      })
      await prisma.wordList.create({ data: { wordId: solitude.id, listId: list.id } })
      await prisma.wordList.create({ data: { wordId: tranquil.id, listId: list.id } })

      const createRes = await app.inject({
        method: 'POST',
        url: `/api/lists/${list.id}/share`,
        headers: authHeaders(token),
      })

      expect(createRes.statusCode).toBe(200)
      const { shareToken } = createRes.json()

      // Retrieve it (public — no auth needed)
      const res = await app.inject({
        method: 'GET',
        url: `/shared/${shareToken}`,
      })

      expect(res.statusCode).toBe(200)
      const body = res.json()
      expect(body.name).toBe('Readable List')
      expect(body.words).toHaveLength(2)
      expect(body.words.map((w: { text: string }) => w.text).sort()).toEqual(['solitude', 'tranquil'])
    })

    it('returns 404 for an invalid share token', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/shared/does-not-exist',
      })

      expect(res.statusCode).toBe(404)
    })
  })

  describe('POST /api/words/:id/share', () => {
    it('authenticated user shares a word and retrieves it publicly', async () => {
      const { user, token } = await createTestUser(app, { displayName: 'Word Sharer' })
      const word = await prisma.word.create({
        data: {
          id: 'word-share-int',
          text: 'serendipity',
          definitions: [{ partOfSpeech: 'noun', definitions: [{ definition: 'happy accident' }] }],
          examples: ['What a serendipity!'],
          pronunciation: '/ˌsɛr.ənˈdɪp.ɪ.ti/',
          pronunciationAudio: 'https://example.com/audio.mp3',
          sourceUrl: 'https://example.com',
          definitionStatus: 'found',
          userId: user.id,
        },
      })

      // Create share
      const createRes = await app.inject({
        method: 'POST',
        url: `/api/words/${word.id}/share`,
        headers: authHeaders(token),
      })

      expect(createRes.statusCode).toBe(200)
      const body = createRes.json()
      expect(body.shareToken).toBeTruthy()
      expect(body.url).toContain(body.shareToken)

      // Re-share returns same token
      const reShareRes = await app.inject({
        method: 'POST',
        url: `/api/words/${word.id}/share`,
        headers: authHeaders(token),
      })
      expect(reShareRes.json().shareToken).toBe(body.shareToken)

      // Retrieve publicly
      const getRes = await app.inject({
        method: 'GET',
        url: `/shared/word/${body.shareToken}`,
      })

      expect(getRes.statusCode).toBe(200)
      const wordData = getRes.json()
      expect(wordData.text).toBe('serendipity')
      expect(wordData.definitions).toHaveLength(1)
      expect(wordData.pronunciation).toBe('/ˌsɛr.ənˈdɪp.ɪ.ti/')
      expect(wordData.pronunciationAudio).toBe('https://example.com/audio.mp3')
      expect(wordData.definitionStatus).toBe('found')
      expect(wordData.examples).toEqual(['What a serendipity!'])
      expect(wordData.sourceUrl).toBe('https://example.com')
    })
  })

  describe('GET /shared/word/:token', () => {
    it('returns 404 for an invalid word share token', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/shared/word/does-not-exist',
      })

      expect(res.statusCode).toBe(404)
    })
  })
})
