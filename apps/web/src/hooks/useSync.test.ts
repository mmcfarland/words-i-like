import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { syncService } from '../services/sync'
import { useSync } from './useSync'

vi.mock('../services/sync', () => ({
  syncService: {
    pushAndMerge: vi.fn(),
    pull: vi.fn(),
  },
}))

describe('useSync', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.mocked(syncService.pushAndMerge).mockReset()
    vi.mocked(syncService.pushAndMerge).mockResolvedValue(null)
    vi.mocked(syncService.pull).mockReset()
    vi.mocked(syncService.pull).mockResolvedValue(null)
  })

  afterEach(() => {
    vi.clearAllTimers()
    vi.useRealTimers()
  })

  it('preserves startup sync behavior (initial push + periodic pull)', () => {
    const { rerender, unmount } = renderHook(
      ({ isAuthenticated }) => useSync(isAuthenticated, undefined, 0),
      { initialProps: { isAuthenticated: false } },
    )

    expect(syncService.pushAndMerge).not.toHaveBeenCalled()

    rerender({ isAuthenticated: true })
    expect(syncService.pushAndMerge).toHaveBeenCalledTimes(1)

    act(() => {
      vi.advanceTimersByTime(60_000)
    })
    expect(syncService.pull).toHaveBeenCalledTimes(1)

    unmount()
  })

  it('debounces push when local authenticated changes happen', () => {
    const { rerender, unmount } = renderHook(
      ({ isAuthenticated, localChangeVersion }) => useSync(isAuthenticated, undefined, localChangeVersion),
      { initialProps: { isAuthenticated: false, localChangeVersion: 2 } },
    )

    rerender({ isAuthenticated: true, localChangeVersion: 2 })
    expect(syncService.pushAndMerge).toHaveBeenCalledTimes(1)

    act(() => {
      vi.advanceTimersByTime(10_000)
    })
    expect(syncService.pushAndMerge).toHaveBeenCalledTimes(1)

    rerender({ isAuthenticated: true, localChangeVersion: 3 })
    rerender({ isAuthenticated: true, localChangeVersion: 4 })

    act(() => {
      vi.advanceTimersByTime(2_999)
    })
    expect(syncService.pushAndMerge).toHaveBeenCalledTimes(1)

    act(() => {
      vi.advanceTimersByTime(1)
    })
    expect(syncService.pushAndMerge).toHaveBeenCalledTimes(2)

    unmount()
  })
})
