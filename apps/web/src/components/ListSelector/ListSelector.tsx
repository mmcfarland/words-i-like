import type { ListRecord } from '../../db'
import { AnimatePresence, motion } from 'framer-motion'
import styles from './ListSelector.module.css'

interface ListSelectorProps {
  isOpen: boolean
  onClose: () => void
  lists: ListRecord[]
  activeListId: string | null
  onSelect: (listId: string | null) => void
}

export function ListSelector({
  isOpen,
  onClose,
  lists,
  activeListId,
  onSelect,
}: ListSelectorProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            className={styles.overlay}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            className={styles.panel}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
          >
            <h3 className={styles.title}>Filter by list</h3>
            <p className={styles.subtitle}>Show only words from a specific list</p>

            <button
              className={`${styles.option} ${activeListId === null ? styles.optionActive : ''}`}
              onClick={() => onSelect(null)}
              type="button"
            >
              <span className={styles.optionIcon}>✦</span>
              All Words
            </button>

            {lists.map(list => (
              <button
                key={list.id}
                className={`${styles.option} ${activeListId === list.id ? styles.optionActive : ''}`}
                onClick={() => onSelect(list.id)}
                type="button"
              >
                <span className={styles.optionIcon}>
                  {activeListId === list.id ? '●' : '○'}
                </span>
                {list.name}
              </button>
            ))}

            {lists.length === 0 && (
              <p className={styles.empty}>
                No lists yet. Tap a word and choose "Add to list" to create one.
              </p>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
