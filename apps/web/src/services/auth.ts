import type { UserProfile } from '@words/shared'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001'
const TOKEN_KEY = 'words-auth-token'
const USER_KEY = 'words-auth-user'

export const authService = {
  getToken(): string | null {
    return localStorage.getItem(TOKEN_KEY)
  },

  getUser(): UserProfile | null {
    const stored = localStorage.getItem(USER_KEY)
    return stored ? JSON.parse(stored) : null
  },

  setAuth(token: string, user: UserProfile): void {
    localStorage.setItem(TOKEN_KEY, token)
    localStorage.setItem(USER_KEY, JSON.stringify(user))
  },

  clearAuth(): void {
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(USER_KEY)
  },

  isAuthenticated(): boolean {
    return !!this.getToken()
  },

  getAuthHeaders(): Record<string, string> {
    const token = this.getToken()
    return token ? { Authorization: `Bearer ${token}` } : {}
  },

  getLoginUrl(): string {
    return `${API_URL}/auth/google`
  },

  async fetchMe(): Promise<UserProfile | null> {
    const token = this.getToken()
    if (!token)
      return null

    try {
      const response = await fetch(`${API_URL}/auth/me`, {
        headers: this.getAuthHeaders(),
      })
      if (!response.ok) {
        this.clearAuth()
        return null
      }
      return response.json()
    }
    catch {
      return null
    }
  },

  async devLogin(displayName?: string): Promise<{ token: string, user: UserProfile } | null> {
    try {
      const response = await fetch(`${API_URL}/auth/dev-login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ displayName }),
      })
      if (!response.ok)
        return null
      const data = await response.json()
      this.setAuth(data.token, data.user)
      return data
    }
    catch {
      return null
    }
  },

  logout(): void {
    this.clearAuth()
  },
}
