import type { ListRecord } from './schema'
import { db } from './schema'

export const listStore = {
  async add(list: ListRecord): Promise<void> {
    await db.lists.add(list)
  },

  async getAll(): Promise<ListRecord[]> {
    return db.lists.orderBy('createdAt').toArray()
  },

  async update(id: string, changes: Partial<ListRecord>): Promise<void> {
    await db.lists.update(id, { ...changes, updatedAt: Date.now() })
  },

  async delete(id: string): Promise<void> {
    await db.transaction('rw', [db.lists, db.wordLists], async () => {
      await db.wordLists.where('listId').equals(id).delete()
      await db.lists.delete(id)
    })
  },

  async assignWord(wordId: string, listId: string): Promise<void> {
    await db.wordLists.put({ wordId, listId })
  },

  async removeWord(wordId: string, listId: string): Promise<void> {
    await db.wordLists.where({ wordId, listId }).delete()
  },

  async getListsForWord(wordId: string): Promise<string[]> {
    const entries = await db.wordLists.where('wordId').equals(wordId).toArray()
    return entries.map(e => e.listId)
  },

  async getWordIdsForList(listId: string): Promise<string[]> {
    const entries = await db.wordLists.where('listId').equals(listId).toArray()
    return entries.map(e => e.wordId)
  },
}
