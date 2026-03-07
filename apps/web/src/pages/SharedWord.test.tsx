import { render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { SharedWord } from './SharedWord'

const fetchMock = vi.hoisted(() => vi.fn())

describe('SharedWord', () => {
  beforeEach(() => {
    fetchMock.mockReset()
    vi.stubGlobal('fetch', fetchMock)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('shows home link and word card with definition, no delete or generate buttons', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        text: 'ephemeral',
        pronunciation: '/əˈfɛ.mə.ɹəl/',
        definitionStatus: 'found',
        definitions: [{
          partOfSpeech: 'adjective',
          definitions: [
            { definition: 'Lasting for a short period of time.' },
          ],
        }],
      }),
    })

    render(<SharedWord token="word-token-1" />)

    await waitFor(() => {
      expect(screen.getByText('ephemeral')).toBeInTheDocument()
    })

    expect(screen.getByRole('link', { name: 'Words I Like' })).toHaveAttribute('href', '/')
    expect(screen.getByText('a word someone likes')).toBeInTheDocument()
    expect(screen.queryByLabelText('Delete word')).not.toBeInTheDocument()
    expect(screen.queryByText('Generate examples')).not.toBeInTheDocument()
    expect(screen.queryByText('Regenerate examples')).not.toBeInTheDocument()
    expect(screen.queryByText('Add to list')).not.toBeInTheDocument()
  })
})
