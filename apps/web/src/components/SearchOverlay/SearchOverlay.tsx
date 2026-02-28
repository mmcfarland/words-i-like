import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useRef } from 'react'
import styles from './SearchOverlay.module.css'

interface SearchOverlayProps {
  isActive: boolean
  query: string
  onQueryChange: (query: string) => void
  onDismiss: () => void
}

export function SearchOverlay({ isActive, query, onQueryChange, onDismiss }: SearchOverlayProps) {
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isActive) {
      // Small delay so animation starts before focus
      requestAnimationFrame(() => inputRef.current?.focus())
    }
  }, [isActive])

  return (
    <AnimatePresence>
      {isActive && (
        <motion.div
          className={styles.container}
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          data-testid="search-overlay"
        >
          <div className={styles.inputWrapper}>
            <input
              ref={inputRef}
              className={styles.input}
              type="text"
              value={query}
              onChange={e => onQueryChange(e.target.value)}
              placeholder="Search words..."
              aria-label="Search words"
              autoComplete="off"
              spellCheck={false}
            />
            <button
              className={styles.dismissButton}
              onClick={onDismiss}
              type="button"
              aria-label="Close search"
            >
              Cancel
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
