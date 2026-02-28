import { useEffect, useRef } from 'react'
import { wordStore } from '../db'
import { lookupWord } from '../services/dictionary'

const RETRY_INTERVAL = 30_000 // 30 seconds
const RETRY_DELAY = 2_000 // 2 seconds between retries (throttle)

export function useDefinitionRetry(onUpdate: () => void) {
  const intervalRef = useRef<ReturnType<typeof setInterval>>(undefined)

  useEffect(() => {
    async function retryPending() {
      if (!navigator.onLine)
        return

      const pending = await wordStore.getPending()
      if (pending.length === 0)
        return

      for (const word of pending) {
        if (!navigator.onLine)
          break

        const result = await lookupWord(word.text)
        if (result.status !== 'pending') {
          await wordStore.update(word.id, {
            definitions: result.meanings,
            pronunciation: result.pronunciation,
            definitionStatus: result.status,
          })
          onUpdate()
        }

        // Throttle to respect API rate limits
        if (pending.indexOf(word) < pending.length - 1) {
          await new Promise(resolve => setTimeout(resolve, RETRY_DELAY))
        }
      }
    }

    // Initial retry
    retryPending()

    // Periodic retry
    intervalRef.current = setInterval(retryPending, RETRY_INTERVAL)

    // Retry when coming back online
    const handleOnline = () => retryPending()
    window.addEventListener('online', handleOnline)

    return () => {
      if (intervalRef.current)
        clearInterval(intervalRef.current)
      window.removeEventListener('online', handleOnline)
    }
  }, [onUpdate])
}
