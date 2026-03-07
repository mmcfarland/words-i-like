import type { SyncDeletedWord, SyncResponse, SyncWord, Word } from '@words/shared'
import { wordStore } from '../db'
import { authService } from './auth'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001'
const LAST_SYNC_KEY = 'words-last-synced-at'
const PENDING_DELETED_KEY = 'words-pending-deleted'

function getStorageScope(userId = authService.getUser()?.id): string {
  return userId ? `user:${encodeURIComponent(userId)}` : 'anon'
}

function getLastSyncKey(userId = authService.getUser()?.id): string {
  return `${LAST_SYNC_KEY}:${getStorageScope(userId)}`
}

function getPendingDeletedKey(userId = authService.getUser()?.id): string {
  return `${PENDING_DELETED_KEY}:${getStorageScope(userId)}`
}

function readPendingDeleted(userId = authService.getUser()?.id): SyncDeletedWord[] {
  const stored = localStorage.getItem(getPendingDeletedKey(userId))
  if (!stored)
    return []
  try {
    const parsed = JSON.parse(stored)
    if (!Array.isArray(parsed))
      return []
    return parsed.filter(item =>
      item
      && typeof item.text === 'string'
      && item.text.length > 0
      && typeof item.deletedAt === 'number',
    )
  }
  catch {
    return []
  }
}

function writePendingDeleted(words: SyncDeletedWord[], userId = authService.getUser()?.id): void {
  if (words.length === 0) {
    localStorage.removeItem(getPendingDeletedKey(userId))
    return
  }
  localStorage.setItem(getPendingDeletedKey(userId), JSON.stringify(words))
}

async function applyServerDeletedWords(deletedWords: SyncDeletedWord[]): Promise<void> {
  for (const deletedWord of deletedWords) {
    await wordStore.deleteByText(deletedWord.text)
  }
}

function syncWordToLocal(sw: SyncWord): Word {
  return {
    id: sw.id,
    text: sw.text,
    definitions: Array.isArray(sw.definitions) ? sw.definitions as Word['definitions'] : [],
    pronunciation: sw.pronunciation,
    pronunciationAudio: sw.pronunciationAudio,
    definitionStatus: sw.definitionStatus,
    examples: sw.examples,
    createdAt: sw.createdAt,
    updatedAt: sw.updatedAt,
  }
}

export function queueDeletedWord(text: string, deletedAt = Date.now()): void {
  const userId = authService.getUser()?.id
  const normalizedText = text.trim()
  if (!userId || !normalizedText)
    return

  const pending = readPendingDeleted(userId)
  const existingIndex = pending.findIndex(item => item.text.toLowerCase() === normalizedText.toLowerCase())
  if (existingIndex >= 0) {
    pending[existingIndex] = {
      text: normalizedText,
      deletedAt: Math.max(pending[existingIndex].deletedAt, deletedAt),
    }
  }
  else {
    pending.push({ text: normalizedText, deletedAt })
  }

  writePendingDeleted(pending, userId)
}

export async function mergeServerWordsToLocal(serverWords: SyncWord[]) {
  const localWords = await wordStore.getAll()
  const localByText = new Map(localWords.map(w => [w.text.toLowerCase(), w]))

  for (const sw of serverWords) {
    const existing = localByText.get(sw.text.toLowerCase())
    if (existing) {
      if (sw.updatedAt > existing.updatedAt) {
        await wordStore.update(existing.id, {
          definitions: Array.isArray(sw.definitions) ? sw.definitions as Word['definitions'] : existing.definitions,
          pronunciation: sw.pronunciation ?? existing.pronunciation,
          pronunciationAudio: sw.pronunciationAudio ?? existing.pronunciationAudio,
          definitionStatus: sw.definitionStatus,
          examples: sw.examples ?? existing.examples,
        })
      }
    }
    else {
      await wordStore.add(syncWordToLocal(sw))
    }
  }
}

export const syncService = {
  async pushAndMerge(): Promise<SyncResponse | null> {
    if (!authService.isAuthenticated())
      return null

    const localWords = await wordStore.getAll()
    const pendingDeleted = readPendingDeleted()
    const syncWords: SyncWord[] = localWords.map(w => ({
      id: w.id,
      text: w.text,
      definitions: w.definitions,
      pronunciation: w.pronunciation,
      pronunciationAudio: w.pronunciationAudio,
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
          deleted: pendingDeleted,
          lastSyncedAt: this.getLastSyncedAt(),
        }),
      })

      if (!response.ok)
        return null
      const result: SyncResponse = await response.json()

      await mergeServerWordsToLocal(result.words)
      await applyServerDeletedWords(result.deleted)
      localStorage.setItem(getLastSyncKey(), String(result.syncedAt))
      writePendingDeleted([])
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

      await mergeServerWordsToLocal(result.words)
      await applyServerDeletedWords(result.deleted)
      localStorage.setItem(getLastSyncKey(), String(result.syncedAt))
      return result
    }
    catch {
      return null
    }
  },

  getLastSyncedAt(): number | undefined {
    const scoped = localStorage.getItem(getLastSyncKey())
    if (scoped) {
      const value = Number(scoped)
      return Number.isFinite(value) ? value : undefined
    }

    const legacy = localStorage.getItem(LAST_SYNC_KEY)
    if (!legacy)
      return undefined
    const value = Number(legacy)
    if (!Number.isFinite(value))
      return undefined

    localStorage.setItem(getLastSyncKey(), String(value))
    localStorage.removeItem(LAST_SYNC_KEY)
    return value
  },

  clearSyncState(userId?: string): void {
    localStorage.removeItem(getLastSyncKey(userId))
    localStorage.removeItem(getPendingDeletedKey(userId))
    localStorage.removeItem(LAST_SYNC_KEY)
  },
}
