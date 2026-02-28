import type { Word } from '@words/shared'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { wordStore } from '../db'
import { listStore } from '../db/listStore'
import { lookupWord } from '../services/dictionary'

let nextId = 0
function generateId(): string {
  return `word-${Date.now()}-${nextId++}`
}

function normalizeText(text: string): string {
  return text.normalize('NFD').replace(/[\u0300-\u036F]/g, '').toLowerCase()
}

function wordMatchesSearch(word: Word, query: string): boolean {
  const normalizedQuery = normalizeText(query)
  if (normalizeText(word.text).includes(normalizedQuery))
    return true
  for (const meaning of word.definitions) {
    for (const def of meaning.definitions) {
      if (normalizeText(def.definition).includes(normalizedQuery))
        return true
      if (def.example && normalizeText(def.example).includes(normalizedQuery))
        return true
    }
  }
  return false
}

export interface WordCollectionResult {
  words: Word[]
  filteredWords: Word[]
  addWord: (text: string) => Promise<{ isDuplicate: boolean }>
  deleteWord: (id: string) => Promise<void>
  toggleExpanded: (id: string) => void
  expandedIds: Set<string>
  isLoading: boolean
  refreshWords: () => Promise<void>
  filterByListId: string | null
  setFilterByListId: (id: string | null) => void
  searchQuery: string
  setSearchQuery: (query: string) => void
}

export function useWordCollection(): WordCollectionResult {
  const [words, setWords] = useState<Word[]>([])
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())
  const [isLoading, setIsLoading] = useState(true)
  const [filterByListId, setFilterByListId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [listWordIds, setListWordIds] = useState<Set<string> | null>(null)

  // Load words from IndexedDB on mount
  useEffect(() => {
    wordStore.getAll().then((stored) => {
      setWords(stored)
      setIsLoading(false)
    }).catch(() => {
      setIsLoading(false)
    })
  }, [])

  // Load word IDs for selected list
  useEffect(() => {
    if (!filterByListId) {
      setListWordIds(null)
      return
    }
    listStore.getWordIdsForList(filterByListId).then((ids) => {
      setListWordIds(new Set(ids))
    })
  }, [filterByListId])

  const filteredWords = useMemo(() => {
    let result = words
    if (listWordIds !== null) {
      result = result.filter(w => listWordIds.has(w.id))
    }
    if (searchQuery.trim()) {
      result = result.filter(w => wordMatchesSearch(w, searchQuery.trim()))
    }
    return result
  }, [words, listWordIds, searchQuery])

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

  const deleteWord = useCallback(async (id: string) => {
    await wordStore.delete(id)
    setWords(prev => prev.filter(w => w.id !== id))
    setExpandedIds((prev) => {
      const next = new Set(prev)
      next.delete(id)
      return next
    })
  }, [])

  const refreshWords = useCallback(async () => {
    const stored = await wordStore.getAll()
    setWords(stored)
    // Also refresh list filter if active
    if (filterByListId) {
      const ids = await listStore.getWordIdsForList(filterByListId)
      setListWordIds(new Set(ids))
    }
  }, [filterByListId])

  return {
    words,
    filteredWords,
    addWord,
    deleteWord,
    toggleExpanded,
    expandedIds,
    isLoading,
    refreshWords,
    filterByListId,
    setFilterByListId,
    searchQuery,
    setSearchQuery,
  }
}
