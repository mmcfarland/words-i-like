import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { AppShell } from '../AppShell'
import { validateWordInput, WordInput } from './WordInput'

describe('validateWordInput', () => {
  it('rejects empty input', () => {
    expect(validateWordInput('')).toEqual({ valid: false, error: 'Enter a word' })
    expect(validateWordInput('   ')).toEqual({ valid: false, error: 'Enter a word' })
  })

  it('accepts 1 word', () => {
    expect(validateWordInput('ephemeral')).toEqual({ valid: true })
  })

  it('accepts 2 words', () => {
    expect(validateWordInput('ad hoc')).toEqual({ valid: true })
  })

  it('accepts 3 words', () => {
    expect(validateWordInput('je ne sais')).toEqual({ valid: true })
  })

  it('rejects 4+ words', () => {
    expect(validateWordInput('one two three four')).toEqual({ valid: false, error: 'Enter up to 3 words' })
  })

  it('trims whitespace before counting', () => {
    expect(validateWordInput('  hello  ')).toEqual({ valid: true })
  })
})

describe('wordInput', () => {
  it('renders input with placeholder', () => {
    render(
      <AppShell>
        <WordInput onSubmit={() => {}} />
      </AppShell>,
    )
    expect(screen.getByPlaceholderText('What word caught your eye?')).toBeInTheDocument()
  })

  it('calls onSubmit with trimmed value on valid input', () => {
    const onSubmit = vi.fn()
    render(
      <AppShell>
        <WordInput onSubmit={onSubmit} />
      </AppShell>,
    )
    const input = screen.getByLabelText('Enter a word')
    fireEvent.change(input, { target: { value: 'ephemeral' } })
    fireEvent.submit(input.closest('form')!)
    expect(onSubmit).toHaveBeenCalledWith('ephemeral')
  })

  it('shows error for input with 4+ words', () => {
    const onSubmit = vi.fn()
    render(
      <AppShell>
        <WordInput onSubmit={onSubmit} />
      </AppShell>,
    )
    const input = screen.getByLabelText('Enter a word')
    fireEvent.change(input, { target: { value: 'one two three four' } })
    fireEvent.submit(input.closest('form')!)
    expect(screen.getByRole('alert')).toHaveTextContent('Enter up to 3 words')
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('clears input after successful submit', () => {
    render(
      <AppShell>
        <WordInput onSubmit={() => {}} />
      </AppShell>,
    )
    const input = screen.getByLabelText('Enter a word') as HTMLInputElement
    fireEvent.change(input, { target: { value: 'hello' } })
    fireEvent.submit(input.closest('form')!)
    expect(input.value).toBe('')
  })

  it('disables submit button when input is empty', () => {
    render(
      <AppShell>
        <WordInput onSubmit={() => {}} />
      </AppShell>,
    )
    expect(screen.getByLabelText('Submit word')).toBeDisabled()
  })
})
