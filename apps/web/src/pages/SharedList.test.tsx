import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { SharedList } from './SharedList'

const fetchMock = vi.hoisted(() => vi.fn())

describe('sharedList', () => {
  beforeEach(() => {
    fetchMock.mockReset()
    vi.stubGlobal('fetch', fetchMock)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('shows home link and shared-mode cards with actions disabled', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        name: 'Favorites',
        words: [
          {
            id: 'word-1',
            text: 'ephemeral',
            pronunciation: '/əˈfɛ.mə.ɹəl/',
            definitionStatus: 'found',
            definitions: [{
              partOfSpeech: 'adjective',
              definitions: [
                { definition: 'Lasting for a short period of time.' },
                { definition: 'Short-lived; existing briefly.' },
              ],
            }],
          },
        ],
      }),
    })

    render(<SharedList token="token-1" />)

    await waitFor(() => {
      expect(screen.getByText('ephemeral')).toBeInTheDocument()
    })

    expect(screen.getByRole('link', { name: 'Words I Like' })).toHaveAttribute('href', '/')
    expect(screen.queryByLabelText('Delete word')).not.toBeInTheDocument()
    expect(screen.queryByText('Short-lived; existing briefly.')).not.toBeInTheDocument()
    expect(screen.queryByText('Generate examples')).not.toBeInTheDocument()
    expect(screen.queryByText('Regenerate examples')).not.toBeInTheDocument()
    expect(screen.queryByText('Add to list')).not.toBeInTheDocument()

    const card = screen.getByText('ephemeral').closest('[role="button"]')
    expect(card).toBeTruthy()
    fireEvent.click(card!)

    expect(screen.getByText('Short-lived; existing briefly.')).toBeInTheDocument()
    expect(screen.queryByText('Generate examples')).not.toBeInTheDocument()
    expect(screen.queryByText('Regenerate examples')).not.toBeInTheDocument()
  })
})
