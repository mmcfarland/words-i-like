import type { UserProfile } from '@words/shared'
import { useCallback, useEffect, useRef, useState } from 'react'
import styles from './TopBar.module.css'

interface TopBarProps {
  user: UserProfile | null
  activeListName?: string | null
  activeListWordCount?: number
  onShareClick?: () => void
  onDeleteActiveList?: () => void
  isSharing?: boolean
  isDeletingActiveList?: boolean
  shareCopied?: boolean
  shareFailed?: boolean
  onSignIn: () => void
  onSignOut: () => void
  onSearchClick?: () => void
  onListClick?: () => void
  avatarPopoverMessage?: string | null
  onDismissAvatarPopover?: () => void
}

export function TopBar({
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
}: TopBarProps) {
  const [avatarImageFailed, setAvatarImageFailed] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const showListStatus = !!activeListName && typeof activeListWordCount === 'number'
  const showShareButton = showListStatus && !!onShareClick
  const showDeleteButton = showListStatus && !!onDeleteActiveList
  const shareTooltip = shareCopied
    ? 'Link copied'
    : shareFailed
      ? 'Couldn\'t share'
      : activeListName === 'All Words'
        ? 'Share all words'
        : 'Share list'

  useEffect(() => {
    setAvatarImageFailed(false)
  }, [user?.id, user?.avatarUrl])

  // Close menu on outside click
  useEffect(() => {
    if (!menuOpen)
      return
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node))
        setMenuOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [menuOpen])

  const handleAvatarClick = useCallback(() => {
    if (user) {
      setMenuOpen(prev => !prev)
    }
    else {
      onSignIn()
    }
  }, [user, onSignIn])

  const handleSignOut = useCallback(() => {
    setMenuOpen(false)
    onSignOut()
  }, [onSignOut])

  return (
    <header className={styles.topbar}>
      <div className={styles.left}>
        <div className={styles.avatarWrap} ref={menuRef}>
          <button
            className={`${styles.avatar} ${user ? styles.avatarSignedIn : styles.avatarSignedOut}`}
            aria-label={user ? `Signed in as ${user.displayName}` : 'Sign in'}
            type="button"
            onClick={handleAvatarClick}
          >
            {user?.avatarUrl && !avatarImageFailed
              ? (
                  <img
                    src={user.avatarUrl}
                    alt=""
                    className={styles.avatarImage}
                    referrerPolicy="no-referrer"
                    onError={() => setAvatarImageFailed(true)}
                  />
                )
              : (
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={user ? styles.avatarActive : styles.avatarGhost}>
                    <circle cx="12" cy="8" r="4" />
                    <path d="M4 21v-1a6 6 0 0 1 12 0v1" />
                  </svg>
                )}
          </button>
          {!user && !avatarPopoverMessage && (
            <div className={styles.avatarTooltip} role="tooltip">
              <p className={styles.avatarTooltipTitle}>Not signed in</p>
              <p className={styles.avatarTooltipHint}>Click to sign in</p>
            </div>
          )}
          {user && menuOpen && (
            <div className={styles.avatarMenu} role="menu">
              <p className={styles.menuUserName}>{user.displayName}</p>
              <button
                className={styles.menuItem}
                type="button"
                role="menuitem"
                onClick={handleSignOut}
              >
                Sign out
              </button>
            </div>
          )}
          {avatarPopoverMessage && !user && (
            <div className={styles.avatarPopover} role="status">
              <p>{avatarPopoverMessage}</p>
              <button
                className={styles.popoverDismiss}
                type="button"
                aria-label="Dismiss sign-in message"
                onClick={onDismissAvatarPopover}
              >
                ✕
              </button>
            </div>
          )}
        </div>
      </div>

      <div className={styles.actions}>
        {showListStatus && (
          <div className={styles.listStatus}>
            <span className={styles.statusLabel}>
              <button
                className={styles.statusMainButton}
                type="button"
                aria-label="Open list selector"
                onClick={onListClick}
              >
                <span className={styles.statusText}>{activeListName}</span>
                <span className={styles.countPill}>
                  {activeListWordCount}
                  {' '}
                  {activeListWordCount === 1 ? 'word' : 'words'}
                </span>
              </button>
              {showShareButton && (
                <button
                  className={`${styles.pillAction} ${styles.shareIconButton} ${styles.iconTooltip}`}
                  type="button"
                  aria-label={shareTooltip}
                  data-tooltip={shareTooltip}
                  onClick={(event) => {
                    event.stopPropagation()
                    onShareClick()
                  }}
                  disabled={isSharing}
                >
                  {shareCopied
                    ? (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M5 12l5 5L20 7" />
                        </svg>
                      )
                    : (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <circle cx="18" cy="5" r="3" />
                          <circle cx="6" cy="12" r="3" />
                          <circle cx="18" cy="19" r="3" />
                          <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
                          <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
                        </svg>
                      )}
                </button>
              )}
              {showDeleteButton && (
                <button
                  className={`${styles.pillAction} ${styles.deleteIconButton} ${styles.iconTooltip}`}
                  type="button"
                  aria-label="Delete list"
                  data-tooltip="Delete list"
                  onClick={(event) => {
                    event.stopPropagation()
                    onDeleteActiveList()
                  }}
                  disabled={isDeletingActiveList}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                  </svg>
                </button>
              )}
            </span>
          </div>
        )}
        <button className={styles.iconButton} aria-label="Search" type="button" onClick={onSearchClick}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.35-4.35" />
          </svg>
        </button>
      </div>
    </header>
  )
}
