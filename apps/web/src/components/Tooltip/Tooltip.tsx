import { useCallback, useState } from 'react'
import styles from './Tooltip.module.css'

const TOOLTIP_DISMISSED_KEY = 'words-tooltip-dismissed'

interface AuthTooltipProps {
  onSignIn: () => void
  dismissStorageKey?: string
}

export function AuthTooltip({ onSignIn, dismissStorageKey = TOOLTIP_DISMISSED_KEY }: AuthTooltipProps) {
  const [dismissed, setDismissed] = useState(
    () => localStorage.getItem(dismissStorageKey) === 'true',
  )

  const dismiss = useCallback(() => {
    localStorage.setItem(dismissStorageKey, 'true')
    setDismissed(true)
  }, [dismissStorageKey])

  if (dismissed)
    return null

  return (
    <div className={styles.tooltip} role="status">
      <p>
        Your words are saved on this device.
        {' '}
        <button
          className={styles.inlineLink}
          type="button"
          onClick={onSignIn}
          aria-label="Sign in to sync"
        >
          Sign in
        </button>
        {' '}
        to sync across devices.
      </p>
      <button onClick={dismiss} className={styles.dismiss} type="button" aria-label="Dismiss">
        ✕
      </button>
    </div>
  )
}
