export type DefinitionStatus = 'found' | 'not_found' | 'pending'

export interface DictionaryPhonetic {
  text?: string
  audio?: string
}

export interface DictionaryDefinition {
  definition: string
  example?: string
  synonyms: string[]
  antonyms: string[]
}

export interface DictionaryMeaning {
  partOfSpeech: string
  definitions: DictionaryDefinition[]
  synonyms: string[]
  antonyms: string[]
}

export interface DictionaryEntry {
  word: string
  phonetic?: string
  phonetics: DictionaryPhonetic[]
  meanings: DictionaryMeaning[]
}

export interface Word {
  id: string
  text: string
  definitions: DictionaryMeaning[]
  pronunciation?: string
  pronunciationAudio?: string
  definitionStatus: DefinitionStatus
  examples?: string[]
  sourceUrl?: string
  shareToken?: string
  createdAt: number
  updatedAt: number
}
