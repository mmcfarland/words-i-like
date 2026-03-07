import { afterEach, describe, expect, it, vi } from 'vitest'
import { generateExamples } from './ai'

const ORIGINAL_ENV = { ...process.env }

describe('ai service', () => {
  afterEach(() => {
    process.env = { ...ORIGINAL_ENV }
    vi.restoreAllMocks()
  })

  it('throws when Azure OpenAI env is missing', async () => {
    delete process.env.AZURE_OPENAI_ENDPOINT
    delete process.env.AZURE_OPENAI_API_KEY

    await expect(generateExamples('serendipity')).rejects.toThrow('AI examples are not configured')
  })

  it('throws when provider request fails', async () => {
    process.env.AZURE_OPENAI_ENDPOINT = 'https://test.openai.azure.com'
    process.env.AZURE_OPENAI_API_KEY = 'test-key'
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({ ok: false, status: 500 } as Response)

    await expect(generateExamples('test')).rejects.toThrow('AI provider request failed (500)')
  })

  it('throws when provider response contains no examples', async () => {
    process.env.AZURE_OPENAI_ENDPOINT = 'https://test.openai.azure.com'
    process.env.AZURE_OPENAI_API_KEY = 'test-key'

    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: '' } }],
      }),
    } as Response)

    await expect(generateExamples('test')).rejects.toThrow('AI provider returned no examples')
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

    vi.spyOn(globalThis, 'fetch').mockResolvedValue(mockResponse as Response)

    const result = await generateExamples('serendipity')
    expect(result.source).toBe('azure')
    expect(result.examples).toHaveLength(3)
    expect(result.examples[0]).toContain('serendipity')
  })
})
