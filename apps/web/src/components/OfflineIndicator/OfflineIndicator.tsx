import { useEffect, useState } from 'react'
import styles from './OfflineIndicator.module.css'

export function OfflineIndicator() {
  const [isOffline, setIsOffline] = useState(!navigator.onLine)

  useEffect(() => {
    const handleOnline = () => setIsOffline(false)
    const handleOffline = () => setIsOffline(true)
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  if (!isOffline)
    return null

  return (
    <div className={styles.indicator} role="status" aria-live="polite">
      Offline — words are saved on this device
    </div>
  )
}
