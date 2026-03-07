import { beforeEach, describe, expect, it, vi } from 'vitest'
import { buildApp } from '../server'

const getByIdMock = vi.hoisted(() => vi.fn())
const generateExamplesMock = vi.hoisted(() => vi.fn())
const checkAiRateLimitMock = vi.hoisted(() => vi.fn())
const incrementAiUsageMock = vi.hoisted(() => vi.fn())

vi.mock('../services/word.js', () => ({
  wordService: {
    getById: getByIdMock,
  },
}))

vi.mock('../services/ai.js', () => ({
  generateExamples: generateExamplesMock,
}))

vi.mock('../middleware/rateLimit.js', () => ({
  checkAiRateLimit: checkAiRateLimitMock,
  incrementAiUsage: incrementAiUsageMock,
}))

describe('ai routes', () => {
  beforeEach(() => {
    getByIdMock.mockReset()
    generateExamplesMock.mockReset()
    checkAiRateLimitMock.mockReset()
    incrementAiUsageMock.mockReset()

    checkAiRateLimitMock.mockResolvedValue({ allowed: true, remaining: 5, limit: 5 })
    incrementAiUsageMock.mockResolvedValue(undefined)
    generateExamplesMock.mockResolvedValue({ examples: ['A sample sentence.'], source: 'stub' })
  })

  it('generates examples using request text when word id is not found', async () => {
    getByIdMock.mockResolvedValue(null)
    const app = buildApp()
    await app.ready()
    const token = app.jwt.sign({ userId: 'user-1' })

    const response = await app.inject({
      method: 'POST',
      url: '/api/words/local-word-id/examples',
      headers: { authorization: `Bearer ${token}` },
      payload: { text: 'ephemeral' },
    })

    expect(response.statusCode).toBe(200)
    expect(generateExamplesMock).toHaveBeenCalledWith('ephemeral')
    await app.close()
  })

  it('returns 404 when neither server word nor request text is available', async () => {
    getByIdMock.mockResolvedValue(null)
    const app = buildApp()
    await app.ready()
    const token = app.jwt.sign({ userId: 'user-1' })

    const response = await app.inject({
      method: 'POST',
      url: '/api/words/local-word-id/examples',
      headers: { authorization: `Bearer ${token}` },
      payload: {},
    })

    expect(response.statusCode).toBe(404)
    expect(generateExamplesMock).not.toHaveBeenCalled()
    await app.close()
  })

  it('returns 503 when AI generation fails', async () => {
    getByIdMock.mockResolvedValue({ text: 'ephemeral' })
    generateExamplesMock.mockRejectedValue(new Error('provider down'))
    const app = buildApp()
    await app.ready()
    const token = app.jwt.sign({ userId: 'user-1' })

    const response = await app.inject({
      method: 'POST',
      url: '/api/words/server-word-id/examples',
      headers: { authorization: `Bearer ${token}` },
      payload: {},
    })

    expect(response.statusCode).toBe(503)
    expect(incrementAiUsageMock).not.toHaveBeenCalled()
    await app.close()
  })
})
