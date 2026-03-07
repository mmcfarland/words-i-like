import type { DefinitionStatus, DictionaryMeaning } from '@words/shared'
import { useCallback, useEffect, useState } from 'react'
import { WordCard } from '../components/WordCard'
import { wordStore } from '../db'
import { analytics } from '../services/analytics'
import styles from './SharedList.module.css'

interface SharedWordData {
  text: string
  definitions: Array<{
    partOfSpeech: string
    definitions: Array<{ definition: string, example?: string }>
  }>
  pronunciation: string | null
  definitionStatus: string
  sourceUrl?: string
}

function normalizeDefinitionStatus(status: string): DefinitionStatus {
  switch (status) {
    case 'found':
    case 'not_found':
    case 'pending':
      return status
    default:
      return 'found'
  }
}

function toMeanings(definitions: SharedWordData['definitions']): DictionaryMeaning[] {
  return definitions.map(meaning => ({
    partOfSpeech: meaning.partOfSpeech,
    definitions: meaning.definitions.map(d => ({
      definition: d.definition,
      example: d.example,
      synonyms: [],
      antonyms: [],
    })),
    synonyms: [],
    antonyms: [],
  }))
}

interface SharedWordProps {
  token: string
}

export function SharedWord({ token }: SharedWordProps) {
  const [data, setData] = useState<SharedWordData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const handleAddWord = useCallback(async (text: string, definitions: DictionaryMeaning[], pronunciation?: string, pronunciationAudio?: string) => {
    try {
      const now = Date.now()
      await wordStore.add({
        id: crypto.randomUUID(),
        text,
        definitions,
        pronunciation,
        pronunciationAudio,
        definitionStatus: 'found',
        createdAt: now,
        updatedAt: now,
      })
      analytics.wordAdopted()
    }
    catch {
      // Word may already exist locally
    }
  }, [])

  const fetchWord = useCallback(async () => {
    try {
      const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:3001'
      const response = await fetch(`${apiBase}/shared/word/${token}`)
      if (!response.ok) {
        setError('This shared word could not be found.')
        return
      }
      const result = await response.json()
      setData(result)
      analytics.sharedWordViewed()
    }
    catch {
      setError('Unable to load shared word.')
    }
    finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => {
    fetchWord()
  }, [fetchWord])

  if (loading) {
    return (
      <div className={styles.page}>
        <div className={styles.container}>
          <a className={styles.homeLink} href="/">Words I Like</a>
          <div className={styles.loading}>Loading…</div>
        </div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className={styles.page}>
        <div className={styles.container}>
          <a className={styles.homeLink} href="/">Words I Like</a>
          <div className={styles.error}>
            <h1 className={styles.errorTitle}>Not Found</h1>
            <p className={styles.errorMessage}>{error || 'This shared word does not exist.'}</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.page} data-testid="shared-word-page">
      <div className={styles.container}>
        <a className={styles.homeLink} href="/">Words I Like</a>
        <div className={styles.header}>
          <p className={styles.subtitle}>a word someone likes</p>
        </div>

        <WordCard
          text={data.text}
          meanings={toMeanings(data.definitions)}
          pronunciation={data.pronunciation ?? undefined}
          definitionStatus={normalizeDefinitionStatus(data.definitionStatus)}
          sourceUrl={data.sourceUrl}
          onAddWord={handleAddWord}
        />
      </div>
    </div>
  )
}
