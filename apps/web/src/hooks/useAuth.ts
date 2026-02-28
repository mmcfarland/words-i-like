import type { UserProfile } from '@words/shared'
import { useCallback, useEffect, useState } from 'react'
import { authService } from '../services/auth'

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
    authService.fetchMe().then((profile) => {
      setUser(profile)
      setIsLoading(false)
    }).catch(() => setIsLoading(false))
  }, [])

  const signIn = useCallback(() => {
    window.location.href = authService.getLoginUrl()
  }, [])

  const signOut = useCallback(() => {
    authService.logout()
    setUser(null)
  }, [])

  return {
    isAuthenticated: !!user,
    user,
    isLoading,
    signIn,
    signOut,
  }
}
