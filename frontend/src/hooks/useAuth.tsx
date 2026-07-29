import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'
import type { User, AuthResponse } from '../types'
import { persistAuth, clearAuth, getStoredUser, getStoredToken } from '../services/auth.service'
import type { QueryClient } from '@tanstack/react-query'

interface AuthContextType {
  user: User | null
  token: string | null
  isAuthenticated: boolean
  login: (response: AuthResponse) => void
  logout: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children, queryClient }: { children: ReactNode; queryClient: QueryClient }) {
  const [user, setUser] = useState<User | null>(getStoredUser)
  const [token, setToken] = useState<string | null>(getStoredToken)

  const login = useCallback((response: AuthResponse) => {
    persistAuth(response)
    setUser(response.user)
    setToken(response.token)
  }, [])

  const logout = useCallback(() => {
    clearAuth()
    setUser(null)
    setToken(null)
    queryClient.clear()
  }, [queryClient])

  return (
    <AuthContext.Provider
      value={{ user, token, isAuthenticated: !!token && !!user, login, logout }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
