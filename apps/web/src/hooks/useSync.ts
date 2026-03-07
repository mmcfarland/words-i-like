import { useEffect, useRef } from 'react'
import { syncService } from '../services/sync'

const SYNC_INTERVAL = 60_000 // 1 minute
const LOCAL_PUSH_DEBOUNCE = 3_000

export function useSync(
  isAuthenticated: boolean,
  onSyncComplete?: () => void,
  localChangeVersion = 0,
) {
  const intervalRef = useRef<ReturnType<typeof setInterval>>(undefined)
  const localPushTimeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined)
  const lastSeenLocalChangeRef = useRef(localChangeVersion)
  const hasPendingLocalPushRef = useRef(false)

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
        const syncPromise = hasPendingLocalPushRef.current
          ? syncService.pushAndMerge()
          : syncService.pull()
        syncPromise.then((result) => {
          if (result)
            hasPendingLocalPushRef.current = false
          onSyncComplete?.()
        })
      }
    }, SYNC_INTERVAL)

    return () => {
      if (intervalRef.current)
        clearInterval(intervalRef.current)
    }
  }, [isAuthenticated, onSyncComplete])

  useEffect(() => {
    if (!isAuthenticated) {
      lastSeenLocalChangeRef.current = localChangeVersion
      hasPendingLocalPushRef.current = false
      if (localPushTimeoutRef.current)
        clearTimeout(localPushTimeoutRef.current)
      return
    }

    if (localChangeVersion === lastSeenLocalChangeRef.current)
      return

    lastSeenLocalChangeRef.current = localChangeVersion
    hasPendingLocalPushRef.current = true
    if (localPushTimeoutRef.current)
      clearTimeout(localPushTimeoutRef.current)

    localPushTimeoutRef.current = setTimeout(() => {
      if (!navigator.onLine)
        return
      syncService.pushAndMerge().then((result) => {
        if (result)
          hasPendingLocalPushRef.current = false
        onSyncComplete?.()
      })
    }, LOCAL_PUSH_DEBOUNCE)

    return () => {
      if (localPushTimeoutRef.current)
        clearTimeout(localPushTimeoutRef.current)
    }
  }, [isAuthenticated, localChangeVersion, onSyncComplete])
}
