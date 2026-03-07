import type { DictionaryMeaning, Word } from '@words/shared'
import { animate, AnimatePresence, motion, useMotionValue, useReducedMotion, useTransform } from 'framer-motion'
import { useCallback, useEffect } from 'react'
import { WordCard } from '../WordCard'
import styles from './WordFeed.module.css'

interface WordFeedProps {
  words: Word[]
  wordListNames?: Record<string, string[]>
  showSwipeHint?: boolean
  expandedIds: Set<string>
  onToggle: (id: string) => void
  onDelete?: (wordId: string) => void
  onCorrectWord?: (wordId: string, correctedText: string) => void
  onAssignToList?: (wordId: string) => void
  onExamplesGenerated?: (wordId: string, examples: string[]) => void
  onShareWord?: (wordId: string) => void
  onAddWord?: (text: string, definitions: DictionaryMeaning[], pronunciation?: string, pronunciationAudio?: string) => void
  mode?: 'default' | 'shared'
}

function supportsFinePointer() {
  return typeof window !== 'undefined'
    && typeof window.matchMedia === 'function'
    && window.matchMedia('(hover: hover) and (pointer: fine)').matches
}

function SwipeableCard({ children, onDelete, showSwipeHint, swipeEnabled }: { children: React.ReactNode, onDelete?: () => void, showSwipeHint?: boolean, swipeEnabled: boolean }) {
  const x = useMotionValue(0)
  const deleteOpacity = useTransform(x, [-120, -60], [1, 0])
  const deleteScale = useTransform(x, [-120, -60], [1, 0.8])
  const prefersReducedMotion = useReducedMotion()

  const handleDragEnd = useCallback((_: unknown, info: { offset: { x: number }, velocity: { x: number } }) => {
    if (info.offset.x < -100 || info.velocity.x < -500) {
      onDelete?.()
    }
  }, [onDelete])

  useEffect(() => {
    if (!swipeEnabled || !showSwipeHint || prefersReducedMotion || import.meta.env.MODE === 'test')
      return
    const controls = animate(x, [0, -84, 0, -48, 0], {
      duration: 1.2,
      times: [0, 0.28, 0.52, 0.74, 1],
      ease: 'easeInOut',
    })
    return () => controls.stop()
  }, [swipeEnabled, showSwipeHint, prefersReducedMotion, x])

  return (
    <div className={styles.swipeContainer}>
      {onDelete && (
        <motion.div
          className={styles.deleteIndicator}
          style={{ opacity: deleteOpacity, scale: deleteScale }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
          </svg>
          Delete
        </motion.div>
      )}
      <motion.div
        style={{ x }}
        drag={swipeEnabled ? 'x' : false}
        dragListener={swipeEnabled}
        dragConstraints={{ left: -140, right: 0 }}
        dragElastic={0.1}
        onDragEnd={handleDragEnd}
        className={styles.swipeContent}
      >
        {children}
        {swipeEnabled && (
          <div className={styles.swipeHandle} data-swipe-handle="true" aria-hidden="true" />
        )}
      </motion.div>
    </div>
  )
}

export function WordFeed({ words, wordListNames, showSwipeHint = false, expandedIds: _expandedIds, onToggle: _onToggle, onDelete, onCorrectWord, onAssignToList, onExamplesGenerated, onShareWord, onAddWord, mode = 'default' }: WordFeedProps) {
  if (words.length === 0) {
    return null
  }

  const isFinePointer = supportsFinePointer()
  const canDelete = mode !== 'shared' && Boolean(onDelete)
  const swipeEnabled = !isFinePointer && canDelete
  const canManageExamples = mode !== 'shared'

  return (
    <div className={styles.feed}>
      <AnimatePresence initial={false}>
        {words.map((word, index) => (
          <motion.div
            key={word.id}
            layout
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, x: -300, transition: { duration: 0.2 } }}
            transition={{ duration: 0.35, ease: 'easeOut' }}
          >
            <SwipeableCard
              onDelete={canDelete ? () => onDelete?.(word.id) : undefined}
              showSwipeHint={showSwipeHint && index === 0}
              swipeEnabled={swipeEnabled}
            >
              <WordCard
                text={word.text}
                meanings={word.definitions}
                pronunciation={word.pronunciation}
                pronunciationAudio={word.pronunciationAudio}
                definitionStatus={word.definitionStatus}
                wordId={canManageExamples ? word.id : undefined}
                examples={word.examples}
                sourceUrl={word.sourceUrl}
                listNames={wordListNames?.[word.id] ?? []}
                onDelete={canDelete && isFinePointer ? () => onDelete?.(word.id) : undefined}
                onAssignToList={onAssignToList}
                onExamplesGenerated={canManageExamples ? onExamplesGenerated : undefined}
                onCorrectWord={onCorrectWord}
                onShareWord={mode !== 'shared' ? onShareWord : undefined}
                onAddWord={mode === 'shared' ? onAddWord : undefined}
              />
            </SwipeableCard>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}
