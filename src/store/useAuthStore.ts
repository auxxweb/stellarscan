import { create } from 'zustand'
import { loginCredentials } from '../data/loginCredentials'

const AUTH_STORAGE_KEY = 'stellar-auth-session'

function readStoredSession(): { email: string } | null {
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY)
    if (!raw) return null
    const p = JSON.parse(raw) as { email?: string }
    if (p.email && typeof p.email === 'string') return { email: p.email }
  } catch {
    localStorage.removeItem(AUTH_STORAGE_KEY)
  }
  return null
}

const initialSession = readStoredSession()

interface AuthState {
  email: string | null
  isAuthenticated: boolean
  login: (email: string, password: string) => boolean
  logout: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  email: initialSession?.email ?? null,
  isAuthenticated: !!initialSession,

  login: (email, password) => {
    const e = email.trim().toLowerCase()
    const ok =
      e === loginCredentials.email.trim().toLowerCase() && password === loginCredentials.password
    if (!ok) return false
    const session = { email: loginCredentials.email }
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session))
    set({ email: session.email, isAuthenticated: true })
    return true
  },

  logout: () => {
    localStorage.removeItem(AUTH_STORAGE_KEY)
    set({ email: null, isAuthenticated: false })
  },
}))
