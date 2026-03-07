import type { DefinitionStatus, DictionaryEntry, DictionaryMeaning } from '@words/shared'

const PRIMARY_API_BASE = 'https://freedictionaryapi.com/api/v1/entries/en'
const FALLBACK_API_BASE = 'https://api.dictionaryapi.dev/api/v2/entries/en'

export interface LookupResult {
  status: DefinitionStatus
  meanings: DictionaryMeaning[]
  pronunciation?: string
  pronunciationAudio?: string
  examples?: string[]
  sourceUrl?: string
}

interface PrimarySense {
  definition: string
  examples?: string[]
  quotes?: Array<{ text: string, reference?: string }>
  synonyms?: string[]
  antonyms?: string[]
  subsenses?: PrimarySense[]
}

interface PrimaryEntry {
  partOfSpeech: string
  pronunciations?: Array<{ type: string, text: string, tags?: string[] }>
  senses: PrimarySense[]
}

interface PrimaryResponse {
  word: string
  entries: PrimaryEntry[]
  source?: { url?: string, license?: { name?: string, url?: string } }
}

function stripDiacritics(text: string): string {
  return text.normalize('NFD').replace(/[\u0300-\u036F]/g, '')
}

function hasDiacritics(text: string): boolean {
  return text !== stripDiacritics(text)
}

function mapPrimaryResponse(data: PrimaryResponse): LookupResult {
  const allExamples: string[] = []

  const meanings: DictionaryMeaning[] = data.entries.map((entry) => {
    const definitions = entry.senses.map((sense) => {
      if (sense.examples?.length) {
        allExamples.push(sense.examples[0])
      }
      if (sense.quotes?.length) {
        for (const quote of sense.quotes) {
          allExamples.push(quote.text)
        }
      }
      return {
        definition: sense.definition,
        example: sense.examples?.[0],
        synonyms: sense.synonyms || [],
        antonyms: sense.antonyms || [],
      }
    })

    return {
      partOfSpeech: entry.partOfSpeech,
      definitions,
      synonyms: [],
      antonyms: [],
    }
  })

  // Pick first IPA pronunciation
  let pronunciation: string | undefined
  for (const entry of data.entries) {
    if (entry.pronunciations) {
      const ipa = entry.pronunciations.find(p => p.type === 'ipa')
      if (ipa?.text) {
        pronunciation = ipa.text
        break
      }
    }
  }

  return {
    status: 'found',
    meanings,
    pronunciation,
    examples: allExamples.length > 0 ? allExamples : undefined,
    sourceUrl: data.source?.url,
  }
}

function mapFallbackResponse(data: DictionaryEntry[]): LookupResult {
  const entry = data[0]
  if (!entry) {
    return { status: 'not_found', meanings: [] }
  }

  const pronunciation = entry.phonetic
    || entry.phonetics?.find(p => p.text)?.text
    || undefined

  const pronunciationAudio = entry.phonetics?.find(p => p.audio && p.audio.length > 0)?.audio
    || undefined

  return {
    status: 'found',
    meanings: entry.meanings,
    pronunciation,
    pronunciationAudio,
  }
}

async function fetchWithBackoff(url: string, maxRetries: number = 3): Promise<Response> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const response = await fetch(url)

    if (response.status === 429 && attempt < maxRetries) {
      const delay = Math.min(1000 * 2 ** attempt, 8000)
      await new Promise(resolve => setTimeout(resolve, delay))
      continue
    }

    return response
  }

  throw new Error('Max retries exceeded')
}

async function fetchPrimary(word: string): Promise<Response> {
  return fetchWithBackoff(`${PRIMARY_API_BASE}/${encodeURIComponent(word)}`)
}

async function fetchFallback(word: string): Promise<Response> {
  return fetchWithBackoff(`${FALLBACK_API_BASE}/${encodeURIComponent(word)}`)
}

export async function lookupWord(word: string): Promise<LookupResult> {
  const trimmed = word.trim().toLowerCase()

  try {
    // Try primary API
    let primaryResponse = await fetchPrimary(trimmed)

    // Diacritics retry: if 400/404 and word has diacritics, retry stripped
    if ((primaryResponse.status === 400 || primaryResponse.status === 404) && hasDiacritics(trimmed)) {
      primaryResponse = await fetchPrimary(stripDiacritics(trimmed))
    }

    if (primaryResponse.ok) {
      const data: PrimaryResponse = await primaryResponse.json()

      // Primary returns 200 with empty entries for unknown words — treat as miss
      if (!data.entries || data.entries.length === 0) {
        // Fall through to fallback API below
      }
      else {
        const result = mapPrimaryResponse(data)

        // Try to get audio from fallback API
        try {
          let fallbackResponse = await fetchFallback(trimmed)
          if ((fallbackResponse.status === 400 || fallbackResponse.status === 404) && hasDiacritics(trimmed)) {
            fallbackResponse = await fetchFallback(stripDiacritics(trimmed))
          }
          if (fallbackResponse.ok) {
            const fallbackData: DictionaryEntry[] = await fallbackResponse.json()
            const audio = fallbackData[0]?.phonetics?.find(p => p.audio && p.audio.length > 0)?.audio
            if (audio) {
              result.pronunciationAudio = audio
            }
          }
        }
        catch {
          // Audio enrichment is best-effort
        }

        return result
      }
    }

    // Primary failed (404 or error) — fall back entirely to dictionaryapi.dev
    let fallbackResponse = await fetchFallback(trimmed)
    if ((fallbackResponse.status === 400 || fallbackResponse.status === 404) && hasDiacritics(trimmed)) {
      fallbackResponse = await fetchFallback(stripDiacritics(trimmed))
    }

    if (fallbackResponse.status === 404) {
      return { status: 'not_found', meanings: [] }
    }

    if (!fallbackResponse.ok) {
      return { status: 'pending', meanings: [] }
    }

    const fallbackData: DictionaryEntry[] = await fallbackResponse.json()
    return mapFallbackResponse(fallbackData)
  }
  catch {
    return { status: 'pending', meanings: [] }
  }
}
