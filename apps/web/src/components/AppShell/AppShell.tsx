import type { UserProfile } from '@words/shared'
import type { ReactNode } from 'react'
import { createContext, use, useCallback, useEffect, useRef, useState } from 'react'
import styles from './AppShell.module.css'
import { TopBar } from './TopBar'

interface ScrollState {
  isScrolled: boolean
  scrollY: number
}

const ScrollContext = createContext<ScrollState>({ isScrolled: false, scrollY: 0 })

// Hysteresis band: switch to the compact header only after scrolling well past
// the prominent input, and back to prominent only near the very top. A single
// threshold here caused a feedback loop — compacting the input shrank the
// content above the fold, which (via browser scroll anchoring) pushed scrollTop
// back across the threshold, oscillating and "snapping" the page to the top.
const COMPACT_ENTER = 72
const COMPACT_EXIT = 24

// eslint-disable-next-line react-refresh/only-export-components
export function useScrollState() {
  return use(ScrollContext)
}

interface AppShellProps {
  children: ReactNode
  user?: UserProfile | null
  activeListName?: string | null
  activeListWordCount?: number
  onShareClick?: () => void
  onDeleteActiveList?: () => void
  isSharing?: boolean
  isDeletingActiveList?: boolean
  shareCopied?: boolean
  shareFailed?: boolean
  onSignIn?: () => void
  onSignOut?: () => void
  onSearchClick?: () => void
  onListClick?: () => void
  avatarPopoverMessage?: string | null
  onDismissAvatarPopover?: () => void
}

export function AppShell({
  children,
  user,
  activeListName,
  activeListWordCount,
  onShareClick,
  onDeleteActiveList,
  isSharing,
  isDeletingActiveList,
  shareCopied,
  shareFailed,
  onSignIn,
  onSignOut,
  onSearchClick,
  onListClick,
  avatarPopoverMessage,
  onDismissAvatarPopover,
}: AppShellProps) {
  const [scrollState, setScrollState] = useState<ScrollState>({ isScrolled: false, scrollY: 0 })
  const mainRef = useRef<HTMLElement>(null)
  const frameRef = useRef<number | null>(null)

  const handleScroll = useCallback(() => {
    if (frameRef.current !== null)
      return
    frameRef.current = requestAnimationFrame(() => {
      frameRef.current = null
      const scrollY = mainRef.current?.scrollTop ?? 0
      setScrollState((prev) => {
        const isScrolled = prev.isScrolled ? scrollY > COMPACT_EXIT : scrollY > COMPACT_ENTER
        // Only re-render consumers when the compact/prominent state actually flips.
        return isScrolled === prev.isScrolled ? prev : { isScrolled, scrollY }
      })
    })
  }, [])

  useEffect(() => {
    const el = mainRef.current
    if (!el)
      return
    el.addEventListener('scroll', handleScroll, { passive: true })
    return () => {
      el.removeEventListener('scroll', handleScroll)
      if (frameRef.current !== null) {
        cancelAnimationFrame(frameRef.current)
        frameRef.current = null
      }
    }
  }, [handleScroll])

  return (
    <ScrollContext value={scrollState}>
      <div className={styles.shell}>
        <TopBar
          user={user ?? null}
          activeListName={activeListName ?? null}
          activeListWordCount={activeListWordCount}
          onShareClick={onShareClick}
          onDeleteActiveList={onDeleteActiveList}
          isSharing={isSharing}
          isDeletingActiveList={isDeletingActiveList}
          shareCopied={shareCopied}
          shareFailed={shareFailed}
          onSignIn={onSignIn ?? (() => {})}
          onSignOut={onSignOut ?? (() => {})}
          onSearchClick={onSearchClick}
          onListClick={onListClick}
          avatarPopoverMessage={avatarPopoverMessage}
          onDismissAvatarPopover={onDismissAvatarPopover}
        />
        <main ref={mainRef} className={styles.main}>
          {children}
        </main>
      </div>
    </ScrollContext>
  )
}
