import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { getSuggestions } from './spellcheck'

const mockFetch = vi.fn()

beforeEach(() => {
  vi.stubGlobal('fetch', mockFetch)
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('getSuggestions', () => {
  it('returns suggestions for misspelled word', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve([
        { word: 'ephemeral', score: 200076 },
        { word: 'epimeral', score: 144043 },
      ]),
    })

    const result = await getSuggestions('ephmeral')
    expect(result).toEqual(['ephemeral', 'epimeral'])
  })

  it('excludes the original word from suggestions', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve([
        { word: 'test', score: 50000 },
        { word: 'best', score: 40000 },
      ]),
    })

    const result = await getSuggestions('test')
    expect(result).toEqual(['best'])
  })

  it('filters out low-score suggestions', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve([
        { word: 'ephemeral', score: 200076 },
        { word: 'obscure', score: 10 },
      ]),
    })

    const result = await getSuggestions('ephmeral')
    expect(result).toEqual(['ephemeral'])
  })

  it('returns empty array on network error', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'))
    const result = await getSuggestions('test')
    expect(result).toEqual([])
  })

  it('returns empty array on non-ok response', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false })
    const result = await getSuggestions('test')
    expect(result).toEqual([])
  })
})
