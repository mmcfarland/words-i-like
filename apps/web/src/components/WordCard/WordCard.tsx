import type { DefinitionStatus, DictionaryMeaning } from '@words/shared'
import { AnimatePresence, motion } from 'framer-motion'
import { useCallback, useState } from 'react'
import { aiService } from '../../services/ai'
import { authService } from '../../services/auth'
import styles from './WordCard.module.css'

interface WordCardProps {
  text: string
  meanings: DictionaryMeaning[]
  pronunciation?: string
  definitionStatus: DefinitionStatus
  wordId?: string
  examples?: string[]
  onAssignToList?: (wordId: string) => void
  onExamplesGenerated?: (wordId: string, examples: string[]) => void
}

function getExcerpt(meanings: DictionaryMeaning[]): string {
  const firstDef = meanings[0]?.definitions[0]?.definition
  if (!firstDef)
    return ''
  return firstDef.length > 120 ? `${firstDef.slice(0, 117)}...` : firstDef
}

export function WordCard({ text, meanings, pronunciation, definitionStatus, wordId, examples: cachedExamples, onAssignToList, onExamplesGenerated }: WordCardProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [examples, setExamples] = useState<string[] | undefined>(cachedExamples)
  const [loadingExamples, setLoadingExamples] = useState(false)
  const [examplesError, setExamplesError] = useState<string | null>(null)
  const toggle = useCallback(() => setIsExpanded(prev => !prev), [])
  const excerpt = getExcerpt(meanings)

  const handleGenerateExamples = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!wordId || loadingExamples)
      return
    setLoadingExamples(true)
    setExamplesError(null)
    try {
      const result = await aiService.generateExamples(wordId)
      setExamples(result.examples)
      onExamplesGenerated?.(wordId, result.examples)
    }
    catch (err) {
      setExamplesError(err instanceof Error ? err.message : 'Failed to generate examples')
    }
    finally {
      setLoadingExamples(false)
    }
  }, [wordId, loadingExamples, onExamplesGenerated])

  return (
    <div
      className={styles.card}
      onClick={toggle}
      onKeyDown={e => e.key === 'Enter' && toggle()}
      role="button"
      tabIndex={0}
      aria-expanded={isExpanded}
    >
      <div className={styles.header}>
        <h2 className={styles.word}>{text}</h2>
        {pronunciation && (
          <span className={styles.pronunciation}>{pronunciation}</span>
        )}
      </div>

      {definitionStatus === 'not_found' && (
        <p className={styles.noDefinition}>No definition found</p>
      )}

      {definitionStatus === 'pending' && (
        <p className={styles.pending}>Looking up definition…</p>
      )}

      {definitionStatus === 'found' && !isExpanded && excerpt && (
        <p className={styles.excerpt}>{excerpt}</p>
      )}

      {!isExpanded && definitionStatus === 'found' && meanings.length > 0 && (
        <div className={styles.expandHint}>
          <span className={styles.expandDot} />
          <span className={styles.expandDot} />
          <span className={styles.expandDot} />
        </div>
      )}

      <AnimatePresence>
        {isExpanded && definitionStatus === 'found' && (
          <motion.div
            className={styles.expanded}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
          >
            {meanings.map((meaning, i) => (
              <div key={`${meaning.partOfSpeech}-${i}`} className={styles.meaning}>
                <span className={styles.pos}>{meaning.partOfSpeech}</span>
                <ol className={styles.definitions}>
                  {meaning.definitions.map((def, j) => (
                    <li key={j} className={styles.definition}>
                      <p>{def.definition}</p>
                      {def.example && (
                        <p className={styles.example}>
                          "
                          {def.example}
                          "
                        </p>
                      )}
                    </li>
                  ))}
                </ol>
              </div>
            ))}
            {examples && examples.length > 0 && (
              <motion.div
                className={styles.examplesSection}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3 }}
              >
                <span className={styles.examplesLabel}>Examples</span>
                <ul className={styles.examplesList}>
                  {examples.map((ex, i) => (
                    <li key={i} className={styles.exampleItem}>{ex}</li>
                  ))}
                </ul>
              </motion.div>
            )}
            {wordId && authService.isAuthenticated() && !examples && (
              <button
                className={styles.generateButton}
                onClick={handleGenerateExamples}
                disabled={loadingExamples}
                type="button"
                aria-label="Generate examples"
              >
                {loadingExamples ? 'Generating…' : '✨ Generate examples'}
              </button>
            )}
            {examplesError && (
              <p className={styles.examplesError}>{examplesError}</p>
            )}
            {wordId && onAssignToList && (
              <button
                className={styles.listButton}
                onClick={(e) => {
                  e.stopPropagation()
                  onAssignToList(wordId)
                }}
                type="button"
                aria-label="Add to list"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 6h18M3 12h18M3 18h18" />
                </svg>
                Add to list
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
