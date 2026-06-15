import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { User } from '../types'
import { api } from '../api/client'

interface AuthContextValue {
  user: User | null
  token: string | null
  viewAsAdmin: boolean
  isLoading: boolean
  login: (email: string, password: string) => Promise<void>
  signup: (displayName: string, email: string, password: string) => Promise<void>
  logout: () => void
  toggleViewAsAdmin: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [viewAsAdmin, setViewAsAdmin] = useState(true)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const stored = localStorage.getItem('meshex_token')
    const storedUser = localStorage.getItem('meshex_user')
    if (stored && storedUser) {
      setToken(stored)
      setUser(JSON.parse(storedUser))
      api.defaults.headers.common['Authorization'] = `Bearer ${stored}`
    }
    setIsLoading(false)
  }, [])

  const login = async (email: string, password: string) => {
    const res = await api.post('/api/auth/login', { email, password })
    const { access_token, user: userData } = res.data
    setToken(access_token)
    setUser(userData)
    setViewAsAdmin(userData.role === 'admin')
    localStorage.setItem('meshex_token', access_token)
    localStorage.setItem('meshex_user', JSON.stringify(userData))
    api.defaults.headers.common['Authorization'] = `Bearer ${access_token}`
  }

  const signup = async (displayName: string, email: string, password: string) => {
    const res = await api.post('/api/auth/signup', { displayName, email, password })
    const { access_token, user: userData } = res.data
    setToken(access_token)
    setUser(userData)
    setViewAsAdmin(true)
    localStorage.setItem('meshex_token', access_token)
    localStorage.setItem('meshex_user', JSON.stringify(userData))
    api.defaults.headers.common['Authorization'] = `Bearer ${access_token}`
  }

  const logout = () => {
    setUser(null)
    setToken(null)
    localStorage.removeItem('meshex_token')
    localStorage.removeItem('meshex_user')
    delete api.defaults.headers.common['Authorization']
  }

  const toggleViewAsAdmin = () => setViewAsAdmin(v => !v)

  return (
    <AuthContext.Provider value={{ user, token, viewAsAdmin, isLoading, login, signup, logout, toggleViewAsAdmin }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
