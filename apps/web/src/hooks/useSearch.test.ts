import { describe, expect, it } from 'vitest'

// Test the search filtering logic directly (extracted from useWordCollection)
function normalizeText(text: string): string {
  return text.normalize('NFD').replace(/[\u0300-\u036F]/g, '').toLowerCase()
}

interface SearchableWord {
  text: string
  definitions: Array<{
    partOfSpeech: string
    definitions: Array<{
      definition: string
      example?: string
      synonyms: string[]
      antonyms: string[]
    }>
    synonyms: string[]
    antonyms: string[]
  }>
}

function wordMatchesSearch(word: SearchableWord, query: string): boolean {
  const normalizedQuery = normalizeText(query)
  if (normalizeText(word.text).includes(normalizedQuery))
    return true
  for (const meaning of word.definitions) {
    for (const def of meaning.definitions) {
      if (normalizeText(def.definition).includes(normalizedQuery))
        return true
      if (def.example && normalizeText(def.example).includes(normalizedQuery))
        return true
    }
  }
  return false
}

const WORDS: SearchableWord[] = [
  {
    text: 'ephemeral',
    definitions: [{
      partOfSpeech: 'adjective',
      definitions: [{ definition: 'Lasting for a short period of time.', synonyms: [], antonyms: [] }],
      synonyms: [],
      antonyms: [],
    }],
  },
  {
    text: 'café',
    definitions: [{
      partOfSpeech: 'noun',
      definitions: [{ definition: 'A small restaurant serving light meals and drinks.', synonyms: [], antonyms: [] }],
      synonyms: [],
      antonyms: [],
    }],
  },
  {
    text: 'naïveté',
    definitions: [{
      partOfSpeech: 'noun',
      definitions: [{ definition: 'Lack of experience, wisdom, or judgement.', synonyms: [], antonyms: [] }],
      synonyms: [],
      antonyms: [],
    }],
  },
  {
    text: 'serendipity',
    definitions: [{
      partOfSpeech: 'noun',
      definitions: [{
        definition: 'The occurrence of events by chance in a happy way.',
        example: 'A serendipitous discovery in the laboratory.',
        synonyms: [],
        antonyms: [],
      }],
      synonyms: [],
      antonyms: [],
    }],
  },
]

describe('search filtering', () => {
  it('matches by word text', () => {
    const matches = WORDS.filter(w => wordMatchesSearch(w, 'ephemeral'))
    expect(matches).toHaveLength(1)
    expect(matches[0].text).toBe('ephemeral')
  })

  it('matches by partial word text', () => {
    const matches = WORDS.filter(w => wordMatchesSearch(w, 'ephem'))
    expect(matches).toHaveLength(1)
    expect(matches[0].text).toBe('ephemeral')
  })

  it('matches by definition content', () => {
    const matches = WORDS.filter(w => wordMatchesSearch(w, 'restaurant'))
    expect(matches).toHaveLength(1)
    expect(matches[0].text).toBe('café')
  })

  it('matches by example content', () => {
    const matches = WORDS.filter(w => wordMatchesSearch(w, 'laboratory'))
    expect(matches).toHaveLength(1)
    expect(matches[0].text).toBe('serendipity')
  })

  it('is case insensitive', () => {
    const matches = WORDS.filter(w => wordMatchesSearch(w, 'EPHEMERAL'))
    expect(matches).toHaveLength(1)
    expect(matches[0].text).toBe('ephemeral')
  })

  it('handles diacritics - search without accents finds accented words', () => {
    const matches = WORDS.filter(w => wordMatchesSearch(w, 'cafe'))
    expect(matches).toHaveLength(1)
    expect(matches[0].text).toBe('café')
  })

  it('handles diacritics - naïveté found with naive', () => {
    const matches = WORDS.filter(w => wordMatchesSearch(w, 'naivete'))
    expect(matches).toHaveLength(1)
    expect(matches[0].text).toBe('naïveté')
  })

  it('handles diacritics - search with accents works too', () => {
    const matches = WORDS.filter(w => wordMatchesSearch(w, 'café'))
    expect(matches).toHaveLength(1)
    expect(matches[0].text).toBe('café')
  })

  it('returns empty for no match', () => {
    const matches = WORDS.filter(w => wordMatchesSearch(w, 'xyznotfound'))
    expect(matches).toHaveLength(0)
  })

  it('matches multiple words', () => {
    const matches = WORDS.filter(w => wordMatchesSearch(w, 'noun'))
    // café, naïveté, serendipity are all nouns — but search is on definition, not partOfSpeech
    // "Lack of experience" and "restaurant" and "events" don't contain "noun"
    expect(matches).toHaveLength(0)
  })

  it('matches definition content across words', () => {
    // "time" appears in ephemeral's definition
    const matches = WORDS.filter(w => wordMatchesSearch(w, 'time'))
    expect(matches).toHaveLength(1)
    expect(matches[0].text).toBe('ephemeral')
  })
})
