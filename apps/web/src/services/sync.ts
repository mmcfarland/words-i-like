import type { SyncResponse, SyncWord } from '@words/shared'
import { wordStore } from '../db'
import { authService } from './auth'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001'
const LAST_SYNC_KEY = 'words-last-synced-at'

export const syncService = {
  async pushAndMerge(): Promise<SyncResponse | null> {
    if (!authService.isAuthenticated())
      return null

    const localWords = await wordStore.getAll()
    const syncWords: SyncWord[] = localWords.map(w => ({
      id: w.id,
      text: w.text,
      definitions: w.definitions,
      pronunciation: w.pronunciation,
      definitionStatus: w.definitionStatus,
      examples: w.examples,
      createdAt: w.createdAt,
      updatedAt: w.updatedAt,
    }))

    try {
      const response = await fetch(`${API_URL}/api/sync`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authService.getAuthHeaders(),
        },
        body: JSON.stringify({
          words: syncWords,
          lastSyncedAt: this.getLastSyncedAt(),
        }),
      })

      if (!response.ok)
        return null
      const result: SyncResponse = await response.json()

      localStorage.setItem(LAST_SYNC_KEY, String(result.syncedAt))
      return result
    }
    catch {
      return null
    }
  },

  async pull(): Promise<SyncResponse | null> {
    if (!authService.isAuthenticated())
      return null

    try {
      const since = this.getLastSyncedAt()
      const url = since
        ? `${API_URL}/api/sync?since=${since}`
        : `${API_URL}/api/sync`

      const response = await fetch(url, {
        headers: authService.getAuthHeaders(),
      })

      if (!response.ok)
        return null
      const result: SyncResponse = await response.json()

      localStorage.setItem(LAST_SYNC_KEY, String(result.syncedAt))
      return result
    }
    catch {
      return null
    }
  },

  getLastSyncedAt(): number | undefined {
    const stored = localStorage.getItem(LAST_SYNC_KEY)
    return stored ? Number(stored) : undefined
  },
}
