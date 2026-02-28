interface SpellSuggestion {
  word: string
  score: number
}

const DATAMUSE_BASE = 'https://api.datamuse.com/words'
const MIN_SCORE = 100

export async function getSuggestions(word: string, max: number = 5): Promise<string[]> {
  try {
    const encoded = encodeURIComponent(word.trim())
    const response = await fetch(`${DATAMUSE_BASE}?sp=${encoded}&max=${max}`)

    if (!response.ok)
      return []

    const data: SpellSuggestion[] = await response.json()

    return data
      .filter(s => s.score >= MIN_SCORE && s.word.toLowerCase() !== word.trim().toLowerCase())
      .map(s => s.word)
  }
  catch {
    return []
  }
}
