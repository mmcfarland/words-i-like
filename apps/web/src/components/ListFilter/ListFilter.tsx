import type { ListRecord } from '../../db'
import { AnimatePresence, motion } from 'framer-motion'
import styles from './ListFilter.module.css'

interface ListFilterProps {
  list: ListRecord | null
  onClear: () => void
}

export function ListFilter({ list, onClear }: ListFilterProps) {
  const showFilter = !!list

  return (
    <AnimatePresence>
      {showFilter && (
        <motion.div
          className={styles.filter}
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          data-testid="list-filter"
        >
          <button
            className={styles.clearButton}
            onClick={onClear}
            type="button"
            aria-label="Clear list filter"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
