import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'
import type { User } from '../types'
import { auth, guides } from '../services/api'
import { getLatestGuestDraft, deleteGuestDraft, type GuestDraft } from '../utils/guestDrafts'

interface AuthContextType {
  user: User | null
  isLoading: boolean
  isAuthenticated: boolean
  // True whenever there is no signed-in user — used to offer local drafts.
  isGuest: boolean
  login: (email: string, password: string) => Promise<{ published: number; failed: number }>
  register: (data: { email: string; password: string; username: string; displayName: string }) => Promise<{ published: number; failed: number }>
  logout: () => void
}

const AuthContext = createContext<AuthContextType | null>(null)

// Posts whatever the visitor built while signed out. A draft that the API
// rejects (or that is incomplete, e.g. fewer than two stops) stays on the
// device so it is not silently lost.
async function uploadGuestDrafts(): Promise<{ published: number; failed: number }> {
  let published = 0
  let failed = 0
  const draft = await getLatestGuestDraft().catch(() => null)
  if (!draft) return { published, failed }
  try {
    const { id, savedAt, ...payload } = draft as GuestDraft
    void id; void savedAt
    await guides.create(payload as never)
    await deleteGuestDraft(draft.id)
    published++
  } catch {
    failed++
  }
  return { published, failed }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const handleLogout = () => setUser(null)
    window.addEventListener('auth:logout', handleLogout)
    return () => window.removeEventListener('auth:logout', handleLogout)
  }, [])

  useEffect(() => {
    const token = localStorage.getItem('accessToken')
    if (token) {
      auth.me()
        .then((res) => setUser(res.data))
        .catch(() => {
          localStorage.removeItem('accessToken')
          localStorage.removeItem('refreshToken')
          setUser(null)
        })
        .finally(() => setIsLoading(false))
    } else {
      setIsLoading(false)
    }
  }, [])

  const login = async (email: string, password: string) => {
    const res = await auth.login({ email, password })
    localStorage.setItem('accessToken', res.data.accessToken)
    localStorage.setItem('refreshToken', res.data.refreshToken)
    setUser(res.data.user)
    // Logging in also ends the guest session, so publish any local draft.
    return uploadGuestDrafts()
  }

  const register = async (data: { email: string; password: string; username: string; displayName: string }) => {
    const res = await auth.register(data)
    localStorage.setItem('accessToken', res.data.accessToken)
    localStorage.setItem('refreshToken', res.data.refreshToken)
    setUser(res.data.user)
    return uploadGuestDrafts()
  }

  const logout = () => {
    localStorage.removeItem('accessToken')
    localStorage.removeItem('refreshToken')
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, isLoading, isAuthenticated: !!user, isGuest: !user, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within AuthProvider')
  return context
}
