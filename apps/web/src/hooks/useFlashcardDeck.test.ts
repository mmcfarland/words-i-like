import type { Word } from '@words/shared'
import { act, renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { eligibleWords, shuffle, useFlashcardDeck } from './useFlashcardDeck'

function makeWord(id: string, status: Word['definitionStatus'] = 'found', defs = 1): Word {
  return {
    id,
    text: id,
    definitions: Array.from({ length: defs }, () => ({
      partOfSpeech: 'noun',
      definitions: [{ definition: `def of ${id}`, synonyms: [], antonyms: [] }],
      synonyms: [],
      antonyms: [],
    })),
    definitionStatus: status,
    createdAt: 0,
    updatedAt: 0,
  }
}

const WORDS: Word[] = [
  makeWord('a'),
  makeWord('b'),
  makeWord('pending', 'pending', 0),
  makeWord('notfound', 'not_found', 0),
  makeWord('c'),
]

describe('eligibleWords', () => {
  it('excludes pending and not_found words', () => {
    const ids = eligibleWords(WORDS, null).map(w => w.id)
    expect(ids.sort()).toEqual(['a', 'b', 'c'])
  })

  it('filters by list membership when provided', () => {
    const ids = eligibleWords(WORDS, new Set(['a', 'c', 'pending'])).map(w => w.id)
    expect(ids.sort()).toEqual(['a', 'c'])
  })
})

describe('shuffle', () => {
  it('keeps the same members', () => {
    const result = shuffle(['a', 'b', 'c', 'd'])
    expect(result.sort()).toEqual(['a', 'b', 'c', 'd'])
  })
})

describe('useFlashcardDeck', () => {
  it('presents every eligible word once with no repeats', () => {
    const { result } = renderHook(() => useFlashcardDeck(WORDS, null, 0))
    expect(result.current.total).toBe(3)
    const seen = new Set<string>()
    seen.add(result.current.current!.id)
    act(() => result.current.next())
    seen.add(result.current.current!.id)
    act(() => result.current.next())
    seen.add(result.current.current!.id)
    expect(seen.size).toBe(3)
    expect(result.current.hasNext).toBe(false)
  })

  it('completes after the last card and restarts', () => {
    const { result } = renderHook(() => useFlashcardDeck(WORDS, null, 0))
    act(() => result.current.next())
    act(() => result.current.next())
    expect(result.current.isComplete).toBe(false)
    act(() => result.current.next())
    expect(result.current.isComplete).toBe(true)
    act(() => result.current.restart())
    expect(result.current.isComplete).toBe(false)
    expect(result.current.index).toBe(0)
  })

  it('does not go before the first card', () => {
    const { result } = renderHook(() => useFlashcardDeck(WORDS, null, 0))
    expect(result.current.hasPrev).toBe(false)
    act(() => result.current.prev())
    expect(result.current.index).toBe(0)
  })
})
