// ============================================================================
// REGISTER MODAL - iioT AnalictY
// ============================================================================
// Modal de cadastro com formulário.
// Relaciona-se com: components/landing/landing-page.tsx, api/routers/auth.py
// ============================================================================

'use client'

import React, { useState } from 'react'
import { useAuth } from '@/components/providers/auth-provider'
import { API_BASE_URL, apiFetch } from '@/lib/api'

interface RegisterModalProps {
  isOpen: boolean
  onClose: () => void
}

export function RegisterModal({ isOpen, onClose }: RegisterModalProps) {
  const { login } = useAuth()
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const formatApiError = (detail: unknown): string => {
    if (typeof detail === 'string') return detail
    if (Array.isArray(detail)) {
      return detail
        .map((item) => {
          if (typeof item === 'string') return item
          if (item && typeof item === 'object' && 'msg' in item) return String((item as { msg: unknown }).msg)
          return JSON.stringify(item)
        })
        .join(', ')
    }
    if (detail && typeof detail === 'object' && 'msg' in detail) {
      return String((detail as { msg: unknown }).msg)
    }
    return 'Erro ao cadastrar'
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    
    try {
      const response = await apiFetch(`${API_BASE_URL}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username,
          email,
          password,
          full_name: fullName
        })
      })
       
      if (response.ok) {
        setSuccess('Usuário cadastrado com sucesso')
        await login(username, password)
        onClose()
      } else {
        const data = await response.json()
        setError(formatApiError(data.detail))
      }
    } catch (err) {
      setError('Erro de conexão')
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 animate-in fade-in duration-300">
      <div className="bg-white p-8 rounded-lg w-full max-w-md shadow-xl animate-in zoom-in duration-300">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Cadastrar</h2>
        
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 p-3 rounded mb-4">
            {error}
          </div>
        )}
       
        {success && (
          <div className="bg-green-100 border border-green-400 text-green-700 p-3 rounded mb-4">
            {success}
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-gray-700 mb-2">Nome Completo</label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full px-4 py-2 bg-gray-100 text-gray-900 rounded border border-gray-300 focus:border-red-500 focus:outline-none"
              required
            />
          </div>
          
          <div>
            <label className="block text-gray-700 mb-2">Usuário</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-4 py-2 bg-gray-100 text-gray-900 rounded border border-gray-300 focus:border-red-500 focus:outline-none"
              required
            />
          </div>
          
          <div>
            <label className="block text-gray-700 mb-2">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2 bg-gray-100 text-gray-900 rounded border border-gray-300 focus:border-red-500 focus:outline-none"
              required
            />
          </div>
          
          <div>
            <label className="block text-gray-700 mb-2">Senha</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2 bg-gray-100 text-gray-900 rounded border border-gray-300 focus:border-red-500 focus:outline-none"
              required
            />
          </div>
          
          <div className="flex gap-4">
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded font-semibold transition-colors"
            >
              Cadastrar
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-gray-800 hover:bg-gray-900 text-white rounded font-semibold transition-colors"
            >
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
