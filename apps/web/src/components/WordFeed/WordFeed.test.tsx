import type { Word } from '@words/shared'
import { fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { WordFeed } from './WordFeed'

const WORDS: Word[] = [
  {
    id: 'word-1',
    text: 'ephemeral',
    definitions: [
      {
        partOfSpeech: 'adjective',
        definitions: [{ definition: 'Lasting for a short period of time.', synonyms: [], antonyms: [] }],
        synonyms: [],
        antonyms: [],
      },
    ],
    definitionStatus: 'found',
    createdAt: 0,
    updatedAt: 0,
  },
]

const originalMatchMedia = window.matchMedia

function setMatchMedia(matches: boolean) {
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    writable: true,
    value: vi.fn().mockImplementation(() => ({
      matches,
      media: '(hover: hover) and (pointer: fine)',
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  })
}

describe('wordFeed delete affordances', () => {
  afterEach(() => {
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      writable: true,
      value: originalMatchMedia,
    })
  })

  it('shows swipe handle and hides trash button on coarse pointers', () => {
    setMatchMedia(false)

    const { container } = render(
      <WordFeed
        words={WORDS}
        expandedIds={new Set()}
        onToggle={() => {}}
        onDelete={() => {}}
      />,
    )

    expect(container.querySelector('[data-swipe-handle="true"]')).toBeInTheDocument()
    expect(screen.queryByLabelText('Delete word')).not.toBeInTheDocument()
  })

  it('shows trash button and hides swipe handle on fine pointers', () => {
    setMatchMedia(true)

    const { container } = render(
      <WordFeed
        words={WORDS}
        expandedIds={new Set()}
        onToggle={() => {}}
        onDelete={() => {}}
      />,
    )

    expect(screen.getByLabelText('Delete word')).toBeInTheDocument()
    expect(container.querySelector('[data-swipe-handle="true"]')).not.toBeInTheDocument()
  })

  it('disables delete and example actions in shared mode', () => {
    setMatchMedia(false)

    const { container } = render(
      <WordFeed
        words={[{ ...WORDS[0], examples: ['An older sentence.'] }]}
        expandedIds={new Set()}
        onToggle={() => {}}
        onDelete={() => {}}
        mode="shared"
      />,
    )

    expect(container.querySelector('[data-swipe-handle="true"]')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Delete word')).not.toBeInTheDocument()

    const card = screen.getByText('ephemeral').closest('[role="button"]')
    expect(card).toBeTruthy()
    fireEvent.click(card!)

    expect(screen.getByText('An older sentence.')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Generate examples' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Regenerate examples' })).not.toBeInTheDocument()
  })
})
