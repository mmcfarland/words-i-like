/**
 * Lists CRUD Integration Tests
 *
 * Validates list create/read/update/delete against a real Postgres database:
 * - Create a list and retrieve it
 * - Update list fields
 * - Delete list
 * - User isolation (user A can't access user B's lists)
 */
import type { FastifyInstance } from 'fastify'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { authHeaders, createTestApp, createTestUser, resetDb } from './helpers'

describe('lists CRUD integration', () => {
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

  describe('POST /api/lists', () => {
    it('creates a list and returns it', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/lists',
        headers: { 'content-type': 'application/json', ...authHeaders(token) },
        payload: { name: 'My List' },
      })

      expect(res.statusCode).toBe(201)
      const body = res.json()
      expect(body.name).toBe('My List')
      expect(body.id).toBeTruthy()
    })

    it('rejects unauthenticated request', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/lists',
        headers: { 'content-type': 'application/json' },
        payload: { name: 'No Auth' },
      })

      expect(res.statusCode).toBe(401)
    })

    it('rejects invalid payload (missing name)', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/lists',
        headers: { 'content-type': 'application/json', ...authHeaders(token) },
        payload: {},
      })

      expect(res.statusCode).toBe(400)
    })
  })

  describe('GET /api/lists', () => {
    it('returns all lists for the user', async () => {
      await app.inject({
        method: 'POST',
        url: '/api/lists',
        headers: { 'content-type': 'application/json', ...authHeaders(token) },
        payload: { name: 'List A' },
      })
      await app.inject({
        method: 'POST',
        url: '/api/lists',
        headers: { 'content-type': 'application/json', ...authHeaders(token) },
        payload: { name: 'List B' },
      })

      const res = await app.inject({
        method: 'GET',
        url: '/api/lists',
        headers: authHeaders(token),
      })

      expect(res.statusCode).toBe(200)
      expect(res.json()).toHaveLength(2)
    })
  })

  describe('PUT /api/lists/:id', () => {
    it('updates list name', async () => {
      const createRes = await app.inject({
        method: 'POST',
        url: '/api/lists',
        headers: { 'content-type': 'application/json', ...authHeaders(token) },
        payload: { name: 'Old Name' },
      })
      const { id } = createRes.json()

      const res = await app.inject({
        method: 'PUT',
        url: `/api/lists/${id}`,
        headers: { 'content-type': 'application/json', ...authHeaders(token) },
        payload: { name: 'New Name' },
      })

      expect(res.statusCode).toBe(200)
      expect(res.json().name).toBe('New Name')
    })

    it('returns 404 for nonexistent list', async () => {
      const res = await app.inject({
        method: 'PUT',
        url: '/api/lists/does-not-exist',
        headers: { 'content-type': 'application/json', ...authHeaders(token) },
        payload: { name: 'Updated' },
      })

      expect(res.statusCode).toBe(404)
    })
  })

  describe('DELETE /api/lists/:id', () => {
    it('deletes a list', async () => {
      const createRes = await app.inject({
        method: 'POST',
        url: '/api/lists',
        headers: { 'content-type': 'application/json', ...authHeaders(token) },
        payload: { name: 'Delete Me' },
      })
      const { id } = createRes.json()

      const deleteRes = await app.inject({
        method: 'DELETE',
        url: `/api/lists/${id}`,
        headers: authHeaders(token),
      })
      expect(deleteRes.statusCode).toBe(204)

      // Verify it's gone
      const getRes = await app.inject({
        method: 'GET',
        url: '/api/lists',
        headers: authHeaders(token),
      })
      expect(getRes.json()).toHaveLength(0)
    })

    it('returns 404 for nonexistent list', async () => {
      const res = await app.inject({
        method: 'DELETE',
        url: '/api/lists/does-not-exist',
        headers: authHeaders(token),
      })

      expect(res.statusCode).toBe(404)
    })
  })

  describe('user isolation', () => {
    it('user A cannot see user B\'s lists', async () => {
      const userB = await createTestUser(app)

      // User A creates a list
      await app.inject({
        method: 'POST',
        url: '/api/lists',
        headers: { 'content-type': 'application/json', ...authHeaders(token) },
        payload: { name: 'Private List' },
      })

      // User B should not see it
      const res = await app.inject({
        method: 'GET',
        url: '/api/lists',
        headers: authHeaders(userB.token),
      })

      expect(res.statusCode).toBe(200)
      expect(res.json()).toHaveLength(0)
    })

    it('user A cannot update user B\'s list', async () => {
      const userB = await createTestUser(app)

      const createRes = await app.inject({
        method: 'POST',
        url: '/api/lists',
        headers: { 'content-type': 'application/json', ...authHeaders(token) },
        payload: { name: 'A\'s List' },
      })
      const { id } = createRes.json()

      const res = await app.inject({
        method: 'PUT',
        url: `/api/lists/${id}`,
        headers: { 'content-type': 'application/json', ...authHeaders(userB.token) },
        payload: { name: 'Hijacked' },
      })

      expect(res.statusCode).toBe(404)
    })

    it('user A cannot delete user B\'s list', async () => {
      const userB = await createTestUser(app)

      const createRes = await app.inject({
        method: 'POST',
        url: '/api/lists',
        headers: { 'content-type': 'application/json', ...authHeaders(token) },
        payload: { name: 'A\'s List' },
      })
      const { id } = createRes.json()

      const res = await app.inject({
        method: 'DELETE',
        url: `/api/lists/${id}`,
        headers: authHeaders(userB.token),
      })

      expect(res.statusCode).toBe(404)
    })
  })
})
