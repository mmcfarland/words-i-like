import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { db } from '../db/schema'
import { useWordCollection } from './useWordCollection'
import 'fake-indexeddb/auto'

vi.mock('../services/dictionary', () => ({
  lookupWord: vi.fn().mockResolvedValue({
    status: 'found',
    meanings: [{ partOfSpeech: 'noun', definitions: [{ definition: 'test def', synonyms: [], antonyms: [] }], synonyms: [], antonyms: [] }],
    pronunciation: '/test/',
  }),
}))

beforeEach(async () => {
  await db.words.clear()
})

afterEach(async () => {
  await db.words.clear()
})

describe('useWordCollection', () => {
  it('starts with empty words and loading state', () => {
    const { result } = renderHook(() => useWordCollection())
    expect(result.current.isLoading).toBe(true)
  })

  it('loads words from IndexedDB on mount', async () => {
    // Pre-populate IndexedDB
    await db.words.add({
      id: 'existing-1',
      text: 'hello',
      definitions: [],
      definitionStatus: 'found',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    })

    const { result } = renderHook(() => useWordCollection())

    // Wait for load
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 50))
    })

    expect(result.current.words).toHaveLength(1)
    expect(result.current.words[0].text).toBe('hello')
    expect(result.current.isLoading).toBe(false)
  })

  it('adds a word and persists to IndexedDB', async () => {
    const { result } = renderHook(() => useWordCollection())

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 50))
    })

    await act(async () => {
      const res = await result.current.addWord('test')
      expect(res.isDuplicate).toBe(false)
    })

    expect(result.current.words).toHaveLength(1)
    expect(result.current.localChangeVersion).toBeGreaterThan(0)

    // Verify persisted
    const stored = await db.words.toArray()
    expect(stored).toHaveLength(1)
    expect(stored[0].text).toBe('test')
  })

  it('detects duplicate words', async () => {
    const { result } = renderHook(() => useWordCollection())

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 50))
    })

    await act(async () => {
      await result.current.addWord('Hello')
    })

    await act(async () => {
      const res = await result.current.addWord('hello')
      expect(res.isDuplicate).toBe(true)
    })

    const stored = await db.words.toArray()
    expect(stored).toHaveLength(1)
  })

  it('toggles expanded state', async () => {
    const { result } = renderHook(() => useWordCollection())

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 50))
    })

    await act(async () => {
      await result.current.addWord('test')
    })

    const id = result.current.words[0].id

    act(() => {
      result.current.toggleExpanded(id)
    })
    expect(result.current.expandedIds.has(id)).toBe(true)

    act(() => {
      result.current.toggleExpanded(id)
    })
    expect(result.current.expandedIds.has(id)).toBe(false)
  })
})
