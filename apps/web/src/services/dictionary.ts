import type { DefinitionStatus, DictionaryEntry, DictionaryMeaning } from '@words/shared'

const API_BASE = 'https://api.dictionaryapi.dev/api/v2/entries/en'

interface LookupResult {
  status: DefinitionStatus
  meanings: DictionaryMeaning[]
  pronunciation?: string
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

export async function lookupWord(word: string): Promise<LookupResult> {
  const encoded = encodeURIComponent(word.trim())

  try {
    const response = await fetchWithBackoff(`${API_BASE}/${encoded}`)

    if (response.status === 404) {
      return { status: 'not_found', meanings: [] }
    }

    if (!response.ok) {
      return { status: 'pending', meanings: [] }
    }

    const data: DictionaryEntry[] = await response.json()
    const entry = data[0]

    if (!entry) {
      return { status: 'not_found', meanings: [] }
    }

    const pronunciation = entry.phonetic
      || entry.phonetics?.find(p => p.text)?.text
      || undefined

    return {
      status: 'found',
      meanings: entry.meanings,
      pronunciation,
    }
  }
  catch {
    return { status: 'pending', meanings: [] }
  }
}
