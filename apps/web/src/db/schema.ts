import type { DefinitionStatus, DictionaryMeaning } from '@words/shared'
import type { EntityTable } from 'dexie'
import Dexie from 'dexie'

export interface WordRecord {
  id: string
  text: string
  definitions: DictionaryMeaning[]
  pronunciation?: string
  pronunciationAudio?: string
  definitionStatus: DefinitionStatus
  examples?: string[]
  sourceUrl?: string
  createdAt: number
  updatedAt: number
  syncedAt?: number
  dirty?: boolean
}

export interface ListRecord {
  id: string
  name: string
  createdAt: number
  updatedAt: number
}

export interface WordListRecord {
  wordId: string
  listId: string
}

export class WordsDatabase extends Dexie {
  words!: EntityTable<WordRecord, 'id'>
  lists!: EntityTable<ListRecord, 'id'>
  wordLists!: EntityTable<WordListRecord, 'wordId'>

  constructor() {
    super('words-i-like')
    this.version(1).stores({
      words: 'id, text, createdAt, definitionStatus',
    })
    this.version(2).stores({
      words: 'id, text, createdAt, definitionStatus, dirty',
    })
    this.version(3).stores({
      words: 'id, text, createdAt, definitionStatus, dirty',
      lists: 'id, name, createdAt',
      wordLists: '[wordId+listId], wordId, listId',
    })
  }
}

export const db = new WordsDatabase()
