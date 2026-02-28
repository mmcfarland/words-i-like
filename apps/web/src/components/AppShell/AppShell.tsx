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
  onSignIn?: () => void
  onSignOut?: () => void
}

export function AppShell({ children, user, onSignIn, onSignOut }: AppShellProps) {
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
        <TopBar user={user ?? null} onSignIn={onSignIn ?? (() => {})} onSignOut={onSignOut ?? (() => {})} />
        <main ref={mainRef} className={styles.main} onScroll={handleScroll}>
          {children}
        </main>
      </div>
    </ScrollContext>
  )
}
