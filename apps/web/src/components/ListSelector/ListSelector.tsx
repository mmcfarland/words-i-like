import type { ListRecord } from '../../db'
import { AnimatePresence, motion } from 'framer-motion'
import styles from './ListSelector.module.css'

interface ListSelectorProps {
  isOpen: boolean
  onClose: () => void
  lists: ListRecord[]
  activeListId: string | null
  onSelect: (listId: string | null) => void
  onDeleteList?: (listId: string, listName: string) => Promise<void>
}

export function ListSelector({
  isOpen,
  onClose,
  lists,
  activeListId,
  onSelect,
  onDeleteList,
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
          <div className={styles.container}>
            <motion.div
              className={styles.panel}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
            >
              <h3 className={styles.title}>Filter by list</h3>
              <p className={styles.subtitle}>Show only words from a specific list</p>

              <motion.div
                className={styles.optionRow}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 8 }}
                transition={{ duration: 0.18, ease: 'easeOut' }}
              >
                <button
                  className={`${styles.option} ${styles.optionInRow} ${activeListId === null ? styles.optionActive : ''}`}
                  onClick={() => onSelect(null)}
                  type="button"
                >
                  <span className={styles.optionIcon}>✦</span>
                  All Words
                </button>
                <span className={styles.deleteSpacer} aria-hidden />
              </motion.div>

              {lists.map((list, index) => (
                <motion.div
                  key={list.id}
                  className={styles.optionRow}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 8 }}
                  transition={{ duration: 0.2, ease: 'easeOut', delay: 0.03 * (index + 1) }}
                >
                  <button
                    className={`${styles.option} ${styles.optionInRow} ${activeListId === list.id ? styles.optionActive : ''}`}
                    onClick={() => onSelect(list.id)}
                    type="button"
                  >
                    <span className={styles.optionIcon}>
                      {activeListId === list.id ? '●' : '○'}
                    </span>
                    {list.name}
                  </button>
                  {onDeleteList && (
                    <button
                      className={styles.deleteButton}
                      type="button"
                      aria-label={`Delete ${list.name}`}
                      onClick={() => onDeleteList(list.id, list.name)}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M3 6h18" />
                        <path d="M8 6V4h8v2" />
                        <path d="M19 6l-1 14H6L5 6" />
                      </svg>
                    </button>
                  )}
                </motion.div>
              ))}

              {lists.length === 0 && (
                <p className={styles.empty}>
                  No lists yet. Tap a word and choose "Add to list" to create one.
                </p>
              )}
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  )
}
