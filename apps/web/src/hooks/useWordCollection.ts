import type { Word } from '@words/shared'
import { useCallback, useState } from 'react'
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
}

export function useWordCollection(): WordCollectionResult {
  const [words, setWords] = useState<Word[]>([])
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())

  const addWord = useCallback(async (text: string): Promise<{ isDuplicate: boolean }> => {
    const normalized = text.toLowerCase().trim()
    const existing = words.find(w => w.text.toLowerCase() === normalized)

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

    setWords(prev => [newWord, ...prev])

    const result = await lookupWord(text)

    setWords(prev =>
      prev.map(w =>
        w.id === newWord.id
          ? {
              ...w,
              definitions: result.meanings,
              pronunciation: result.pronunciation,
              definitionStatus: result.status,
              updatedAt: Date.now(),
            }
          : w,
      ),
    )

    return { isDuplicate: false }
  }, [words])

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

  return { words, addWord, toggleExpanded, expandedIds }
}
