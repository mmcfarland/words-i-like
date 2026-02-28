import type { Word } from '@words/shared'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { db } from './schema'
import { wordStore } from './wordStore'
import 'fake-indexeddb/auto'

function makeWord(overrides: Partial<Word> = {}): Word {
  const now = Date.now()
  return {
    id: `test-${now}-${Math.random()}`,
    text: 'ephemeral',
    definitions: [{
      partOfSpeech: 'adjective',
      definitions: [{ definition: 'Lasting briefly.', synonyms: [], antonyms: [] }],
      synonyms: [],
      antonyms: [],
    }],
    pronunciation: '/test/',
    definitionStatus: 'found',
    createdAt: now,
    updatedAt: now,
    ...overrides,
  }
}

beforeEach(async () => {
  await db.words.clear()
})

afterEach(async () => {
  await db.words.clear()
})

describe('wordStore', () => {
  it('adds and retrieves a word', async () => {
    const word = makeWord()
    await wordStore.add(word)
    const all = await wordStore.getAll()
    expect(all).toHaveLength(1)
    expect(all[0].text).toBe('ephemeral')
  })

  it('returns words in reverse chronological order', async () => {
    await wordStore.add(makeWord({ id: 'w1', text: 'first', createdAt: 1000 }))
    await wordStore.add(makeWord({ id: 'w2', text: 'second', createdAt: 2000 }))
    await wordStore.add(makeWord({ id: 'w3', text: 'third', createdAt: 3000 }))
    const all = await wordStore.getAll()
    expect(all.map(w => w.text)).toEqual(['third', 'second', 'first'])
  })

  it('finds word by text (case-insensitive)', async () => {
    await wordStore.add(makeWord({ text: 'Ephemeral' }))
    const found = await wordStore.findByText('ephemeral')
    expect(found).toBeDefined()
    expect(found!.text).toBe('Ephemeral')
  })

  it('returns undefined for non-existent word', async () => {
    const found = await wordStore.findByText('nonexistent')
    expect(found).toBeUndefined()
  })

  it('updates a word', async () => {
    const word = makeWord({ id: 'update-test' })
    await wordStore.add(word)
    await wordStore.update('update-test', { definitionStatus: 'found' })
    const all = await wordStore.getAll()
    expect(all[0].definitionStatus).toBe('found')
  })

  it('deletes a word', async () => {
    const word = makeWord({ id: 'delete-test' })
    await wordStore.add(word)
    await wordStore.delete('delete-test')
    const all = await wordStore.getAll()
    expect(all).toHaveLength(0)
  })

  it('gets pending words only', async () => {
    await wordStore.add(makeWord({ id: 'w1', definitionStatus: 'found' }))
    await wordStore.add(makeWord({ id: 'w2', definitionStatus: 'pending' }))
    await wordStore.add(makeWord({ id: 'w3', definitionStatus: 'not_found' }))
    const pending = await wordStore.getPending()
    expect(pending).toHaveLength(1)
    expect(pending[0].id).toBe('w2')
  })
})
