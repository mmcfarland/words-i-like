import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { listStore } from './listStore'
import { db } from './schema'
import 'fake-indexeddb/auto'

function makeList(overrides: Partial<{ id: string, name: string }> = {}) {
  const now = Date.now()
  return {
    id: overrides.id ?? `list-${now}-${Math.random()}`,
    name: overrides.name ?? 'Test List',
    createdAt: now,
    updatedAt: now,
  }
}

beforeEach(async () => {
  await db.lists.clear()
  await db.wordLists.clear()
})

afterEach(async () => {
  await db.lists.clear()
  await db.wordLists.clear()
})

describe('listStore', () => {
  it('adds and retrieves a list', async () => {
    const list = makeList({ name: 'Favorites' })
    await listStore.add(list)
    const all = await listStore.getAll()
    expect(all).toHaveLength(1)
    expect(all[0].name).toBe('Favorites')
  })

  it('returns lists in chronological order', async () => {
    await listStore.add(makeList({ id: 'l1', name: 'First' }))
    await listStore.add(makeList({ id: 'l2', name: 'Second' }))
    const all = await listStore.getAll()
    expect(all.map(l => l.name)).toEqual(['First', 'Second'])
  })

  it('updates a list name', async () => {
    await listStore.add(makeList({ id: 'l1', name: 'Old' }))
    await listStore.update('l1', { name: 'New' })
    const all = await listStore.getAll()
    expect(all[0].name).toBe('New')
  })

  it('deletes a list and its word associations', async () => {
    await listStore.add(makeList({ id: 'l1', name: 'Delete Me' }))
    await listStore.assignWord('w1', 'l1')
    await listStore.delete('l1')
    const all = await listStore.getAll()
    expect(all).toHaveLength(0)
    const wordLists = await listStore.getListsForWord('w1')
    expect(wordLists).toHaveLength(0)
  })

  it('assigns and retrieves word-list associations', async () => {
    await listStore.add(makeList({ id: 'l1', name: 'List A' }))
    await listStore.add(makeList({ id: 'l2', name: 'List B' }))
    await listStore.assignWord('w1', 'l1')
    await listStore.assignWord('w1', 'l2')

    const lists = await listStore.getListsForWord('w1')
    expect(lists).toHaveLength(2)
    expect(lists).toContain('l1')
    expect(lists).toContain('l2')
  })

  it('gets word IDs for a list', async () => {
    await listStore.add(makeList({ id: 'l1', name: 'My List' }))
    await listStore.assignWord('w1', 'l1')
    await listStore.assignWord('w2', 'l1')
    await listStore.assignWord('w3', 'l1')

    const wordIds = await listStore.getWordIdsForList('l1')
    expect(wordIds).toHaveLength(3)
    expect(wordIds).toContain('w1')
    expect(wordIds).toContain('w2')
    expect(wordIds).toContain('w3')
  })

  it('removes a word from a list', async () => {
    await listStore.add(makeList({ id: 'l1', name: 'List' }))
    await listStore.assignWord('w1', 'l1')
    await listStore.removeWord('w1', 'l1')

    const lists = await listStore.getListsForWord('w1')
    expect(lists).toHaveLength(0)
  })

  it('handles multiple lists per word correctly', async () => {
    await listStore.add(makeList({ id: 'l1', name: 'A' }))
    await listStore.add(makeList({ id: 'l2', name: 'B' }))
    await listStore.assignWord('w1', 'l1')
    await listStore.assignWord('w1', 'l2')

    // Remove from one list, still in other
    await listStore.removeWord('w1', 'l1')
    const lists = await listStore.getListsForWord('w1')
    expect(lists).toEqual(['l2'])
  })
})
