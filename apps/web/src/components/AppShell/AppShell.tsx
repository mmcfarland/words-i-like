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

  const handleScroll = useCallback(() => {
    const scrollY = mainRef.current?.scrollTop ?? 0
    setScrollState({ isScrolled: scrollY > 60, scrollY })
  }, [])

  useEffect(() => {
    const el = mainRef.current
    if (!el)
      return
    el.addEventListener('scroll', handleScroll, { passive: true })
    return () => el.removeEventListener('scroll', handleScroll)
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
        <main ref={mainRef} className={styles.main} onScroll={handleScroll}>
          {children}
        </main>
      </div>
    </ScrollContext>
  )
}
