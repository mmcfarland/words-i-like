import type { DefinitionStatus, DictionaryMeaning, Word } from '@words/shared'
import { useCallback, useEffect, useState } from 'react'
import { WordFeed } from '../components/WordFeed'
import { wordStore } from '../db'
import { analytics } from '../services/analytics'
import styles from './SharedList.module.css'

interface SharedWord {
  id: string
  text: string
  definitions: Array<{
    partOfSpeech: string
    definitions: Array<{ definition: string, example?: string }>
  }>
  pronunciation: string | null
  definitionStatus: string
}

interface SharedListData {
  name: string
  words: SharedWord[]
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

function toFeedWord(word: SharedWord): Word {
  return {
    id: word.id,
    text: word.text,
    definitions: word.definitions.map(meaning => ({
      partOfSpeech: meaning.partOfSpeech,
      definitions: meaning.definitions.map(definition => ({
        definition: definition.definition,
        example: definition.example,
        synonyms: [],
        antonyms: [],
      })),
      synonyms: [],
      antonyms: [],
    })),
    pronunciation: word.pronunciation ?? undefined,
    definitionStatus: normalizeDefinitionStatus(word.definitionStatus),
    createdAt: 0,
    updatedAt: 0,
  }
}

interface SharedListProps {
  token: string
}

export function SharedList({ token }: SharedListProps) {
  const [data, setData] = useState<SharedListData | null>(null)
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

  const fetchList = useCallback(async () => {
    try {
      const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:3001'
      const response = await fetch(`${apiBase}/shared/${token}`)
      if (!response.ok) {
        setError('This shared list could not be found.')
        return
      }
      const result = await response.json()
      setData(result)
      analytics.sharedListViewed()
    }
    catch {
      setError('Unable to load shared list.')
    }
    finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => {
    fetchList()
  }, [fetchList])

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
            <p className={styles.errorMessage}>{error || 'This shared list does not exist.'}</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.page} data-testid="shared-list-page">
      <div className={styles.container}>
        <a className={styles.homeLink} href="/">Words I Like</a>
        <div className={styles.header}>
          <h1 className={styles.listName}>{data.name}</h1>
          <p className={styles.subtitle}>a shared collection of words</p>
        </div>

        {data.words.length === 0 && (
          <p className={styles.empty}>This list has no words yet.</p>
        )}
        {data.words.length > 0 && (
          <WordFeed
            words={data.words.map(toFeedWord)}
            expandedIds={new Set()}
            onToggle={() => {}}
            mode="shared"
            onAddWord={handleAddWord}
          />
        )}
      </div>
    </div>
  )
}
