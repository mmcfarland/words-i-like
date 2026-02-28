import { useEffect, useState } from 'react'

const MONITOR_INTERVAL = 60_000 // Check every minute
const WARN_THRESHOLD = 0.8 // 80%

export function useStorageMonitor() {
  const [storageWarning, setStorageWarning] = useState(false)

  useEffect(() => {
    async function checkStorage() {
      if (!navigator.storage?.estimate)
        return
      const { usage = 0, quota = 0 } = await navigator.storage.estimate()
      if (quota > 0) {
        setStorageWarning(usage / quota > WARN_THRESHOLD)
      }
    }

    checkStorage()
    const interval = setInterval(checkStorage, MONITOR_INTERVAL)
    return () => clearInterval(interval)
  }, [])

  return { storageWarning }
}
