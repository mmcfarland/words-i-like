import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
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
    expect(screen.getByLabelText('Sign in')).toBeInTheDocument()
    expect(screen.getByText('Not signed in')).toBeInTheDocument()
    expect(screen.getByText('Click to sign in')).toBeInTheDocument()
    expect(screen.getByLabelText('Search')).toBeInTheDocument()
    expect(screen.getByText('Content')).toBeInTheDocument()
  })

  it('opens list selector from list pill trigger', () => {
    const onListClick = vi.fn()
    render(
      <AppShell activeListName="All Words" activeListWordCount={3} onListClick={onListClick}>
        <div>Content</div>
      </AppShell>,
    )

    fireEvent.click(screen.getByLabelText('Open list selector'))
    expect(onListClick).toHaveBeenCalledOnce()
  })

  it('shows signed-in avatar and dropdown menu on click', () => {
    const onSignOut = vi.fn()
    render(
      <AppShell user={{ id: 'u1', googleId: 'g1', displayName: 'Dev User', avatarUrl: null }} onSignOut={onSignOut}>
        <div>Content</div>
      </AppShell>,
    )
    expect(screen.getByLabelText('Signed in as Dev User')).toBeInTheDocument()

    // Menu not visible yet
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()

    // Click avatar opens menu
    fireEvent.click(screen.getByLabelText('Signed in as Dev User'))
    expect(screen.getByRole('menu')).toBeInTheDocument()
    expect(screen.getByText('Dev User')).toBeInTheDocument()
    expect(screen.getByRole('menuitem', { name: 'Sign out' })).toBeInTheDocument()

    // Click sign out
    fireEvent.click(screen.getByRole('menuitem', { name: 'Sign out' }))
    expect(onSignOut).toHaveBeenCalledOnce()
  })

  it('falls back to icon when avatar image fails to load', () => {
    render(
      <AppShell user={{ id: 'u1', googleId: 'g1', displayName: 'Dev User', avatarUrl: 'https://example.com/avatar.png' }}>
        <div>Content</div>
      </AppShell>,
    )

    const avatarButton = screen.getByLabelText('Signed in as Dev User')
    const image = avatarButton.querySelector('img')
    expect(image).not.toBeNull()
    fireEvent.error(image!)
    expect(avatarButton.querySelector('img')).toBeNull()
    expect(avatarButton.querySelector('svg')).not.toBeNull()
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
