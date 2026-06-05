// ============================================================================
// LOGIN MODAL - iioT AnalictY
// ============================================================================
// Modal de login com formulário.
// Relaciona-se com: components/landing/landing-page.tsx, components/providers/auth-provider.tsx
// ============================================================================

'use client'

import React, { useState } from 'react'
import { useAuth } from '@/components/providers/auth-provider'

interface LoginModalProps {
  isOpen: boolean
  onClose: () => void
}

export function LoginModal({ isOpen, onClose }: LoginModalProps) {
  const { login, isAuthTransitioning } = useAuth()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [mfaCode, setMfaCode] = useState('')
  const [mfaRequired, setMfaRequired] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    
    try {
      const result = await login(username, password, mfaRequired ? mfaCode : undefined)
      if (result.mfaRequired) {
        setMfaRequired(true)
        setMfaCode('')
        setError('')
        return
      }
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Usuário ou senha incorretos')
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 animate-in fade-in duration-300">
      <div className="bg-white p-8 rounded-2xl w-full max-w-md shadow-2xl border border-gray-200 animate-in zoom-in duration-300 text-center">
        <h2 className="text-3xl font-bold text-gray-900 mb-2">Acesso ao Sistema</h2>
        <p className="text-gray-600 mb-6">Entre com suas credenciais para acessar a plataforma</p>
        
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl mb-6">
            {error}
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-gray-700 font-medium mb-2">Usuário</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-4 py-3 bg-gray-50 text-gray-900 rounded-xl border border-gray-300 focus:border-red-500 focus:ring-2 focus:ring-red-200 transition-all outline-none"
              placeholder="Digite seu usuário"
              required
            />
          </div>
          
          <div>
            <label className="block text-gray-700 font-medium mb-2">Senha</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 bg-gray-50 text-gray-900 rounded-xl border border-gray-300 focus:border-red-500 focus:ring-2 focus:ring-red-200 transition-all outline-none"
              placeholder="Digite sua senha"
              required
            />
          </div>

          {mfaRequired && (
            <div>
              <label className="block text-gray-700 font-medium mb-2">Código MFA</label>
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                value={mfaCode}
                onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                className="w-full px-4 py-3 bg-gray-50 text-gray-900 rounded-xl border border-gray-300 focus:border-red-500 focus:ring-2 focus:ring-red-200 transition-all outline-none text-center tracking-[0.3em]"
                placeholder="000000"
                required
              />
            </div>
          )}
          
          <div className="flex gap-4 pt-2">
            <button
              type="submit"
              disabled={isAuthTransitioning}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white rounded-xl font-semibold transition-all duration-300 shadow-lg shadow-red-600/30 hover:shadow-red-600/50 hover:scale-105"
            >
              Acessar
            </button>
            <button
              type="button"
              onClick={onClose}
              disabled={isAuthTransitioning}
              className="flex-1 px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-semibold transition-all duration-300 hover:scale-105"
            >
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
