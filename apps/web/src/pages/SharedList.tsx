import { useCallback, useEffect, useState } from 'react'
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

function getExcerpt(word: SharedWord): string {
  const firstDef = word.definitions?.[0]?.definitions?.[0]?.definition
  if (!firstDef)
    return ''
  return firstDef.length > 120 ? `${firstDef.slice(0, 117)}...` : firstDef
}

interface SharedListProps {
  token: string
}

export function SharedList({ token }: SharedListProps) {
  const [data, setData] = useState<SharedListData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

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
        <div className={styles.loading}>Loading…</div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className={styles.page}>
        <div className={styles.error}>
          <h1 className={styles.errorTitle}>Not Found</h1>
          <p className={styles.errorMessage}>{error || 'This shared list does not exist.'}</p>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.page} data-testid="shared-list-page">
      <div className={styles.container}>
        <div className={styles.header}>
          <h1 className={styles.listName}>{data.name}</h1>
          <p className={styles.subtitle}>a shared collection of words</p>
        </div>

        {data.words.length === 0 && (
          <p className={styles.empty}>This list has no words yet.</p>
        )}

        {data.words.map(word => (
          <div key={word.id} className={styles.wordCard}>
            <div className={styles.cardHeader}>
              <h2 className={styles.word}>{word.text}</h2>
              {word.pronunciation && (
                <span className={styles.pronunciation}>{word.pronunciation}</span>
              )}
            </div>
            {word.definitionStatus === 'found' && getExcerpt(word) && (
              <p className={styles.excerpt}>{getExcerpt(word)}</p>
            )}
            {word.definitionStatus === 'not_found' && (
              <p className={styles.noDefinition}>No definition found</p>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
