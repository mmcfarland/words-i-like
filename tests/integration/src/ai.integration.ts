/**
 * AI Examples Integration Tests
 *
 * Validates the AI examples endpoint with real auth/database behavior while
 * stubbing the upstream provider for deterministic responses.
 */
import type { FastifyInstance } from 'fastify'
import { prisma } from '@words/db'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { authHeaders, createTestApp, createTestUser, resetDb } from './helpers'

describe('ai examples integration', () => {
  let app: FastifyInstance

  beforeAll(async () => {
    app = await createTestApp()
  })

  afterAll(async () => {
    await app.close()
  })

  beforeEach(async () => {
    await resetDb()
    vi.unstubAllGlobals()
    process.env.AZURE_OPENAI_ENDPOINT = 'https://example.openai.azure.com'
    process.env.AZURE_OPENAI_API_KEY = 'test-api-key'
    process.env.AZURE_OPENAI_DEPLOYMENT = 'test-deployment'
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  async function createWordForUser(userId: string, text = 'ephemeral') {
    return prisma.word.create({
      data: {
        text,
        userId,
        definitions: [],
        definitionStatus: 'pending',
      },
    })
  }

  it('returns generated examples and usage metadata on success', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [{
          message: {
            content: 'A first usage example.\nA second usage example.\nA third usage example.',
          },
        }],
      }),
    })
    vi.stubGlobal('fetch', fetchMock)

    const { user, token } = await createTestUser(app)
    const word = await createWordForUser(user.id)

    const res = await app.inject({
      method: 'POST',
      url: `/api/words/${word.id}/examples`,
      headers: { ...authHeaders(token), 'content-type': 'application/json' },
      payload: {},
    })

    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.examples).toHaveLength(3)
    expect(body.source).toBe('azure')
    expect(body.remaining).toBe(19)
    expect(body.limit).toBe(20)

    const updatedUser = await prisma.user.findUnique({ where: { id: user.id } })
    expect(updatedUser?.dailyAiUsageCount).toBe(1)
  })

  it('returns 503 and does not increment usage when provider fails', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 503,
    })
    vi.stubGlobal('fetch', fetchMock)

    const { user, token } = await createTestUser(app)
    const word = await createWordForUser(user.id)

    const res = await app.inject({
      method: 'POST',
      url: `/api/words/${word.id}/examples`,
      headers: { ...authHeaders(token), 'content-type': 'application/json' },
      payload: {},
    })

    expect(res.statusCode).toBe(503)
    expect(res.json().message).toBe('AI examples are temporarily unavailable. Please try again later.')

    const updatedUser = await prisma.user.findUnique({ where: { id: user.id } })
    expect(updatedUser?.dailyAiUsageCount).toBe(0)
  })

  it('applies rate limits after usage is exhausted', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [{
          message: {
            content: 'One.\nTwo.\nThree.',
          },
        }],
      }),
    })
    vi.stubGlobal('fetch', fetchMock)

    const { user, token } = await createTestUser(app)
    const word = await createWordForUser(user.id)

    await prisma.user.update({
      where: { id: user.id },
      data: {
        dailyAiUsageCount: 19,
        dailyAiUsageResetAt: new Date(),
      },
    })

    const successRes = await app.inject({
      method: 'POST',
      url: `/api/words/${word.id}/examples`,
      headers: { ...authHeaders(token), 'content-type': 'application/json' },
      payload: {},
    })

    expect(successRes.statusCode).toBe(200)
    expect(successRes.json().remaining).toBe(0)
    expect(successRes.json().limit).toBe(20)

    const limitedRes = await app.inject({
      method: 'POST',
      url: `/api/words/${word.id}/examples`,
      headers: { ...authHeaders(token), 'content-type': 'application/json' },
      payload: {},
    })

    expect(limitedRes.statusCode).toBe(429)
    expect(limitedRes.json().remaining).toBe(0)
    expect(limitedRes.json().limit).toBe(20)
    expect(fetchMock).toHaveBeenCalledTimes(1)

    const updatedUser = await prisma.user.findUnique({ where: { id: user.id } })
    expect(updatedUser?.dailyAiUsageCount).toBe(20)
  })
})
