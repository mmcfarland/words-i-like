import { describe, expect, it, vi } from 'vitest'
import { generateExamples } from './ai'

describe('ai service', () => {
  it('returns stub examples when AZURE_OPENAI_ENDPOINT is not set', async () => {
    // Ensure env vars are not set
    delete process.env.AZURE_OPENAI_ENDPOINT
    delete process.env.AZURE_OPENAI_API_KEY

    const result = await generateExamples('serendipity')
    expect(result.source).toBe('stub')
    expect(result.examples).toHaveLength(3)
    expect(result.examples.every(e => typeof e === 'string' && e.length > 0)).toBe(true)
  })

  it('returns stub examples when only endpoint is set but not key', async () => {
    process.env.AZURE_OPENAI_ENDPOINT = 'https://test.openai.azure.com'
    delete process.env.AZURE_OPENAI_API_KEY

    const result = await generateExamples('test')
    expect(result.source).toBe('stub')
    expect(result.examples.length).toBeGreaterThan(0)

    delete process.env.AZURE_OPENAI_ENDPOINT
  })

  it('falls back to stub on fetch error', async () => {
    process.env.AZURE_OPENAI_ENDPOINT = 'https://test.openai.azure.com'
    process.env.AZURE_OPENAI_API_KEY = 'test-key'

    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('Network error'))

    const result = await generateExamples('test')
    expect(result.source).toBe('stub')
    expect(result.examples.length).toBeGreaterThan(0)

    fetchSpy.mockRestore()
    delete process.env.AZURE_OPENAI_ENDPOINT
    delete process.env.AZURE_OPENAI_API_KEY
  })

  it('parses Azure OpenAI response correctly', async () => {
    process.env.AZURE_OPENAI_ENDPOINT = 'https://test.openai.azure.com'
    process.env.AZURE_OPENAI_API_KEY = 'test-key'

    const mockResponse = {
      ok: true,
      json: async () => ({
        choices: [{
          message: {
            content: 'The serendipity of finding that book changed her life.\nBy pure serendipity, they met again years later.\nHe attributed his success to serendipity rather than planning.',
          },
        }],
      }),
    }

    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(mockResponse as Response)

    const result = await generateExamples('serendipity')
    expect(result.source).toBe('azure')
    expect(result.examples).toHaveLength(3)
    expect(result.examples[0]).toContain('serendipity')

    fetchSpy.mockRestore()
    delete process.env.AZURE_OPENAI_ENDPOINT
    delete process.env.AZURE_OPENAI_API_KEY
  })
})
