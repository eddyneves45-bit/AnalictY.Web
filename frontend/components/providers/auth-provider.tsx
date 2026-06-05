// ============================================================================
// AUTH PROVIDER - iioT AnalictY
// ============================================================================
// Provider para gerenciamento de autenticação estável.
// Relaciona-se com: app/layout.tsx, lib/api/auth.ts
// ============================================================================

'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { API_BASE_URL, apiFetch } from '@/lib/api'

interface User {
  id: number | string
  username: string
  email: string
  full_name?: string
  role: string
  permissions?: string[]
  mfaRequired?: boolean
  mfaEnabled?: boolean
}

interface AuthContextType {
  user: User | null
  token: string | null
  loading: boolean
  isAuthTransitioning: boolean
  login: (username: string, password: string, mfaCode?: string) => Promise<{ mfaRequired?: boolean }>
  logout: () => Promise<void>
  isAuthenticated: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [isAuthTransitioning, setIsAuthTransitioning] = useState(false)
  const [securityNotice, setSecurityNotice] = useState<string | null>(null)

  // Reconstroi a sessao pelo refresh cookie, sem persistir token no navegador.
  useEffect(() => {
    let cancelled = false

    async function restoreSession() {
      try {
        const refreshResponse = await apiFetch(`${API_BASE_URL}/api/auth/refresh`, {
          method: 'POST',
          credentials: 'include',
        })

        if (!refreshResponse.ok) return

        const meResponse = await apiFetch(`${API_BASE_URL}/api/auth/me`)
        if (!meResponse.ok) return

        const meData = await meResponse.json().catch(() => ({}))
        const restoredUser = meData.user ?? meData
        if (restoredUser?.role) restoredUser.role = restoredUser.role.toLowerCase()

        if (!cancelled) {
          setToken('cookie-session')
          setUser(restoredUser)
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    restoreSession()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    function handleUnauthorized() {
      setToken(null)
      setUser(null)
      router.replace('/')
    }

    window.addEventListener('auth:unauthorized', handleUnauthorized)
    return () => {
      window.removeEventListener('auth:unauthorized', handleUnauthorized)
    }
  }, [router])

  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout> | null = null

    function handleForbidden() {
      setSecurityNotice('Usuário sem privilégio. Contate o administrador.')
      if (timeoutId) clearTimeout(timeoutId)
      timeoutId = setTimeout(() => setSecurityNotice(null), 5000)
    }

    window.addEventListener('auth:forbidden', handleForbidden)
    return () => {
      if (timeoutId) clearTimeout(timeoutId)
      window.removeEventListener('auth:forbidden', handleForbidden)
    }
  }, [])

  const login = async (username: string, password: string, mfaCode?: string) => {
    setIsAuthTransitioning(true)
    console.log('login: Iniciando', { username })
    
    try {
      const response = await apiFetch(`${API_BASE_URL}/api/auth/login`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password, mfaCode })
      })

      const data = await response.json().catch(() => ({}))
      console.log('login: Resposta login', { ok: response.ok, data })

      if (response.ok && data?.mfaRequired) {
        return { mfaRequired: true }
      }

      if (response.ok) {
        const meResponse = await apiFetch(`${API_BASE_URL}/api/auth/me`)

        const meData = await meResponse.json().catch(() => ({}))
        console.log('login: Resposta /me', { ok: meResponse.ok, meData })

        if (!meResponse.ok) {
          throw new Error(meData.message || meData.detail || 'Falha ao carregar usuário')
        }

        const authenticatedUser = meData.user ?? meData
        if (authenticatedUser?.role) {
          authenticatedUser.role = authenticatedUser.role.toLowerCase()
        }

        setToken('cookie-session')
        setUser(authenticatedUser)
        console.log('login: Autenticação concluída')
        return {}
      } else {
        console.error('login: Falha no login', data.message || data.detail)
        throw new Error(data.message || data.detail || 'Falha no login')
      }
    } finally {
      setIsAuthTransitioning(false)
    }
  }

  const logout = async () => {
    console.log('auth: Iniciando logout')
    
    try {
      await apiFetch(`${API_BASE_URL}/api/auth/logout`, {
        method: 'POST',
      })
      setToken(null)
      setUser(null)
      console.log('auth: Logout concluído')
    } catch (err) {
      console.error('auth: Erro no logout', err)
    }
  }

  return (
    <AuthContext.Provider value={{ user, token, loading, isAuthTransitioning, login, logout, isAuthenticated: !!user && !!token }}>
      {securityNotice && (
        <div className="fixed right-5 top-5 z-[100] max-w-sm rounded-lg border border-red-200 bg-white px-4 py-3 text-sm font-medium text-red-700 shadow-lg">
          {securityNotice}
        </div>
      )}
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
