import { act, renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { useWordCollection } from './useWordCollection'

vi.mock('../services/dictionary', () => ({
  lookupWord: vi.fn().mockResolvedValue({
    status: 'found',
    meanings: [{ partOfSpeech: 'noun', definitions: [{ definition: 'test def', synonyms: [], antonyms: [] }], synonyms: [], antonyms: [] }],
    pronunciation: '/test/',
  }),
}))

describe('useWordCollection', () => {
  it('adds a word and fetches definition', async () => {
    const { result } = renderHook(() => useWordCollection())

    await act(async () => {
      const res = await result.current.addWord('test')
      expect(res.isDuplicate).toBe(false)
    })

    expect(result.current.words).toHaveLength(1)
    expect(result.current.words[0].text).toBe('test')
    expect(result.current.words[0].definitionStatus).toBe('found')
  })

  it('detects duplicate words (case-insensitive)', async () => {
    const { result } = renderHook(() => useWordCollection())

    await act(async () => {
      await result.current.addWord('Hello')
    })

    await act(async () => {
      const res = await result.current.addWord('hello')
      expect(res.isDuplicate).toBe(true)
    })

    expect(result.current.words).toHaveLength(1)
  })

  it('adds words in reverse chronological order', async () => {
    const { result } = renderHook(() => useWordCollection())

    await act(async () => {
      await result.current.addWord('first')
    })

    await act(async () => {
      await result.current.addWord('second')
    })

    expect(result.current.words[0].text).toBe('second')
    expect(result.current.words[1].text).toBe('first')
  })

  it('toggles expanded state', async () => {
    const { result } = renderHook(() => useWordCollection())

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
