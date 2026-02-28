import type { DefinitionStatus, DictionaryMeaning } from '@words/shared'
import { AnimatePresence, motion } from 'framer-motion'
import { useCallback, useState } from 'react'
import styles from './WordCard.module.css'

interface WordCardProps {
  text: string
  meanings: DictionaryMeaning[]
  pronunciation?: string
  definitionStatus: DefinitionStatus
}

function getExcerpt(meanings: DictionaryMeaning[]): string {
  const firstDef = meanings[0]?.definitions[0]?.definition
  if (!firstDef)
    return ''
  return firstDef.length > 120 ? `${firstDef.slice(0, 117)}...` : firstDef
}

export function WordCard({ text, meanings, pronunciation, definitionStatus }: WordCardProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const toggle = useCallback(() => setIsExpanded(prev => !prev), [])
  const excerpt = getExcerpt(meanings)

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
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
