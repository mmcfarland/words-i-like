import type { UserProfile } from '@words/shared'
import { useCallback, useEffect, useState } from 'react'
import { listStore, wordStore } from '../db'
import { analytics } from '../services/analytics'
import { authService } from '../services/auth'
import { syncService } from '../services/sync'

export interface UseAuthResult {
  isAuthenticated: boolean
  user: UserProfile | null
  isLoading: boolean
  signIn: () => void
  signOut: () => void
}

export function useAuth(): UseAuthResult {
  const [user, setUser] = useState<UserProfile | null>(authService.getUser())
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Check for OAuth callback token in URL
    const queryParams = new URLSearchParams(window.location.search)
    const hashParams = new URLSearchParams(window.location.hash.slice(1))
    const authToken = hashParams.get('auth_token') || queryParams.get('auth_token')
    const authError = hashParams.get('auth_error') || queryParams.get('auth_error')

    if (authError) {
      console.error('Auth error:', authError)
      authService.clearAuth()
      setUser(null)
      window.history.replaceState({}, '', window.location.pathname)
      setIsLoading(false)
      return
    }

    if (authToken) {
      // Store token, clean URL, then fetch profile
      authService.setToken(authToken)
      window.history.replaceState({}, '', window.location.pathname)

      authService.fetchMe().then((profile) => {
        if (profile) {
          authService.setAuth(authToken, profile)
          setUser(profile)
          analytics.signedIn()
        }
        else {
          authService.clearAuth()
          setUser(null)
        }
        setIsLoading(false)
      }).catch(() => {
        authService.clearAuth()
        setUser(null)
        setIsLoading(false)
      })
      return
    }

    // Normal startup — check existing session and refresh stored profile.
    // If the server is unreachable (offline / transient error) fetchMe rejects,
    // and we keep the locally stored session so login feels persistent.
    authService.fetchMe().then((profile) => {
      if (profile) {
        const token = authService.getToken()
        if (token)
          authService.setAuth(token, profile)
        setUser(profile)
      }
      else {
        // Definitive auth rejection (401/403) — fetchMe already cleared storage.
        authService.clearAuth()
        setUser(null)
      }
      setIsLoading(false)
    }).catch(() => setIsLoading(false))
  }, [])

  const signIn = useCallback(() => {
    window.location.href = authService.getLoginUrl()
  }, [])

  const signOut = useCallback(() => {
    analytics.signedOut()
    const activeUserId = user?.id ?? authService.getUser()?.id
    void (async () => {
      await Promise.all([wordStore.clearAll(), listStore.clearAll()]).catch(() => undefined)
      if (activeUserId)
        syncService.clearSyncState(activeUserId)
      authService.logout()
      setUser(null)
    })()
  }, [user])

  return {
    isAuthenticated: !!user,
    user,
    isLoading,
    signIn,
    signOut,
  }
}
