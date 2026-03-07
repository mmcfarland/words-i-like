import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { lookupWord } from './dictionary'

const mockFetch = vi.fn()

beforeEach(() => {
  vi.stubGlobal('fetch', mockFetch)
})

afterEach(() => {
  vi.restoreAllMocks()
})

const PRIMARY_RESPONSE = {
  word: 'ephemeral',
  entries: [{
    partOfSpeech: 'adjective',
    pronunciations: [{ type: 'ipa', text: '/ɪˈfɛm.ər.əl/' }],
    senses: [{
      definition: 'Lasting for a short period of time.',
      examples: ['An ephemeral flicker of joy.'],
      synonyms: ['transient'],
      antonyms: ['permanent'],
    }],
  }],
  source: { url: 'https://en.wiktionary.org/wiki/ephemeral' },
}

const FALLBACK_RESPONSE = [{
  word: 'ephemeral',
  phonetic: '/əˈfɛ.mə.ɹəl/',
  phonetics: [{ text: '/əˈfɛ.mə.ɹəl/', audio: 'https://example.com/audio.mp3' }],
  meanings: [{
    partOfSpeech: 'adjective',
    definitions: [{ definition: 'Lasting for a short period of time.', synonyms: [], antonyms: [] }],
    synonyms: ['transient'],
    antonyms: ['permanent'],
  }],
}]

function primaryOk(data = PRIMARY_RESPONSE) {
  return { ok: true, status: 200, json: () => Promise.resolve(data) }
}

function fallbackOk(data = FALLBACK_RESPONSE) {
  return { ok: true, status: 200, json: () => Promise.resolve(data) }
}

function notFound() {
  return { ok: false, status: 404 }
}

describe('lookupWord', () => {
  it('returns found with meanings from primary API', async () => {
    // primary succeeds, fallback for audio succeeds
    mockFetch
      .mockResolvedValueOnce(primaryOk())
      .mockResolvedValueOnce(fallbackOk())

    const result = await lookupWord('ephemeral')

    expect(result.status).toBe('found')
    expect(result.meanings).toHaveLength(1)
    expect(result.meanings[0].partOfSpeech).toBe('adjective')
    expect(result.meanings[0].definitions[0].definition).toBe('Lasting for a short period of time.')
    expect(result.pronunciation).toBe('/ɪˈfɛm.ər.əl/')
    expect(result.sourceUrl).toBe('https://en.wiktionary.org/wiki/ephemeral')
    expect(result.examples).toEqual(['An ephemeral flicker of joy.'])
  })

  it('enriches audio from fallback API', async () => {
    mockFetch
      .mockResolvedValueOnce(primaryOk())
      .mockResolvedValueOnce(fallbackOk())

    const result = await lookupWord('ephemeral')

    expect(result.pronunciationAudio).toBe('https://example.com/audio.mp3')
  })

  it('falls back entirely to dictionaryapi.dev on primary 404', async () => {
    mockFetch
      .mockResolvedValueOnce(notFound())
      .mockResolvedValueOnce(fallbackOk())

    const result = await lookupWord('ephemeral')

    expect(result.status).toBe('found')
    expect(result.meanings).toHaveLength(1)
    expect(result.pronunciationAudio).toBe('https://example.com/audio.mp3')
    expect(result.pronunciation).toBe('/əˈfɛ.mə.ɹəl/')
    // Fallback has no sourceUrl
    expect(result.sourceUrl).toBeUndefined()
  })

  it('retries with stripped diacritics on 404', async () => {
    // Primary returns 404 for diacritical form, then succeeds stripped
    mockFetch
      .mockResolvedValueOnce(notFound())
      .mockResolvedValueOnce(primaryOk({
        ...PRIMARY_RESPONSE,
        word: 'flaneur',
      }))
      .mockResolvedValueOnce(fallbackOk())

    const result = await lookupWord('flâneur')

    expect(result.status).toBe('found')
    // First call with diacritics, second without
    expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining('fl%C3%A2neur'))
    expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining('flaneur'))
  })

  it('returns not_found when both APIs return 404', async () => {
    mockFetch
      .mockResolvedValueOnce(notFound())
      .mockResolvedValueOnce(notFound())

    const result = await lookupWord('xyznotaword')

    expect(result.status).toBe('not_found')
    expect(result.meanings).toEqual([])
  })

  it('treats primary 200 with empty entries as not_found and falls back', async () => {
    // Primary returns 200 but with no entries (misspelled word)
    mockFetch
      .mockResolvedValueOnce(primaryOk({ word: 'serendipty', entries: [], source: { url: 'https://en.wiktionary.org' } }))
      .mockResolvedValueOnce(notFound())

    const result = await lookupWord('serendipty')

    expect(result.status).toBe('not_found')
    expect(result.meanings).toEqual([])
  })

  it('falls back to dictionaryapi.dev when primary returns empty entries', async () => {
    mockFetch
      .mockResolvedValueOnce(primaryOk({ word: 'serendipty', entries: [], source: { url: 'https://en.wiktionary.org' } }))
      .mockResolvedValueOnce(fallbackOk())

    const result = await lookupWord('serendipty')

    expect(result.status).toBe('found')
    expect(result.pronunciationAudio).toBe('https://example.com/audio.mp3')
  })

  it('returns pending on network error', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'))

    const result = await lookupWord('test')
    expect(result.status).toBe('pending')
    expect(result.meanings).toEqual([])
  })

  it('retries on 429 with exponential backoff', async () => {
    vi.useFakeTimers()

    mockFetch
      .mockResolvedValueOnce({ ok: false, status: 429 })
      .mockResolvedValueOnce(primaryOk())
      .mockResolvedValueOnce(fallbackOk())

    const resultPromise = lookupWord('test')

    await vi.advanceTimersByTimeAsync(1100)

    const result = await resultPromise
    expect(result.status).toBe('found')

    vi.useRealTimers()
  })

  it('succeeds even if audio enrichment fails', async () => {
    mockFetch
      .mockResolvedValueOnce(primaryOk())
      .mockRejectedValueOnce(new Error('Network error'))

    const result = await lookupWord('ephemeral')

    expect(result.status).toBe('found')
    expect(result.pronunciationAudio).toBeUndefined()
    expect(result.meanings).toHaveLength(1)
  })

  it('collects quotes as examples', async () => {
    const withQuotes = {
      ...PRIMARY_RESPONSE,
      entries: [{
        partOfSpeech: 'adjective',
        pronunciations: [{ type: 'ipa', text: '/ɪˈfɛm.ər.əl/' }],
        senses: [{
          definition: 'Lasting for a short period of time.',
          examples: ['An ephemeral moment.'],
          quotes: [{ text: 'All fame is fleeting.', reference: 'Some Author' }],
          synonyms: [],
          antonyms: [],
        }],
      }],
    }
    mockFetch
      .mockResolvedValueOnce(primaryOk(withQuotes))
      .mockResolvedValueOnce(fallbackOk())

    const result = await lookupWord('ephemeral')

    expect(result.examples).toEqual(['An ephemeral moment.', 'All fame is fleeting.'])
  })
})
