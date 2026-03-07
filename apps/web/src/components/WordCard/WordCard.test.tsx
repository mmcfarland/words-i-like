import type { DictionaryMeaning } from '@words/shared'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { aiService } from '../../services/ai'
import { authService } from '../../services/auth'
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
  afterEach(() => {
    vi.restoreAllMocks()
  })

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

  it('does not toggle when text selection is active', () => {
    vi.spyOn(window, 'getSelection').mockReturnValue({
      toString: () => 'selected text',
    } as unknown as Selection)
    render(<WordCard text="test" meanings={MOCK_MEANINGS} definitionStatus="found" />)

    const card = screen.getByRole('button')
    fireEvent.click(card)

    expect(card).toHaveAttribute('aria-expanded', 'false')
  })

  it('deletes word from desktop delete button without toggling card', () => {
    const onDelete = vi.fn()
    render(<WordCard text="test" meanings={MOCK_MEANINGS} definitionStatus="found" onDelete={onDelete} />)

    const card = screen.getByRole('button', { expanded: false })
    fireEvent.click(screen.getByLabelText('Delete word'))

    expect(onDelete).toHaveBeenCalledOnce()
    expect(card).toHaveAttribute('aria-expanded', 'false')
  })

  it('shows AI button when signed out and prompts sign in', () => {
    vi.spyOn(authService, 'isAuthenticated').mockReturnValue(false)
    const generateSpy = vi.spyOn(aiService, 'generateExamples')

    render(<WordCard text="ephemeral" meanings={MOCK_MEANINGS} definitionStatus="found" wordId="word-1" />)
    fireEvent.click(screen.getByRole('button'))

    const generateButton = screen.getByRole('button', { name: 'Generate examples' })
    expect(generateButton).toBeInTheDocument()
    fireEvent.click(generateButton)

    expect(generateSpy).not.toHaveBeenCalled()
    expect(screen.getByText('You must sign in to use AI examples.')).toBeInTheDocument()
  })

  it('generates examples when signed in', async () => {
    vi.spyOn(authService, 'isAuthenticated').mockReturnValue(true)
    const generateSpy = vi.spyOn(aiService, 'generateExamples').mockResolvedValue({
      examples: ['A brief example sentence.'],
      source: 'azure',
      remaining: 4,
      limit: 5,
    })

    render(<WordCard text="ephemeral" meanings={MOCK_MEANINGS} definitionStatus="found" wordId="word-1" />)
    fireEvent.click(screen.getByRole('button'))
    fireEvent.click(screen.getByRole('button', { name: 'Generate examples' }))

    await waitFor(() => {
      expect(generateSpy).toHaveBeenCalledWith('word-1', 'ephemeral')
    })
    expect(screen.getByText('A brief example sentence.')).toBeInTheDocument()
  })

  it('shows regenerate icon and refreshes existing examples', async () => {
    vi.spyOn(authService, 'isAuthenticated').mockReturnValue(true)
    const generateSpy = vi.spyOn(aiService, 'generateExamples').mockResolvedValue({
      examples: ['A refreshed sentence.'],
      source: 'azure',
      remaining: 3,
      limit: 5,
    })

    render(
      <WordCard
        text="ephemeral"
        meanings={MOCK_MEANINGS}
        definitionStatus="found"
        wordId="word-1"
        examples={['An older sentence.']}
      />,
    )
    fireEvent.click(screen.getByRole('button'))
    expect(screen.getByText('An older sentence.')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Regenerate examples' }))

    await waitFor(() => {
      expect(generateSpy).toHaveBeenCalledWith('word-1', 'ephemeral')
    })
    expect(screen.getByText('A refreshed sentence.')).toBeInTheDocument()
  })
})
