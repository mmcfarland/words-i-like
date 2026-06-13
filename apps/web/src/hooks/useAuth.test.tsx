import type { UserProfile } from '@words/shared'
import { renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useAuth } from './useAuth'

const mockAuthService = vi.hoisted(() => ({
  getUser: vi.fn(),
  setAuth: vi.fn(),
  setToken: vi.fn(),
  clearAuth: vi.fn(),
  fetchMe: vi.fn(),
  getLoginUrl: vi.fn(() => 'http://localhost:3001/auth/google'),
  logout: vi.fn(),
}))

const mockWordStore = vi.hoisted(() => ({
  clearAll: vi.fn(),
}))

const mockListStore = vi.hoisted(() => ({
  clearAll: vi.fn(),
}))

const mockSyncService = vi.hoisted(() => ({
  clearSyncState: vi.fn(),
}))

vi.mock('../services/auth', () => ({
  authService: mockAuthService,
}))

vi.mock('../db', () => ({
  wordStore: mockWordStore,
  listStore: mockListStore,
}))

vi.mock('../services/sync', () => ({
  syncService: mockSyncService,
}))

const PROFILE: UserProfile = {
  id: 'user-1',
  googleId: 'google-1',
  displayName: 'Test User',
  avatarUrl: null,
}

describe('useAuth OAuth callback handling', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockAuthService.getUser.mockReturnValue(null)
    mockAuthService.fetchMe.mockResolvedValue(null)
    mockWordStore.clearAll.mockResolvedValue(undefined)
    mockListStore.clearAll.mockResolvedValue(undefined)
    window.history.replaceState({}, '', '/')
  })

  it('reads auth token from hash fragment and clears URL state', async () => {
    mockAuthService.fetchMe.mockResolvedValue(PROFILE)
    window.history.replaceState({}, '', '/auth/callback#auth_token=token-123')

    const { result } = renderHook(() => useAuth())

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(mockAuthService.setToken).toHaveBeenCalledWith('token-123')
    expect(mockAuthService.setAuth).toHaveBeenCalledWith('token-123', PROFILE)
    expect(result.current.user).toEqual(PROFILE)
    expect(window.location.hash).toBe('')
    expect(window.location.search).toBe('')
  })

  it('clears stale auth state when callback contains auth_error', async () => {
    mockAuthService.getUser.mockReturnValue(PROFILE)
    window.history.replaceState({}, '', '/auth/callback#auth_error=token_exchange_failed')

    const { result } = renderHook(() => useAuth())

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(mockAuthService.clearAuth).toHaveBeenCalled()
    expect(mockAuthService.fetchMe).not.toHaveBeenCalled()
    expect(result.current.user).toBeNull()
    expect(window.location.hash).toBe('')
  })

  it('clears stale auth state when callback token cannot load profile', async () => {
    mockAuthService.getUser.mockReturnValue(PROFILE)
    mockAuthService.fetchMe.mockResolvedValue(null)
    window.history.replaceState({}, '', '/auth/callback#auth_token=bad-token')

    const { result } = renderHook(() => useAuth())

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(mockAuthService.clearAuth).toHaveBeenCalled()
    expect(result.current.user).toBeNull()
  })

  it('keeps the stored session when the server is unreachable on startup', async () => {
    mockAuthService.getUser.mockReturnValue(PROFILE)
    mockAuthService.fetchMe.mockRejectedValue(new Error('offline'))

    const { result } = renderHook(() => useAuth())

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.user).toEqual(PROFILE)
    expect(result.current.isAuthenticated).toBe(true)
    expect(mockAuthService.clearAuth).not.toHaveBeenCalled()
  })

  it('signs out when the server rejects the stored token on startup', async () => {
    mockAuthService.getUser.mockReturnValue(PROFILE)
    mockAuthService.fetchMe.mockResolvedValue(null)

    const { result } = renderHook(() => useAuth())

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.user).toBeNull()
    expect(mockAuthService.clearAuth).toHaveBeenCalled()
  })

  it('clears local stores and scoped sync state on sign out', async () => {
    mockAuthService.getUser.mockReturnValue(PROFILE)
    mockAuthService.fetchMe.mockResolvedValue(PROFILE)

    const { result } = renderHook(() => useAuth())

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    result.current.signOut()

    await waitFor(() => {
      expect(mockWordStore.clearAll).toHaveBeenCalled()
      expect(mockListStore.clearAll).toHaveBeenCalled()
      expect(mockSyncService.clearSyncState).toHaveBeenCalledWith('user-1')
      expect(mockAuthService.logout).toHaveBeenCalled()
      expect(result.current.user).toBeNull()
    })
  })
})
