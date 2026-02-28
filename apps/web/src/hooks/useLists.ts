import type { ListRecord } from '../db'
import { useCallback, useEffect, useState } from 'react'
import { listStore } from '../db'

let nextListId = 0
function generateListId(): string {
  return `list-${Date.now()}-${nextListId++}`
}

export interface ListsResult {
  lists: ListRecord[]
  createList: (name: string) => Promise<ListRecord>
  deleteList: (id: string) => void
  assignWordToList: (wordId: string, listId: string) => Promise<void>
  removeWordFromList: (wordId: string, listId: string) => Promise<void>
  getListsForWord: (wordId: string) => Promise<string[]>
  getWordIdsForList: (listId: string) => Promise<string[]>
  refreshLists: () => Promise<void>
}

export function useLists(): ListsResult {
  const [lists, setLists] = useState<ListRecord[]>([])

  const refreshLists = useCallback(async () => {
    const stored = await listStore.getAll()
    setLists(stored)
  }, [])

  useEffect(() => {
    refreshLists()
  }, [refreshLists])

  const createList = useCallback(async (name: string): Promise<ListRecord> => {
    const now = Date.now()
    const record: ListRecord = {
      id: generateListId(),
      name: name.trim(),
      createdAt: now,
      updatedAt: now,
    }
    await listStore.add(record)
    setLists(prev => [...prev, record])
    return record
  }, [])

  const deleteList = useCallback(async (id: string) => {
    await listStore.delete(id)
    setLists(prev => prev.filter(l => l.id !== id))
  }, [])

  const assignWordToList = useCallback(async (wordId: string, listId: string) => {
    await listStore.assignWord(wordId, listId)
  }, [])

  const removeWordFromList = useCallback(async (wordId: string, listId: string) => {
    await listStore.removeWord(wordId, listId)
  }, [])

  const getListsForWord = useCallback(async (wordId: string): Promise<string[]> => {
    return listStore.getListsForWord(wordId)
  }, [])

  const getWordIdsForList = useCallback(async (listId: string): Promise<string[]> => {
    return listStore.getWordIdsForList(listId)
  }, [])

  return {
    lists,
    createList,
    deleteList,
    assignWordToList,
    removeWordFromList,
    getListsForWord,
    getWordIdsForList,
    refreshLists,
  }
}
