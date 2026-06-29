import type { Word } from '@words/shared'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Flashcard } from '../components/Flashcard'
import { ListSelector } from '../components/ListSelector'
import { listStore, wordStore } from '../db'
import { useFlashcardDeck } from '../hooks/useFlashcardDeck'
import { useLists } from '../hooks/useLists'
import styles from './Flashcards.module.css'

interface FlashcardsProps {
  initialListId?: string | null
}

export function Flashcards({ initialListId = null }: FlashcardsProps) {
  const [words, setWords] = useState<Word[]>([])
  const [loading, setLoading] = useState(true)
  const [listFilterId, setListFilterId] = useState<string | null>(initialListId)
  const [listWordIds, setListWordIds] = useState<Set<string> | null>(null)
  const [showListSelector, setShowListSelector] = useState(false)
  const [reshuffleKey, setReshuffleKey] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const [hasFlipped, setHasFlipped] = useState(false)
  const { lists } = useLists()
  const prefersReducedMotion = useReducedMotion()

  useEffect(() => {
    wordStore.getAll().then((stored) => {
      setWords(stored)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (!listFilterId) {
      setListWordIds(null)
      return
    }
    listStore.getWordIdsForList(listFilterId).then(ids => setListWordIds(new Set(ids)))
  }, [listFilterId])

  const { current, index, total, isComplete, direction, hasPrev, next, prev, restart } = useFlashcardDeck(words, listWordIds, reshuffleKey)
  const activeListName = useMemo(() => lists.find(l => l.id === listFilterId)?.name ?? 'All Words', [lists, listFilterId])

  useEffect(() => {
    setFlipped(false)
  }, [current?.id])

  const handleNext = useCallback(() => {
    setFlipped(false)
    next()
  }, [next])
  const handlePrev = useCallback(() => {
    setFlipped(false)
    prev()
  }, [prev])
  const handleRestart = useCallback(() => {
    setFlipped(false)
    restart()
  }, [restart])
  const handleReshuffle = useCallback(() => {
    setFlipped(false)
    restart()
    setReshuffleKey(k => k + 1)
  }, [restart])

  const handleSelectList = useCallback((id: string | null) => {
    setListFilterId(id)
    setShowListSelector(false)
    restart()
    setReshuffleKey(k => k + 1)
  }, [restart])

  const slide = prefersReducedMotion
    ? {
        initial: { opacity: 0 },
        animate: { opacity: 1 },
        exit: { opacity: 0 },
        transition: { duration: 0.2 },
      }
    : {
        custom: direction,
        variants: {
          enter: (dir: number) => ({ x: dir > 0 ? '105%' : '-105%', opacity: 0.5 }),
          center: { x: '0%', opacity: 1 },
          exit: (dir: number) => ({ x: dir > 0 ? '-105%' : '105%', opacity: 0.5 }),
        },
        initial: 'enter',
        animate: 'center',
        exit: 'exit',
        transition: { x: { duration: 0.42, ease: [0.32, 0.72, 0, 1] }, opacity: { duration: 0.42 } },
      }

  return (
    <div className={styles.page} data-testid="flashcards-page">
      <div className={styles.container}>
        <header className={styles.header}>
          <a className={styles.homeLink} href="/">← Words I Like</a>
          <button className={styles.listSwitch} type="button" onClick={() => setShowListSelector(true)}>
            {activeListName}
          </button>
        </header>

        <AnimatePresence mode="wait">
          {loading
            ? (
                <motion.div key="loading" className={styles.center} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  Loading…
                </motion.div>
              )
            : total === 0
              ? (
                  <motion.div key="empty" className={styles.center} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                    No words with definitions to study yet.
                  </motion.div>
                )
              : isComplete
                ? (
                    <motion.div key="done" className={styles.center} initial={{ opacity: 0, scale: 0.92 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.35, ease: [0.34, 1.56, 0.64, 1] }}>
                      <h2 className={styles.doneTitle}>All done!</h2>
                      <p className={styles.doneText}>
                        You reviewed
                        {' '}
                        {total}
                        {' '}
                        {total === 1 ? 'word' : 'words'}
                        .
                      </p>
                      <button className={styles.primaryButton} type="button" onClick={handleReshuffle}>Reshuffle &amp; restart</button>
                    </motion.div>
                  )
                : (
                    <div className={styles.deck} key="deck">
                      <div className={styles.progress}>
                        {index + 1}
                        {' '}
                        /
                        {' '}
                        {total}
                      </div>
                      <div className={styles.progressTrack}>
                        <motion.div className={styles.progressBar} animate={{ width: `${((index + 1) / total) * 100}%` }} transition={{ duration: 0.3 }} />
                      </div>
                      <div className={styles.stage}>
                        <AnimatePresence initial={false} custom={direction}>
                          <motion.div
                            key={current!.id}
                            className={styles.cardWrap}
                            {...slide}
                          >
                            <Flashcard
                              text={current!.text}
                              meanings={current!.definitions}
                              pronunciation={current!.pronunciation}
                              flipped={flipped}
                              showHint={!hasFlipped}
                              swipeEnabled={!prefersReducedMotion}
                              onFlip={() => {
                                setHasFlipped(true)
                                setFlipped(f => !f)
                              }}
                              onSwipeLeft={handleNext}
                              onSwipeRight={handlePrev}
                            />
                          </motion.div>
                        </AnimatePresence>
                      </div>
                      <div className={styles.controls}>
                        <button className={styles.navButton} type="button" onClick={handlePrev} disabled={!hasPrev} aria-label="Previous card">←</button>
                        <button className={styles.restartButton} type="button" onClick={handleRestart}>Restart</button>
                        <button className={styles.navButton} type="button" onClick={handleNext} aria-label="Next card">→</button>
                      </div>
                    </div>
                  )}
        </AnimatePresence>
      </div>

      {showListSelector && (
        <ListSelector
          isOpen={showListSelector}
          onClose={() => setShowListSelector(false)}
          lists={lists}
          activeListId={listFilterId}
          onSelect={handleSelectList}
        />
      )}
    </div>
  )
}
