import { create } from 'zustand'

interface User {
  id: string
  tenant_id: string
  email: string
  full_name: string
  role: string
  preferred_currency: string
  preferred_language: string
  phone?: string
  profile_image_url?: string
  created_at?: string
}

interface AuthState {
  user: User | null
  token: string | null
  setAuth: (user: User, token: string) => void
  clearAuth: () => void
  isAuthenticated: () => boolean
}

// Helper functions for localStorage
const getUserFromStorage = (): User | null => {
  if (typeof window === 'undefined') return null
  try {
    const userStr = localStorage.getItem('user')
    return userStr ? JSON.parse(userStr) : null
  } catch {
    return null
  }
}

const getTokenFromStorage = (): string | null => {
  if (typeof window === 'undefined') return null
  return localStorage.getItem('auth_token')
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: getUserFromStorage(),
  token: getTokenFromStorage(),
  setAuth: (user, token) => {
    set({ user, token })
    localStorage.setItem('user', JSON.stringify(user))
    localStorage.setItem('auth_token', token)
  },
  clearAuth: () => {
    set({ user: null, token: null })
    localStorage.removeItem('user')
    localStorage.removeItem('auth_token')
  },
  isAuthenticated: () => !!getTokenFromStorage(),
}))
