import type { DefinitionStatus, DictionaryMeaning } from '@words/shared'
import type { EntityTable } from 'dexie'
import Dexie from 'dexie'

export interface WordRecord {
  id: string
  text: string
  definitions: DictionaryMeaning[]
  pronunciation?: string
  definitionStatus: DefinitionStatus
  examples?: string[]
  createdAt: number
  updatedAt: number
  syncedAt?: number
  dirty?: boolean
}

export class WordsDatabase extends Dexie {
  words!: EntityTable<WordRecord, 'id'>

  constructor() {
    super('words-i-like')
    this.version(1).stores({
      words: 'id, text, createdAt, definitionStatus',
    })
    this.version(2).stores({
      words: 'id, text, createdAt, definitionStatus, dirty',
    })
  }
}

export const db = new WordsDatabase()
