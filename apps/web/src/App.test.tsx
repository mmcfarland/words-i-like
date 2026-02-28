import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { App } from './App'

describe('app', () => {
  it('renders the app title', () => {
    render(<App />)
    expect(screen.getByText('Words I Like')).toBeInTheDocument()
  })
})
