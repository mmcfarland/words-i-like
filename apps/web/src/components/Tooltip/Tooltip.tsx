import { useCallback, useState } from 'react'
import styles from './Tooltip.module.css'

const TOOLTIP_DISMISSED_KEY = 'words-tooltip-dismissed'

export function AuthTooltip() {
  const [dismissed, setDismissed] = useState(
    () => localStorage.getItem(TOOLTIP_DISMISSED_KEY) === 'true',
  )

  const dismiss = useCallback(() => {
    localStorage.setItem(TOOLTIP_DISMISSED_KEY, 'true')
    setDismissed(true)
  }, [])

  if (dismissed)
    return null

  return (
    <div className={styles.tooltip} role="status">
      <p>Your words are saved on this device. Sign in to sync across devices.</p>
      <button onClick={dismiss} className={styles.dismiss} type="button" aria-label="Dismiss">
        ✕
      </button>
    </div>
  )
}
