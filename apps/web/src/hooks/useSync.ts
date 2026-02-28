import { useEffect, useRef } from 'react'
import { syncService } from '../services/sync'

const SYNC_INTERVAL = 60_000 // 1 minute

export function useSync(isAuthenticated: boolean, onSyncComplete?: () => void) {
  const intervalRef = useRef<ReturnType<typeof setInterval>>(undefined)

  useEffect(() => {
    if (!isAuthenticated)
      return

    // Initial sync on auth
    syncService.pushAndMerge().then(() => {
      onSyncComplete?.()
    })

    // Periodic sync
    intervalRef.current = setInterval(() => {
      if (navigator.onLine) {
        syncService.pull().then(() => {
          onSyncComplete?.()
        })
      }
    }, SYNC_INTERVAL)

    return () => {
      if (intervalRef.current)
        clearInterval(intervalRef.current)
    }
  }, [isAuthenticated, onSyncComplete])
}
