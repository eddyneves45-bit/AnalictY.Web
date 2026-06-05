// ============================================================================
// LANDING PAGE COMPONENT - iioT AnalictY
// ============================================================================
// Componente da landing page com modais de login e recuperacao de acesso.
// Relaciona-se com: app/page.tsx, components/landing/login-modal.tsx
// Template: Landing page com modais de login e recuperacao + Header estilo SCADA
// ============================================================================

'use client'

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { LoginModal } from './login-modal'
import { RecoveryModal } from './recovery-modal'
import { useI18n } from '@/components/providers/i18n-provider'
import { useAuth } from '@/components/providers/auth-provider'
import { Globe } from 'lucide-react'

export function LandingPage() {
  const { locale, setLocale, t } = useI18n()
  const { isAuthenticated, isAuthTransitioning } = useAuth()
  const router = useRouter()
  const [showLogin, setShowLogin] = useState(false)
  const [showRecovery, setShowRecovery] = useState(false)
  const [loadingStep, setLoadingStep] = useState(0)
  const [showLogoutModal, setShowLogoutModal] = useState(false)
  const [isReady, setIsReady] = useState(false)

  // Detecta estado de logout no mount
  useEffect(() => {
    const isLoggingOut = localStorage.getItem('logging_out') === 'true'
    if (isLoggingOut) {
      setShowLogoutModal(true)
      const timer = setTimeout(() => {
        setShowLogoutModal(false)
        localStorage.removeItem('logging_out')
        setIsReady(true)
      }, 800)
      return () => clearTimeout(timer)
    } else {
      setIsReady(true)
    }
  }, [])

  useEffect(() => {
    if (isAuthenticated) {
      router.replace('/principal')
    }
  }, [isAuthenticated, router])

  // Anima loading steps quando isAuthTransitioning muda
  useEffect(() => {
    console.log('landing: isAuthTransitioning mudou para:', isAuthTransitioning)
    if (isAuthTransitioning) {
      console.log('landing: Iniciando animação de loading')
      setLoadingStep(1)
      const timer1 = setTimeout(() => setLoadingStep(2), 500)
      const timer2 = setTimeout(() => setLoadingStep(3), 1000)
      const timer3 = setTimeout(() => setLoadingStep(4), 1500)
      const timer4 = setTimeout(() => setLoadingStep(5), 2000)
      
      return () => {
        clearTimeout(timer1)
        clearTimeout(timer2)
        clearTimeout(timer3)
        clearTimeout(timer4)
      }
    } else {
      console.log('landing: Resetando loadingStep para 0')
      setLoadingStep(0)
    }
  }, [isAuthTransitioning])

  if (isAuthenticated) {
    return <div className="min-h-screen bg-gray-100" />
  }

  const loadingMessages = [
    'Autenticando...',
    'Verificando credenciais...',
    'Conectando ao servidor...',
    'Carregando perfil...',
    'Finalizando...',
  ]

  console.log('landing: Render - isAuthTransitioning:', isAuthTransitioning, 'loadingStep:', loadingStep)

  // Se está mostrando modal de logout, renderiza apenas o modal
  if (showLogoutModal) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-100 via-white to-gray-200">
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[9999] animate-in fade-in duration-300">
          <div className="bg-white p-8 rounded-2xl w-full max-w-md shadow-2xl animate-in zoom-in duration-300 text-center">
            <div className="h-12 w-12 animate-spin rounded-full border-4 border-red-600 border-t-transparent mx-auto mb-4" />
            <p className="text-xl font-bold text-gray-900">Encerrando sessão...</p>
            <p className="text-sm text-gray-500 mt-2">Saindo da plataforma</p>
          </div>
        </div>
      </div>
    )
  }

  // Se não está pronto (carregando), mostra loading
  if (!isReady) {
    return <div className="min-h-screen bg-gradient-to-br from-gray-100 via-white to-gray-200" />
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-100 via-white to-gray-200">
      {/* Modal de loading durante autenticação */}
      {isAuthTransitioning && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-[100]">
          <div className="bg-white p-8 rounded-lg w-full max-w-md shadow-xl">
            <div className="flex items-center gap-4 mb-4">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-red-600 border-t-transparent" />
              <div>
                <p className="text-lg font-semibold text-gray-900">Autenticando...</p>
                <p className="text-sm text-gray-500">{loadingMessages[loadingStep - 1] || 'Processando...'}</p>
              </div>
            </div>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((step) => (
                <div
                  key={step}
                  className={`h-2 flex-1 rounded-full transition-colors ${
                    step <= loadingStep ? 'bg-red-600' : 'bg-gray-200'
                  }`}
                />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Header estilo SCADA Web - Tema Escuro */}
      <header className="bg-gray-900/80 backdrop-blur-lg border-b border-gray-700 shadow-2xl">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3" aria-label="iioT AnalictY">
            <div className="grid h-11 w-11 place-items-center rounded-lg bg-gray-950 shadow-inner ring-1 ring-white/10">
              <span className="text-lg font-black tracking-normal text-red-500">iT</span>
            </div>
            <div className="leading-none">
              <p className="text-2xl font-black tracking-normal text-white">iioT</p>
              <p className="mt-1 text-sm font-bold tracking-normal text-red-400">AnalictY</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {/* Seletor de idioma */}
            <button
              onClick={() => setLocale(locale === 'pt' ? 'en' : 'pt')}
              className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition-all duration-300 border border-gray-700 hover:border-gray-600"
              title="Mudar idioma"
            >
              <Globe className="w-4 h-4" />
              <span className="text-sm font-semibold">{locale.toUpperCase()}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section - Tema Claro com Impacto */}
      <div className="flex items-center justify-center min-h-[calc(100vh-130px)] relative overflow-hidden">
        {/* Background decorativo */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-red-600/5 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-gray-600/5 rounded-full blur-3xl animate-pulse delay-1000" />
        </div>

        <div className="text-center px-4 relative z-10">
          <div className="flex justify-center mb-6">
            <img
              src="/logos/industrial-intelligence-icon.svg"
              alt="Plataforma de Inteligência Industrial"
              className="w-36 md:w-48 h-auto drop-shadow-2xl"
            />
          </div>
          <h1 className="mb-3 text-4xl font-black tracking-normal text-gray-900 md:text-5xl">
            {t('landing.title')}
          </h1>
          <p className="text-lg md:text-xl text-gray-600 mb-10">
            {t('landing.subtitle')}
          </p>
          
          {/* Botões de ação */}
          <div className="flex flex-col items-center gap-4">
            <button
              onClick={() => setShowLogin(true)}
              className="px-10 py-4 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white rounded-xl font-bold text-lg transition-all duration-300 shadow-lg shadow-red-600/30 hover:shadow-red-600/50 hover:scale-105"
            >
              {t('landing.login')}
            </button>
            <button
              onClick={() => setShowRecovery(true)}
              className="text-gray-600 hover:text-red-600 font-medium transition-colors"
            >
              {t('landing.recoverAccess')}
            </button>
          </div>
        </div>
      </div>

      {/* Rodapé */}
      <footer className="bg-gray-900 border-t border-gray-800 py-4">
        <div className="container mx-auto px-4 text-center">
          <p className="text-xs text-gray-400">
            Acesso restrito à gestão. Contate o administrador em caso de necessidade.
          </p>
        </div>
      </footer>

      {/* Modais */}
      <LoginModal isOpen={showLogin} onClose={() => setShowLogin(false)} />
      <RecoveryModal isOpen={showRecovery} onClose={() => setShowRecovery(false)} />
    </div>
  )
}
