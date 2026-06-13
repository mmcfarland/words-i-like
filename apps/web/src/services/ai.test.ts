import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { aiService } from './ai'

vi.mock('./auth', () => ({
  authService: {
    getAuthHeaders: vi.fn(() => ({ Authorization: 'Bearer token' })),
  },
}))

describe('aiService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('sends auth headers and JSON body when word text is provided', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        examples: ['Example sentence.'],
        source: 'stub',
        remaining: 4,
        limit: 5,
      }),
    })
    vi.stubGlobal('fetch', fetchMock as unknown as typeof fetch)

    await aiService.generateExamples('word-1', 'ephemeral')

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/api/words/word-1/examples'),
      expect.objectContaining({
        method: 'POST',
        headers: {
          'Authorization': 'Bearer token',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text: 'ephemeral' }),
      }),
    )
  })
})
