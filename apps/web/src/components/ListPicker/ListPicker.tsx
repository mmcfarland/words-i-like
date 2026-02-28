import type { FormEvent } from 'react'
import type { ListRecord } from '../../db'
import { AnimatePresence, motion } from 'framer-motion'
import { useCallback, useEffect, useState } from 'react'
import styles from './ListPicker.module.css'

interface ListPickerProps {
  isOpen: boolean
  onClose: () => void
  lists: ListRecord[]
  wordId: string
  onCreateList: (name: string) => Promise<ListRecord>
  onAssign: (wordId: string, listId: string) => Promise<void>
  onRemove: (wordId: string, listId: string) => Promise<void>
  getListsForWord: (wordId: string) => Promise<string[]>
}

export function ListPicker({
  isOpen,
  onClose,
  lists,
  wordId,
  onCreateList,
  onAssign,
  onRemove,
  getListsForWord,
}: ListPickerProps) {
  const [newListName, setNewListName] = useState('')
  const [activeListIds, setActiveListIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (isOpen && wordId) {
      getListsForWord(wordId).then(ids => setActiveListIds(new Set(ids)))
    }
  }, [isOpen, wordId, getListsForWord])

  const handleToggleList = useCallback(async (listId: string) => {
    if (activeListIds.has(listId)) {
      await onRemove(wordId, listId)
      setActiveListIds((prev) => {
        const next = new Set(prev)
        next.delete(listId)
        return next
      })
    }
    else {
      await onAssign(wordId, listId)
      setActiveListIds(prev => new Set(prev).add(listId))
    }
  }, [wordId, activeListIds, onAssign, onRemove])

  const handleCreateList = useCallback(async (e: FormEvent) => {
    e.preventDefault()
    if (!newListName.trim())
      return
    const list = await onCreateList(newListName.trim())
    await onAssign(wordId, list.id)
    setActiveListIds(prev => new Set(prev).add(list.id))
    setNewListName('')
  }, [newListName, wordId, onCreateList, onAssign])

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
            data-testid="list-picker-overlay"
          />
          <motion.div
            className={styles.sheet}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            data-testid="list-picker-sheet"
          >
            <div className={styles.handle} />
            <h3 className={styles.title}>Add to list</h3>

            {lists.map(list => (
              <button
                key={list.id}
                className={activeListIds.has(list.id) ? styles.listItemActive : styles.listItem}
                onClick={() => handleToggleList(list.id)}
                type="button"
              >
                <span className={activeListIds.has(list.id) ? styles.checkboxChecked : styles.checkbox}>
                  {activeListIds.has(list.id) && (
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M5 12l5 5L20 7" />
                    </svg>
                  )}
                </span>
                {list.name}
              </button>
            ))}

            <form className={styles.createForm} onSubmit={handleCreateList}>
              <input
                className={styles.createInput}
                type="text"
                value={newListName}
                onChange={e => setNewListName(e.target.value)}
                placeholder="New list name..."
                aria-label="New list name"
              />
              <button
                className={styles.createButton}
                type="submit"
                disabled={!newListName.trim()}
              >
                Create
              </button>
            </form>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
