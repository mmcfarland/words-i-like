import type { Word } from '@words/shared'
import type { WordRecord } from './schema'
import { db } from './schema'

function toWord(record: WordRecord): Word {
  return {
    id: record.id,
    text: record.text,
    definitions: record.definitions,
    pronunciation: record.pronunciation,
    pronunciationAudio: record.pronunciationAudio,
    definitionStatus: record.definitionStatus,
    examples: record.examples,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  }
}

export const wordStore = {
  async add(word: Word): Promise<void> {
    await db.words.add({
      id: word.id,
      text: word.text,
      definitions: word.definitions,
      pronunciation: word.pronunciation,
      pronunciationAudio: word.pronunciationAudio,
      definitionStatus: word.definitionStatus,
      examples: word.examples,
      createdAt: word.createdAt,
      updatedAt: word.updatedAt,
    })
  },

  async getAll(): Promise<Word[]> {
    const records = await db.words.orderBy('createdAt').reverse().toArray()
    return records.map(toWord)
  },

  async update(id: string, changes: Partial<WordRecord>): Promise<void> {
    await db.words.update(id, { ...changes, updatedAt: Date.now() })
  },

  async delete(id: string): Promise<void> {
    await db.words.delete(id)
  },

  async findByText(text: string): Promise<Word | undefined> {
    const record = await db.words.where('text').equalsIgnoreCase(text).first()
    return record ? toWord(record) : undefined
  },

  async getPending(): Promise<Word[]> {
    const records = await db.words.where('definitionStatus').equals('pending').toArray()
    return records.map(toWord)
  },
}
