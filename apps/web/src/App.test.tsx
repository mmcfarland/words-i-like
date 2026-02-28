import { render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { App } from './App'
import 'fake-indexeddb/auto'

describe('app', () => {
  it('renders the word input after loading', async () => {
    render(<App />)
    await waitFor(() => {
      expect(screen.getByPlaceholderText('What word caught your eye?')).toBeInTheDocument()
    })
  })

  it('shows auth tooltip when not signed in', async () => {
    render(<App />)
    await waitFor(() => {
      expect(screen.getByText(/saved on this device/i)).toBeInTheDocument()
    })
  })
})
