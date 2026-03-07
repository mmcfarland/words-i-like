/**
 * Word-Lists Integration Tests
 *
 * Validates word-list assignment operations against a real Postgres database:
 * - Assign word to lists
 * - Remove word from a list
 * - Get lists for a word
 * - User isolation
 */
import type { FastifyInstance } from 'fastify'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { prisma } from '@words/db'
import { authHeaders, createTestApp, createTestUser, resetDb } from './helpers'

describe('word-lists integration', () => {
  let app: FastifyInstance
  let token: string

  beforeAll(async () => {
    app = await createTestApp()
  })

  afterAll(async () => {
    await app.close()
  })

  beforeEach(async () => {
    await resetDb()
    const testUser = await createTestUser(app)
    token = testUser.token
  })

  async function createWord(tok: string, text: string) {
    const res = await app.inject({
      method: 'POST',
      url: '/api/words',
      headers: { 'content-type': 'application/json', ...authHeaders(tok) },
      payload: { text, definitions: [], definitionStatus: 'pending' },
    })
    return res.json()
  }

  async function createList(tok: string, name: string) {
    const res = await app.inject({
      method: 'POST',
      url: '/api/lists',
      headers: { 'content-type': 'application/json', ...authHeaders(tok) },
      payload: { name },
    })
    return res.json()
  }

  describe('POST /api/words/:id/lists', () => {
    it('assigns a word to lists', async () => {
      const word = await createWord(token, 'hello')
      const list = await createList(token, 'Greetings')

      const res = await app.inject({
        method: 'POST',
        url: `/api/words/${word.id}/lists`,
        headers: { 'content-type': 'application/json', ...authHeaders(token) },
        payload: { listIds: [list.id] },
      })

      expect(res.statusCode).toBe(201)
      expect(res.json().success).toBe(true)
    })

    it('returns 404 for nonexistent word', async () => {
      const list = await createList(token, 'Greetings')

      const res = await app.inject({
        method: 'POST',
        url: '/api/words/nonexistent/lists',
        headers: { 'content-type': 'application/json', ...authHeaders(token) },
        payload: { listIds: [list.id] },
      })

      expect(res.statusCode).toBe(404)
    })

    it('rejects unauthenticated request', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/words/some-id/lists',
        headers: { 'content-type': 'application/json' },
        payload: { listIds: ['some-list'] },
      })

      expect(res.statusCode).toBe(401)
    })
  })

  describe('GET /api/words/:id/lists', () => {
    it('returns lists for a word', async () => {
      const word = await createWord(token, 'hello')
      const list1 = await createList(token, 'Greetings')
      const list2 = await createList(token, 'Common Words')

      await app.inject({
        method: 'POST',
        url: `/api/words/${word.id}/lists`,
        headers: { 'content-type': 'application/json', ...authHeaders(token) },
        payload: { listIds: [list1.id, list2.id] },
      })

      const res = await app.inject({
        method: 'GET',
        url: `/api/words/${word.id}/lists`,
        headers: authHeaders(token),
      })

      expect(res.statusCode).toBe(200)
      const lists = res.json()
      expect(lists).toHaveLength(2)
      const names = lists.map((l: { name: string }) => l.name).sort()
      expect(names).toEqual(['Common Words', 'Greetings'])
    })

    it('returns 404 for nonexistent word', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/words/nonexistent/lists',
        headers: authHeaders(token),
      })

      expect(res.statusCode).toBe(404)
    })

    it('filters out linked lists not owned by the word owner', async () => {
      const userB = await createTestUser(app)
      const word = await createWord(token, 'hello')
      const ownedList = await createList(token, 'Owned List')
      const foreignList = await createList(userB.token, 'Foreign List')

      await app.inject({
        method: 'POST',
        url: `/api/words/${word.id}/lists`,
        headers: { 'content-type': 'application/json', ...authHeaders(token) },
        payload: { listIds: [ownedList.id] },
      })

      await prisma.wordList.create({
        data: { wordId: word.id, listId: foreignList.id },
      })

      const res = await app.inject({
        method: 'GET',
        url: `/api/words/${word.id}/lists`,
        headers: authHeaders(token),
      })

      expect(res.statusCode).toBe(200)
      const lists = res.json()
      expect(lists).toHaveLength(1)
      expect(lists[0].id).toBe(ownedList.id)
    })
  })

  describe('DELETE /api/words/:id/lists/:listId', () => {
    it('removes a word from a list', async () => {
      const word = await createWord(token, 'hello')
      const list = await createList(token, 'Greetings')

      await app.inject({
        method: 'POST',
        url: `/api/words/${word.id}/lists`,
        headers: { 'content-type': 'application/json', ...authHeaders(token) },
        payload: { listIds: [list.id] },
      })

      const deleteRes = await app.inject({
        method: 'DELETE',
        url: `/api/words/${word.id}/lists/${list.id}`,
        headers: authHeaders(token),
      })
      expect(deleteRes.statusCode).toBe(204)

      // Verify removed
      const getRes = await app.inject({
        method: 'GET',
        url: `/api/words/${word.id}/lists`,
        headers: authHeaders(token),
      })
      expect(getRes.json()).toHaveLength(0)
    })

    it('returns 404 for nonexistent word or list', async () => {
      const res = await app.inject({
        method: 'DELETE',
        url: '/api/words/nonexistent/lists/nonexistent',
        headers: authHeaders(token),
      })

      expect(res.statusCode).toBe(404)
    })
  })

  describe('user isolation', () => {
    it('user A cannot see lists for user B\'s word', async () => {
      const userB = await createTestUser(app)

      const word = await createWord(token, 'private')
      const list = await createList(token, 'My List')

      await app.inject({
        method: 'POST',
        url: `/api/words/${word.id}/lists`,
        headers: { 'content-type': 'application/json', ...authHeaders(token) },
        payload: { listIds: [list.id] },
      })

      // User B tries to get lists for user A's word
      const res = await app.inject({
        method: 'GET',
        url: `/api/words/${word.id}/lists`,
        headers: authHeaders(userB.token),
      })

      expect(res.statusCode).toBe(404)
    })

    it('user A cannot assign user B\'s word to a list', async () => {
      const userB = await createTestUser(app)

      const wordA = await createWord(token, 'wordA')
      const listB = await createList(userB.token, 'B List')

      // User A tries to assign their word to user B's list
      const res = await app.inject({
        method: 'POST',
        url: `/api/words/${wordA.id}/lists`,
        headers: { 'content-type': 'application/json', ...authHeaders(token) },
        payload: { listIds: [listB.id] },
      })

      expect(res.statusCode).toBe(404)
    })
  })
})
