import type { Word } from '@words/shared'
import { AnimatePresence, motion } from 'framer-motion'
import { WordCard } from '../WordCard'
import styles from './WordFeed.module.css'

interface WordFeedProps {
  words: Word[]
  expandedIds: Set<string>
  onToggle: (id: string) => void
  onAssignToList?: (wordId: string) => void
  onExamplesGenerated?: (wordId: string, examples: string[]) => void
}

export function WordFeed({ words, expandedIds: _expandedIds, onToggle: _onToggle, onAssignToList, onExamplesGenerated }: WordFeedProps) {
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
            transition={{ duration: 0.35, ease: 'easeOut' }}
          >
            <WordCard
              text={word.text}
              meanings={word.definitions}
              pronunciation={word.pronunciation}
              definitionStatus={word.definitionStatus}
              wordId={word.id}
              examples={word.examples}
              onAssignToList={onAssignToList}
              onExamplesGenerated={onExamplesGenerated}
            />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}
