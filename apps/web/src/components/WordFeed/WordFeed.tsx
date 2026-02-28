import type { Word } from '@words/shared'
import { AnimatePresence, motion, useMotionValue, useTransform } from 'framer-motion'
import { useCallback } from 'react'
import { WordCard } from '../WordCard'
import styles from './WordFeed.module.css'

interface WordFeedProps {
  words: Word[]
  expandedIds: Set<string>
  onToggle: (id: string) => void
  onDelete?: (wordId: string) => void
  onCorrectWord?: (wordId: string, correctedText: string) => void
  onAssignToList?: (wordId: string) => void
  onExamplesGenerated?: (wordId: string, examples: string[]) => void
}

function SwipeableCard({ children, onDelete }: { children: React.ReactNode, onDelete?: () => void }) {
  const x = useMotionValue(0)
  const deleteOpacity = useTransform(x, [-120, -60], [1, 0])
  const deleteScale = useTransform(x, [-120, -60], [1, 0.8])

  const handleDragEnd = useCallback((_: unknown, info: { offset: { x: number }, velocity: { x: number } }) => {
    if (info.offset.x < -100 || info.velocity.x < -500) {
      onDelete?.()
    }
  }, [onDelete])

  return (
    <div className={styles.swipeContainer}>
      <motion.div
        className={styles.deleteIndicator}
        style={{ opacity: deleteOpacity, scale: deleteScale }}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
        </svg>
        Delete
      </motion.div>
      <motion.div
        style={{ x }}
        drag="x"
        dragConstraints={{ left: -140, right: 0 }}
        dragElastic={0.1}
        onDragEnd={handleDragEnd}
        className={styles.swipeContent}
      >
        {children}
      </motion.div>
    </div>
  )
}

export function WordFeed({ words, expandedIds: _expandedIds, onToggle: _onToggle, onDelete, onCorrectWord, onAssignToList, onExamplesGenerated }: WordFeedProps) {
  if (words.length === 0) {
    return null
  }

  return (
    <div className={styles.feed}>
      <AnimatePresence initial={false}>
        {words.map(word => (
          <motion.div
            key={word.id}
            layout
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, x: -300, transition: { duration: 0.2 } }}
            transition={{ duration: 0.35, ease: 'easeOut' }}
          >
            <SwipeableCard onDelete={onDelete ? () => onDelete(word.id) : undefined}>
              <WordCard
                text={word.text}
                meanings={word.definitions}
                pronunciation={word.pronunciation}
                pronunciationAudio={word.pronunciationAudio}
                definitionStatus={word.definitionStatus}
                wordId={word.id}
                examples={word.examples}
                onAssignToList={onAssignToList}
                onExamplesGenerated={onExamplesGenerated}
                onCorrectWord={onCorrectWord}
              />
            </SwipeableCard>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}
