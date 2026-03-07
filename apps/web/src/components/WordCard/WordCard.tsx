import type { DefinitionStatus, DictionaryMeaning } from '@words/shared'
import { AnimatePresence, motion } from 'framer-motion'
import { useCallback, useEffect, useState } from 'react'
import { aiService } from '../../services/ai'
import { analytics } from '../../services/analytics'
import { authService } from '../../services/auth'
import { getSuggestions } from '../../services/spellcheck'
import styles from './WordCard.module.css'

interface WordCardProps {
  text: string
  meanings: DictionaryMeaning[]
  pronunciation?: string
  pronunciationAudio?: string
  definitionStatus: DefinitionStatus
  wordId?: string
  examples?: string[]
  sourceUrl?: string
  listNames?: string[]
  onDelete?: () => void
  onAssignToList?: (wordId: string) => void
  onExamplesGenerated?: (wordId: string, examples: string[]) => void
  onCorrectWord?: (wordId: string, correctedText: string) => void
  onShareWord?: (wordId: string) => void
  onAddWord?: (text: string, definitions: DictionaryMeaning[], pronunciation?: string, pronunciationAudio?: string) => void
}

function getExcerpt(meanings: DictionaryMeaning[]): string {
  const firstDef = meanings[0]?.definitions[0]?.definition
  if (!firstDef)
    return ''
  return firstDef.length > 120 ? `${firstDef.slice(0, 117)}...` : firstDef
}

function hasActiveSelection() {
  const selection = window.getSelection()
  return Boolean(selection && selection.toString().trim().length > 0)
}

export function WordCard({ text, meanings, pronunciation, pronunciationAudio, definitionStatus, wordId, examples: cachedExamples, sourceUrl, listNames = [], onDelete, onAssignToList, onExamplesGenerated, onCorrectWord, onShareWord, onAddWord }: WordCardProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [examples, setExamples] = useState<string[] | undefined>(cachedExamples)
  const [loadingExamples, setLoadingExamples] = useState(false)
  const [examplesError, setExamplesError] = useState<string | null>(null)
  const [showAuthTooltip, setShowAuthTooltip] = useState(false)
  const [showAttribution, setShowAttribution] = useState(false)
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [addedFeedback, setAddedFeedback] = useState(false)
  const isAuthenticated = authService.isAuthenticated()
  const signInTooltipId = wordId ? `ai-signin-tooltip-${wordId}` : undefined
  const toggle = useCallback(() => setIsExpanded(prev => !prev), [])
  const handleCardClick = useCallback(() => {
    if (hasActiveSelection())
      return
    toggle()
  }, [toggle])
  const excerpt = getExcerpt(meanings)

  // Fetch spell suggestions when definition not found
  useEffect(() => {
    if (definitionStatus === 'not_found') {
      getSuggestions(text, 3).then(setSuggestions).catch(() => {})
    }
  }, [definitionStatus, text])

  useEffect(() => {
    if (!showAuthTooltip)
      return
    const timeoutId = window.setTimeout(() => setShowAuthTooltip(false), 2400)
    return () => window.clearTimeout(timeoutId)
  }, [showAuthTooltip])

  const handlePlayAudio = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    if (pronunciationAudio) {
      const audio = new Audio(pronunciationAudio)
      audio.play().catch(() => {})
    }
  }, [pronunciationAudio])

  const handleGenerateExamples = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!wordId || loadingExamples)
      return
    if (!isAuthenticated) {
      setShowAuthTooltip(true)
      return
    }
    setLoadingExamples(true)
    setExamplesError(null)
    try {
      const result = await aiService.generateExamples(wordId, text)
      setExamples(result.examples)
      analytics.examplesGenerated()
      onExamplesGenerated?.(wordId, result.examples)
    }
    catch (err) {
      setExamplesError(err instanceof Error ? err.message : 'Failed to generate examples')
    }
    finally {
      setLoadingExamples(false)
    }
  }, [wordId, loadingExamples, onExamplesGenerated, isAuthenticated, text])

  return (
    <div
      className={styles.card}
      onClick={handleCardClick}
      onKeyDown={e => e.key === 'Enter' && toggle()}
      role="button"
      tabIndex={0}
      aria-expanded={isExpanded}
    >
      {onDelete && (
        <button
          type="button"
          className={styles.deleteButton}
          aria-label="Delete word"
          onClick={(e) => {
            e.stopPropagation()
            onDelete()
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
          </svg>
        </button>
      )}
      <div className={styles.header}>
        <h2 className={styles.word}>{text.toLowerCase()}</h2>
        {pronunciation && (
          <span className={styles.pronunciation}>
            {pronunciation}
            {pronunciationAudio && (
              <button
                className={styles.audioButton}
                onClick={handlePlayAudio}
                type="button"
                aria-label={`Listen to pronunciation of ${text}`}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                  <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
                </svg>
              </button>
            )}
          </span>
        )}
        {onAddWord && (
          <button
            type="button"
            className={`${styles.addButton}${addedFeedback ? ` ${styles.addButtonDone}` : ''}`}
            aria-label={addedFeedback ? 'Added to collection' : 'Add to my collection'}
            onClick={(e) => {
              e.stopPropagation()
              if (addedFeedback) return
              onAddWord(text, meanings, pronunciation, pronunciationAudio)
              setAddedFeedback(true)
              window.setTimeout(() => setAddedFeedback(false), 1800)
            }}
          >
            {addedFeedback
              ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
              : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>}
          </button>
        )}
      </div>

      {listNames.length > 0 && (
        <div className={styles.listTags}>
          {listNames.map((name, index) => (
            <span key={`${name}-${index}`} className={styles.listTag}>
              {name}
            </span>
          ))}
        </div>
      )}

      {definitionStatus === 'not_found' && (
        <div className={styles.notFound}>
          <p className={styles.noDefinition}>No definition found</p>
          {suggestions.length > 0 && (
            <div className={styles.suggestions}>
              <span className={styles.suggestionsLabel}>Did you mean</span>
              <div className={styles.suggestionPills}>
                {suggestions.map(s => (
                  <button
                    key={s}
                    className={styles.suggestionPill}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      if (wordId && onCorrectWord)
                        onCorrectWord(wordId, s)
                    }}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
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
                <div className={styles.examplesHeader}>
                  <span className={styles.examplesLabel}>Examples</span>
                  {wordId && isAuthenticated && (
                    <button
                      type="button"
                      className={styles.examplesRefreshButton}
                      onClick={handleGenerateExamples}
                      disabled={loadingExamples}
                      aria-label="Regenerate examples"
                      title="Regenerate examples"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 12a9 9 0 1 1-2.64-6.36" />
                        <path d="M21 3v6h-6" />
                      </svg>
                    </button>
                  )}
                </div>
                <ul className={styles.examplesList}>
                  {examples.map((ex, i) => (
                    <li key={i} className={styles.exampleItem}>{ex}</li>
                  ))}
                </ul>
              </motion.div>
            )}
            {wordId && (!examples || examples.length === 0) && (
              <div className={styles.generateButtonWrap}>
                <button
                  className={styles.generateButton}
                  onClick={handleGenerateExamples}
                  onMouseEnter={() => !isAuthenticated && setShowAuthTooltip(true)}
                  onMouseLeave={() => setShowAuthTooltip(false)}
                  onFocus={() => !isAuthenticated && setShowAuthTooltip(true)}
                  onBlur={() => setShowAuthTooltip(false)}
                  disabled={loadingExamples}
                  type="button"
                  aria-label="Generate examples"
                  aria-describedby={!isAuthenticated && showAuthTooltip ? signInTooltipId : undefined}
                >
                  {loadingExamples ? 'Generating…' : 'Generate examples'}
                </button>
                {!isAuthenticated && showAuthTooltip && (
                  <span id={signInTooltipId} className={styles.authTooltip} role="status">
                    You must sign in to use AI examples.
                  </span>
                )}
              </div>
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
            {meanings.length > 0 && (
              <div className={styles.attributionWrap}>
                {wordId && isAuthenticated && onShareWord && (
                  <button
                    type="button"
                    className={styles.attributionToggle}
                    onClick={(e) => {
                      e.stopPropagation()
                      onShareWord(wordId)
                    }}
                    aria-label="Share word"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="18" cy="5" r="3" />
                      <circle cx="6" cy="12" r="3" />
                      <circle cx="18" cy="19" r="3" />
                      <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
                      <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
                    </svg>
                  </button>
                )}
                <button
                  type="button"
                  className={styles.attributionToggle}
                  onClick={(e) => {
                    e.stopPropagation()
                    setShowAttribution(prev => !prev)
                  }}
                  aria-label="Attribution info"
                >
                  ⓘ
                </button>
                {showAttribution && (
                  <div className={styles.attributionPopover} onClick={e => e.stopPropagation()}>
                    <p>
                      {'Definitions from '}
                      {sourceUrl
                        ? <a href={sourceUrl} target="_blank" rel="noopener noreferrer">Wiktionary</a>
                        : 'Wiktionary'}
                    </p>
                    <p>
                      {'Powered by '}
                      <a href="https://freedictionaryapi.com" target="_blank" rel="noopener noreferrer">FreeDictionaryAPI.com</a>
                    </p>
                  </div>
                )}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
