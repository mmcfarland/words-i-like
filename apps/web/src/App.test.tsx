import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { App } from './App'

describe('app', () => {
  it('renders the word input', () => {
    render(<App />)
    expect(screen.getByPlaceholderText('What word caught your eye?')).toBeInTheDocument()
  })
})
