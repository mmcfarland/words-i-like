import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { AppShell, useScrollState } from './AppShell'

function ScrollIndicator() {
  const { isScrolled } = useScrollState()
  return <div data-testid="scroll-indicator">{isScrolled ? 'scrolled' : 'top'}</div>
}

describe('appShell', () => {
  it('renders top bar and content', () => {
    render(
      <AppShell>
        <div>Content</div>
      </AppShell>,
    )
    expect(screen.getByLabelText('Account')).toBeInTheDocument()
    expect(screen.getByLabelText('Search')).toBeInTheDocument()
    expect(screen.getByLabelText('Lists')).toBeInTheDocument()
    expect(screen.getByText('Content')).toBeInTheDocument()
  })

  it('provides scroll state context', () => {
    render(
      <AppShell>
        <ScrollIndicator />
      </AppShell>,
    )
    expect(screen.getByTestId('scroll-indicator')).toHaveTextContent('top')
  })
})
