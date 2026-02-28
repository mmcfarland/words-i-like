export interface UserProfile {
  id: string
  googleId: string
  displayName: string
  avatarUrl: string | null
}

export interface TokenPayload {
  userId: string
  email?: string
}

export interface AuthState {
  isAuthenticated: boolean
  user: UserProfile | null
  token: string | null
}
