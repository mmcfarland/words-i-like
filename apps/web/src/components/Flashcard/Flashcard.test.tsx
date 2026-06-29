import type { DictionaryMeaning } from '@words/shared'
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { Flashcard } from './Flashcard'

const MEANINGS: DictionaryMeaning[] = [
  {
    partOfSpeech: 'adjective',
    definitions: [{ definition: 'Lasting for a short period of time.', synonyms: [], antonyms: [] }],
    synonyms: [],
    antonyms: [],
  },
]

describe('flashcard', () => {
  it('shows the word and definition (both faces rendered for 3D flip)', () => {
    render(<Flashcard text="ephemeral" meanings={MEANINGS} pronunciation="/əˈfɛ.mə.ɹəl/" flipped={false} onFlip={() => {}} />)
    expect(screen.getByText('ephemeral')).toBeInTheDocument()
    expect(screen.getByText('/əˈfɛ.mə.ɹəl/')).toBeInTheDocument()
    expect(screen.getByText('Lasting for a short period of time.')).toBeInTheDocument()
  })

  it('calls onFlip on click', () => {
    const onFlip = vi.fn()
    render(<Flashcard text="ephemeral" meanings={MEANINGS} flipped={false} onFlip={onFlip} />)
    fireEvent.click(screen.getByRole('button'))
    expect(onFlip).toHaveBeenCalledOnce()
  })

  it('reflects flipped state via aria-pressed', () => {
    render(<Flashcard text="ephemeral" meanings={MEANINGS} flipped onFlip={() => {}} />)
    expect(screen.getByRole('button')).toHaveAttribute('aria-pressed', 'true')
  })

  it('hides the tap hint once showHint is false', () => {
    const { rerender } = render(<Flashcard text="ephemeral" meanings={MEANINGS} flipped={false} onFlip={() => {}} />)
    expect(screen.getByText('tap to flip')).toBeInTheDocument()
    rerender(<Flashcard text="ephemeral" meanings={MEANINGS} flipped={false} showHint={false} onFlip={() => {}} />)
    expect(screen.queryByText('tap to flip')).not.toBeInTheDocument()
  })
})
