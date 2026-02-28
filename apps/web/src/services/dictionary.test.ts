import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { lookupWord } from './dictionary'

const mockFetch = vi.fn()

beforeEach(() => {
  vi.stubGlobal('fetch', mockFetch)
})

afterEach(() => {
  vi.restoreAllMocks()
})

const MOCK_RESPONSE = [{
  word: 'ephemeral',
  phonetic: '/əˈfɛ.mə.ɹəl/',
  phonetics: [{ text: '/əˈfɛ.mə.ɹəl/', audio: '' }],
  meanings: [{
    partOfSpeech: 'adjective',
    definitions: [{ definition: 'Lasting for a short period of time.', synonyms: [], antonyms: [] }],
    synonyms: ['transient'],
    antonyms: ['permanent'],
  }],
}]

describe('lookupWord', () => {
  it('returns found status with meanings on success', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: () => Promise.resolve(MOCK_RESPONSE),
    })

    const result = await lookupWord('ephemeral')

    expect(result.status).toBe('found')
    expect(result.meanings).toHaveLength(1)
    expect(result.meanings[0].partOfSpeech).toBe('adjective')
    expect(result.pronunciation).toBe('/əˈfɛ.mə.ɹəl/')
  })

  it('unwraps JSON array response (uses first entry)', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: () => Promise.resolve([...MOCK_RESPONSE, { ...MOCK_RESPONSE[0], word: 'second' }]),
    })

    const result = await lookupWord('ephemeral')
    expect(result.status).toBe('found')
    expect(result.meanings).toHaveLength(1)
  })

  it('returns not_found on 404', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 404,
    })

    const result = await lookupWord('xyznotaword')
    expect(result.status).toBe('not_found')
    expect(result.meanings).toEqual([])
  })

  it('retries on 429 with exponential backoff', async () => {
    vi.useFakeTimers()

    mockFetch
      .mockResolvedValueOnce({ ok: false, status: 429 })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(MOCK_RESPONSE),
      })

    const resultPromise = lookupWord('test')

    // Fast-forward past the backoff delay
    await vi.advanceTimersByTimeAsync(1100)

    const result = await resultPromise
    expect(result.status).toBe('found')
    expect(mockFetch).toHaveBeenCalledTimes(2)

    vi.useRealTimers()
  })

  it('returns pending on network error', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'))

    const result = await lookupWord('test')
    expect(result.status).toBe('pending')
    expect(result.meanings).toEqual([])
  })

  it('encodes multi-word phrases in URL', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: () => Promise.resolve(MOCK_RESPONSE),
    })

    await lookupWord('ad hoc')
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('ad%20hoc'),
    )
  })

  it('falls back to phonetics array for pronunciation', async () => {
    const responseWithoutPhonetic = [{
      ...MOCK_RESPONSE[0],
      phonetic: undefined,
      phonetics: [
        { text: '', audio: 'audio.mp3' },
        { text: '/test/', audio: '' },
      ],
    }]

    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: () => Promise.resolve(responseWithoutPhonetic),
    })

    const result = await lookupWord('test')
    expect(result.pronunciation).toBe('/test/')
  })
})
