import type { Word } from '@words/shared'
import { useCallback, useEffect, useState } from 'react'
import { wordStore } from '../db'
import { lookupWord } from '../services/dictionary'

let nextId = 0
function generateId(): string {
  return `word-${Date.now()}-${nextId++}`
}

export interface WordCollectionResult {
  words: Word[]
  addWord: (text: string) => Promise<{ isDuplicate: boolean }>
  toggleExpanded: (id: string) => void
  expandedIds: Set<string>
  isLoading: boolean
  refreshWords: () => Promise<void>
}

export function useWordCollection(): WordCollectionResult {
  const [words, setWords] = useState<Word[]>([])
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())
  const [isLoading, setIsLoading] = useState(true)

  // Load words from IndexedDB on mount
  useEffect(() => {
    wordStore.getAll().then((stored) => {
      setWords(stored)
      setIsLoading(false)
    }).catch(() => {
      setIsLoading(false)
    })
  }, [])

  const addWord = useCallback(async (text: string): Promise<{ isDuplicate: boolean }> => {
    const existing = await wordStore.findByText(text.trim())

    if (existing) {
      setExpandedIds(prev => new Set(prev).add(existing.id))
      return { isDuplicate: true }
    }

    const now = Date.now()
    const newWord: Word = {
      id: generateId(),
      text: text.trim(),
      definitions: [],
      definitionStatus: 'pending',
      createdAt: now,
      updatedAt: now,
    }

    // Save to IndexedDB immediately
    await wordStore.add(newWord)
    setWords(prev => [newWord, ...prev])

    // Fetch definition
    const result = await lookupWord(text)
    const updates = {
      definitions: result.meanings,
      pronunciation: result.pronunciation,
      definitionStatus: result.status,
    }

    // Update IndexedDB
    await wordStore.update(newWord.id, updates)
    setWords(prev =>
      prev.map(w =>
        w.id === newWord.id
          ? { ...w, ...updates, updatedAt: Date.now() }
          : w,
      ),
    )

    return { isDuplicate: false }
  }, [])

  const toggleExpanded = useCallback((id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      }
      else {
        next.add(id)
      }
      return next
    })
  }, [])

  const refreshWords = useCallback(async () => {
    const stored = await wordStore.getAll()
    setWords(stored)
  }, [])

  return { words, addWord, toggleExpanded, expandedIds, isLoading, refreshWords }
}
