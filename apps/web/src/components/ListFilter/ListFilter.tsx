import type { ListRecord } from '../../db'
import { AnimatePresence, motion } from 'framer-motion'
import { useCallback, useState } from 'react'
import styles from './ListFilter.module.css'

interface ListFilterProps {
  list: ListRecord | null
  onClear: () => void
}

async function shareList(listId: string): Promise<string | null> {
  try {
    const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:3001'
    const response = await fetch(`${apiBase}/api/lists/${listId}/share`, { method: 'POST' })
    if (!response.ok)
      return null
    const data = await response.json()
    return `${window.location.origin}/shared/${data.shareToken}`
  }
  catch {
    return null
  }
}

export function ListFilter({ list, onClear }: ListFilterProps) {
  const [copied, setCopied] = useState(false)
  const [sharing, setSharing] = useState(false)

  const handleShare = useCallback(async () => {
    if (!list || sharing)
      return
    setSharing(true)
    const url = await shareList(list.id)
    setSharing(false)
    if (url) {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }, [list, sharing])

  return (
    <AnimatePresence>
      {list && (
        <motion.div
          className={styles.filter}
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          data-testid="list-filter"
        >
          <span className={styles.label}>
            Showing:
            {' '}
            {list.name}
          </span>
          <button
            className={styles.shareButton}
            onClick={handleShare}
            type="button"
            aria-label="Share list"
            disabled={sharing}
          >
            {copied
              ? (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 12l5 5L20 7" />
                  </svg>
                )
              : (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="18" cy="5" r="3" />
                    <circle cx="6" cy="12" r="3" />
                    <circle cx="18" cy="19" r="3" />
                    <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
                    <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
                  </svg>
                )}
            {copied ? 'Copied!' : 'Share'}
          </button>
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
