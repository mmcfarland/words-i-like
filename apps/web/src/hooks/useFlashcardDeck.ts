import type { Word } from '@words/shared'
import { useCallback, useMemo, useReducer } from 'react'

// Words without a found definition have nothing to study, so they're excluded
// from the deck. When a list filter is active, only its members are eligible.
export function eligibleWords(words: Word[], listWordIds: Set<string> | null): Word[] {
  return words.filter(
    w =>
      w.definitionStatus === 'found'
      && w.definitions.length > 0
      && (listWordIds === null || listWordIds.has(w.id)),
  )
}

export function shuffle<T>(items: T[]): T[] {
  const copy = [...items]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

export interface FlashcardDeck {
  deck: Word[]
  current: Word | null
  index: number
  total: number
  /** True once the deck has been advanced past the final card. */
  isComplete: boolean
  /** -1 when moving back, 1 when moving forward — drives slide direction. */
  direction: number
  hasNext: boolean
  hasPrev: boolean
  next: () => void
  prev: () => void
  restart: () => void
}

interface DeckState {
  index: number
  isComplete: boolean
  direction: number
}

type DeckAction = { type: 'next', total: number } | { type: 'prev' } | { type: 'restart' }

function reducer(state: DeckState, action: DeckAction): DeckState {
  switch (action.type) {
    case 'next':
      if (state.index >= action.total - 1)
        return { ...state, direction: 1, isComplete: true }
      return { index: state.index + 1, direction: 1, isComplete: false }
    case 'prev':
      if (state.index <= 0)
        return state
      return { index: state.index - 1, direction: -1, isComplete: false }
    case 'restart':
      return { index: 0, direction: 1, isComplete: false }
    default:
      return state
  }
}

// Words appear in a single shuffled pass, so every word is seen exactly once
// per session before the summary; reshuffleKey forces a fresh order on restart.
export function useFlashcardDeck(words: Word[], listWordIds: Set<string> | null, reshuffleKey: number): FlashcardDeck {
  const deck = useMemo(
    () => shuffle(eligibleWords(words, listWordIds)),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reshuffleKey intentionally triggers a new shuffle
    [words, listWordIds, reshuffleKey],
  )
  const [state, dispatch] = useReducer(reducer, { index: 0, isComplete: false, direction: 1 })

  const total = deck.length
  const safeIndex = Math.min(state.index, Math.max(total - 1, 0))
  const next = useCallback(() => dispatch({ type: 'next', total }), [total])
  const prev = useCallback(() => dispatch({ type: 'prev' }), [])
  const restart = useCallback(() => dispatch({ type: 'restart' }), [])

  return {
    deck,
    current: total > 0 ? deck[safeIndex] : null,
    index: safeIndex,
    total,
    isComplete: state.isComplete && total > 0,
    direction: state.direction,
    hasNext: safeIndex < total - 1,
    hasPrev: safeIndex > 0,
    next,
    prev,
    restart,
  }
}
