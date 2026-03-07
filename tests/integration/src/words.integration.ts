/**
 * Words CRUD Integration Tests
 *
 * Validates word create/read/update/delete against a real Postgres database:
 * - Create a word and retrieve it
 * - Unique constraint on text+userId
 * - Update word fields
 * - Delete word
 * - User isolation (user A can't access user B's words)
 */
import type { FastifyInstance } from 'fastify'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { authHeaders, createTestApp, createTestUser, resetDb } from './helpers'

describe('words CRUD integration', () => {
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

  describe('POST /api/words', () => {
    it('creates a word and returns it', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/words',
        headers: { 'content-type': 'application/json', ...authHeaders(token) },
        payload: {
          text: 'ephemeral',
          definitions: [{ partOfSpeech: 'adj', definitions: [{ definition: 'Short-lived', synonyms: [], antonyms: [] }], synonyms: [], antonyms: [] }],
          definitionStatus: 'found',
        },
      })

      expect(res.statusCode).toBe(201)
      const body = res.json()
      expect(body.text).toBe('ephemeral')
      expect(body.id).toBeTruthy()
      expect(body.definitionStatus).toBe('found')
    })

    it('rejects duplicate text for the same user', async () => {
      await app.inject({
        method: 'POST',
        url: '/api/words',
        headers: { 'content-type': 'application/json', ...authHeaders(token) },
        payload: { text: 'unique', definitions: [], definitionStatus: 'pending' },
      })

      const res = await app.inject({
        method: 'POST',
        url: '/api/words',
        headers: { 'content-type': 'application/json', ...authHeaders(token) },
        payload: { text: 'unique', definitions: [], definitionStatus: 'pending' },
      })

      expect(res.statusCode).toBe(409)
    })

    it('rejects invalid payload (missing text)', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/words',
        headers: { 'content-type': 'application/json', ...authHeaders(token) },
        payload: { definitions: [] },
      })

      expect(res.statusCode).toBe(400)
    })

    it('rejects unauthenticated request', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/words',
        headers: { 'content-type': 'application/json' },
        payload: { text: 'noauth', definitions: [], definitionStatus: 'pending' },
      })

      expect(res.statusCode).toBe(401)
    })
  })

  describe('GET /api/words', () => {
    it('returns all words for the user', async () => {
      await app.inject({
        method: 'POST',
        url: '/api/words',
        headers: { 'content-type': 'application/json', ...authHeaders(token) },
        payload: { text: 'word-a', definitions: [], definitionStatus: 'pending' },
      })
      await app.inject({
        method: 'POST',
        url: '/api/words',
        headers: { 'content-type': 'application/json', ...authHeaders(token) },
        payload: { text: 'word-b', definitions: [], definitionStatus: 'pending' },
      })

      const res = await app.inject({
        method: 'GET',
        url: '/api/words',
        headers: authHeaders(token),
      })

      expect(res.statusCode).toBe(200)
      const body = res.json()
      expect(body).toHaveLength(2)
    })
  })

  describe('GET /api/words/:id', () => {
    it('returns a specific word', async () => {
      const createRes = await app.inject({
        method: 'POST',
        url: '/api/words',
        headers: { 'content-type': 'application/json', ...authHeaders(token) },
        payload: { text: 'findme', definitions: [], definitionStatus: 'pending' },
      })
      const { id } = createRes.json()

      const res = await app.inject({
        method: 'GET',
        url: `/api/words/${id}`,
        headers: authHeaders(token),
      })

      expect(res.statusCode).toBe(200)
      expect(res.json().text).toBe('findme')
    })

    it('returns 404 for nonexistent word', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/words/nonexistent-id',
        headers: authHeaders(token),
      })

      expect(res.statusCode).toBe(404)
    })
  })

  describe('PUT /api/words/:id', () => {
    it('updates word fields', async () => {
      const createRes = await app.inject({
        method: 'POST',
        url: '/api/words',
        headers: { 'content-type': 'application/json', ...authHeaders(token) },
        payload: { text: 'updateme', definitions: [], definitionStatus: 'pending' },
      })
      const { id } = createRes.json()

      const res = await app.inject({
        method: 'PUT',
        url: `/api/words/${id}`,
        headers: { 'content-type': 'application/json', ...authHeaders(token) },
        payload: { definitionStatus: 'found' },
      })

      expect(res.statusCode).toBe(200)
      expect(res.json().definitionStatus).toBe('found')
    })

    it('returns 404 for nonexistent word', async () => {
      const res = await app.inject({
        method: 'PUT',
        url: '/api/words/does-not-exist',
        headers: { 'content-type': 'application/json', ...authHeaders(token) },
        payload: { definitionStatus: 'found' },
      })

      expect(res.statusCode).toBe(404)
    })
  })

  describe('DELETE /api/words/:id', () => {
    it('deletes a word', async () => {
      const createRes = await app.inject({
        method: 'POST',
        url: '/api/words',
        headers: { 'content-type': 'application/json', ...authHeaders(token) },
        payload: { text: 'deleteme', definitions: [], definitionStatus: 'pending' },
      })
      const { id } = createRes.json()

      const deleteRes = await app.inject({
        method: 'DELETE',
        url: `/api/words/${id}`,
        headers: authHeaders(token),
      })
      expect(deleteRes.statusCode).toBe(204)

      const getRes = await app.inject({
        method: 'GET',
        url: `/api/words/${id}`,
        headers: authHeaders(token),
      })
      expect(getRes.statusCode).toBe(404)
    })

    it('returns 404 for nonexistent word', async () => {
      const res = await app.inject({
        method: 'DELETE',
        url: '/api/words/does-not-exist',
        headers: authHeaders(token),
      })

      expect(res.statusCode).toBe(404)
    })
  })

  describe('user isolation', () => {
    it('user A cannot see user B\'s words', async () => {
      const userB = await createTestUser(app)

      // User A creates a word
      await app.inject({
        method: 'POST',
        url: '/api/words',
        headers: { 'content-type': 'application/json', ...authHeaders(token) },
        payload: { text: 'private-word', definitions: [], definitionStatus: 'pending' },
      })

      // User B should not see it
      const res = await app.inject({
        method: 'GET',
        url: '/api/words',
        headers: authHeaders(userB.token),
      })

      expect(res.statusCode).toBe(200)
      expect(res.json()).toHaveLength(0)
    })
  })
})
