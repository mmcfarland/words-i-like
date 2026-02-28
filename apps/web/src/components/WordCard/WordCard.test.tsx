import type { DictionaryMeaning } from '@words/shared'
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { WordCard } from './WordCard'

const MOCK_MEANINGS: DictionaryMeaning[] = [
  {
    partOfSpeech: 'adjective',
    definitions: [
      { definition: 'Lasting for a short period of time.', synonyms: ['transient'], antonyms: ['permanent'], example: 'The ephemeral beauty of cherry blossoms.' },
      { definition: 'Short-lived; existing briefly.', synonyms: [], antonyms: [] },
    ],
    synonyms: ['transient'],
    antonyms: ['permanent'],
  },
  {
    partOfSpeech: 'noun',
    definitions: [
      { definition: 'An ephemeral plant or insect.', synonyms: [], antonyms: [] },
    ],
    synonyms: [],
    antonyms: [],
  },
]

describe('wordCard', () => {
  it('renders word in collapsed state with excerpt', () => {
    render(<WordCard text="ephemeral" meanings={MOCK_MEANINGS} pronunciation="/əˈfɛ.mə.ɹəl/" definitionStatus="found" />)
    expect(screen.getByText('ephemeral')).toBeInTheDocument()
    expect(screen.getByText('/əˈfɛ.mə.ɹəl/')).toBeInTheDocument()
    expect(screen.getByText('Lasting for a short period of time.')).toBeInTheDocument()
  })

  it('shows all definitions when expanded', () => {
    render(<WordCard text="ephemeral" meanings={MOCK_MEANINGS} definitionStatus="found" />)
    fireEvent.click(screen.getByRole('button'))
    expect(screen.getByText('adjective')).toBeInTheDocument()
    expect(screen.getByText('noun')).toBeInTheDocument()
    expect(screen.getByText('Short-lived; existing briefly.')).toBeInTheDocument()
    expect(screen.getByText('An ephemeral plant or insect.')).toBeInTheDocument()
  })

  it('collapses on second tap', () => {
    render(<WordCard text="ephemeral" meanings={MOCK_MEANINGS} definitionStatus="found" />)
    const card = screen.getByRole('button')
    fireEvent.click(card)
    expect(screen.getByText('adjective')).toBeInTheDocument()
    fireEvent.click(card)
    // After collapse, aria-expanded should be false and excerpt visible
    expect(card).toHaveAttribute('aria-expanded', 'false')
    // Excerpt is rendered (may co-exist with exit-animating expanded content)
    expect(screen.getAllByText('Lasting for a short period of time.').length).toBeGreaterThanOrEqual(1)
  })

  it('shows no definition indicator for not_found status', () => {
    render(<WordCard text="xyzword" meanings={[]} definitionStatus="not_found" />)
    expect(screen.getByText('No definition found')).toBeInTheDocument()
  })

  it('shows pending indicator for pending status', () => {
    render(<WordCard text="testword" meanings={[]} definitionStatus="pending" />)
    expect(screen.getByText('Looking up definition…')).toBeInTheDocument()
  })

  it('has proper accessibility attributes', () => {
    render(<WordCard text="test" meanings={MOCK_MEANINGS} definitionStatus="found" />)
    const card = screen.getByRole('button')
    expect(card).toHaveAttribute('aria-expanded', 'false')
    fireEvent.click(card)
    expect(card).toHaveAttribute('aria-expanded', 'true')
  })
})
