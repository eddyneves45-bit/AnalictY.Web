'use client'

import React, { useState } from 'react'
import { X, Mail, ShieldCheck } from 'lucide-react'

interface RecoveryModalProps {
  isOpen: boolean
  onClose: () => void
}

export function RecoveryModal({ isOpen, onClose }: RecoveryModalProps) {
  const [email, setEmail] = useState('')
  const [submitted, setSubmitted] = useState(false)

  if (!isOpen) return null

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSubmitted(true)
  }

  const handleClose = () => {
    setEmail('')
    setSubmitted(false)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl">
        <div className="flex items-start justify-between border-b border-gray-100 px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-xl bg-red-50 text-red-600">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Recuperar acesso</h2>
              <p className="text-sm text-gray-500">Use o e-mail cadastrado no AnalictY.</p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700"
            aria-label="Fechar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 px-6 py-6">
          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-gray-700">E-mail de recuperação</span>
            <div className="flex items-center gap-3 rounded-xl border border-gray-300 px-4 py-3 focus-within:border-red-500 focus-within:ring-2 focus-within:ring-red-100">
              <Mail className="h-5 w-5 text-gray-400" />
              <input
                type="email"
                value={email}
                onChange={(event) => {
                  setEmail(event.target.value)
                  setSubmitted(false)
                }}
                required
                placeholder="usuario@empresa.com.br"
                className="w-full bg-transparent text-gray-900 outline-none placeholder:text-gray-400"
              />
            </div>
          </label>

          {submitted && (
            <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
              Se este e-mail estiver cadastrado, as instruções de recuperação serão enviadas.
            </div>
          )}

          <div className="rounded-xl bg-gray-50 px-4 py-3 text-sm text-gray-600">
            Em instalações locais sem envio de e-mail configurado, solicite apoio ao administrador do sistema.
          </div>

          <button
            type="submit"
            className="w-full rounded-xl bg-gradient-to-r from-red-600 to-red-700 px-5 py-3 font-bold text-white shadow-lg shadow-red-600/20 transition hover:from-red-700 hover:to-red-800"
          >
            Solicitar recuperação
          </button>
        </form>
      </div>
    </div>
  )
}
