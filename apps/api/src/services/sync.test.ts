import { DEFINITION_STATUS_RANK } from '@words/shared'
import { describe, expect, it } from 'vitest'

describe('sync merge logic', () => {
  it('ranks found > not_found > pending', () => {
    expect(DEFINITION_STATUS_RANK.found).toBeGreaterThan(DEFINITION_STATUS_RANK.not_found)
    expect(DEFINITION_STATUS_RANK.not_found).toBeGreaterThan(DEFINITION_STATUS_RANK.pending)
  })

  it('found beats pending', () => {
    const best = DEFINITION_STATUS_RANK.found >= DEFINITION_STATUS_RANK.pending ? 'found' : 'pending'
    expect(best).toBe('found')
  })

  it('not_found beats pending', () => {
    const best = DEFINITION_STATUS_RANK.not_found >= DEFINITION_STATUS_RANK.pending ? 'not_found' : 'pending'
    expect(best).toBe('not_found')
  })
})
