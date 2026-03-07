import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { App } from './App'
import { db } from './db'
import 'fake-indexeddb/auto'

vi.mock('./services/dictionary', () => ({
  lookupWord: vi.fn().mockResolvedValue({
    status: 'found',
    meanings: [],
    pronunciation: undefined,
    pronunciationAudio: undefined,
  }),
}))

describe('app', () => {
  beforeEach(async () => {
    window.history.replaceState({}, '', '/')
    localStorage.clear()
    await db.words.clear()
    await db.lists.clear()
    await db.wordLists.clear()
  })

  it('renders the word input after loading', async () => {
    render(<App />)
    await waitFor(() => {
      expect(screen.getByPlaceholderText('Words I like')).toBeInTheDocument()
    })
  })

  it('shows intro card when no words exist', async () => {
    render(<App />)
    await waitFor(() => {
      expect(screen.getByText('Start by typing a word you like')).toBeInTheDocument()
    })
    expect(screen.getByText(/Enter words above/)).toBeInTheDocument()
  })

  it('does not show auth tooltip immediately when not signed in', async () => {
    render(<App />)
    await waitFor(() => {
      expect(screen.getByPlaceholderText('Words I like')).toBeInTheDocument()
    })
    expect(screen.queryByLabelText('Sign in to sync')).not.toBeInTheDocument()
  })

  it('shows avatar popover after first added word when not signed in', async () => {
    render(<App />)
    await waitFor(() => {
      expect(screen.getByLabelText('Enter a word')).toBeInTheDocument()
    })

    // Intro card should be visible before adding word
    expect(screen.getByText('Start by typing a word you like')).toBeInTheDocument()

    const input = screen.getByLabelText('Enter a word')
    fireEvent.change(input, { target: { value: 'ephemeral' } })
    fireEvent.submit(input.closest('form')!)

    await waitFor(() => {
      expect(screen.getByText(/only saved on this device/i)).toBeInTheDocument()
    })

    // Intro card should disappear after adding a word
    expect(screen.queryByText('Start by typing a word you like')).not.toBeInTheDocument()
  })

  it('reads list route and adds new words directly to that list', async () => {
    const now = Date.now()
    await db.lists.add({
      id: 'list-1',
      name: 'Favorites',
      createdAt: now,
      updatedAt: now,
    })
    window.history.replaceState({}, '', '/lists/list-1')

    render(<App initialListId="list-1" />)
    await waitFor(() => {
      expect(screen.getByText('Favorites')).toBeInTheDocument()
    })

    const input = screen.getByLabelText('Enter a word')
    fireEvent.change(input, { target: { value: 'ephemeral' } })
    fireEvent.submit(input.closest('form')!)

    await waitFor(async () => {
      const assignments = await db.wordLists.where('listId').equals('list-1').count()
      expect(assignments).toBe(1)
    })
  })

  it('shows login tooltip again after 10 words when signed out', async () => {
    const now = Date.now()
    await db.words.bulkAdd(
      Array.from({ length: 10 }, (_, i) => ({
        id: `seed-${i}`,
        text: `seed-word-${i}`,
        definitions: [],
        definitionStatus: 'found' as const,
        createdAt: now + i,
        updatedAt: now + i,
      })),
    )

    render(<App />)

    await waitFor(() => {
      expect(screen.getByLabelText('Sign in to sync')).toBeInTheDocument()
    })
  })
})
