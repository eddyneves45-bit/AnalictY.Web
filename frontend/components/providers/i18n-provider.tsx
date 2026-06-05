// ============================================================================
// I18N PROVIDER - iioT AnalictY
// ============================================================================
// Provider para internacionalização (Português/Inglês).
// Relaciona-se com: app/layout.tsx, lib/i18n.ts
// Suporta 2 idiomas: pt (Português) e en (Inglês)
// ============================================================================

'use client'

import React, { createContext, useContext, useState } from 'react'

type Locale = 'pt' | 'en'

interface I18nContextType {
  locale: Locale
  setLocale: (locale: Locale) => void
  t: (key: string) => string
}

const I18nContext = createContext<I18nContextType | undefined>(undefined)

// Traduções básicas
const translations = {
  pt: {
    'landing.title': 'iioT AnalictY',
    'landing.subtitle': 'Plataforma de Inteligência Industrial',
    'landing.tagline': 'Gestão e monitoramento em tempo real',
    'landing.login': 'Acessar Sistema',
    'landing.recoverAccess': 'Recuperar acesso',
    'sidebar.dashboard': 'Seleção de Área',
    'sidebar.bi': 'BI',
    'sidebar.opcBrowser': 'Navegador OPC',
    'sidebar.config': 'Configurações',
    'sidebar.logout': 'Sair',
    'sidebar.loggedUser': 'Usuário logado',
    'dashboard.title': 'Dashboard',
    'dashboard.welcome': 'Bem-vindo ao dashboard',
    'authenticated.title': 'Interface autenticada',
    'authenticated.welcome': 'Bem-vindo à interface autenticada',
  },
  en: {
    'landing.title': 'iioT AnalictY',
    'landing.subtitle': 'Industrial Intelligence Platform',
    'landing.tagline': 'Real-time management and monitoring',
    'landing.login': 'Access System',
    'landing.recoverAccess': 'Recover access',
    'sidebar.dashboard': 'Area Selection',
    'sidebar.bi': 'BI',
    'sidebar.opcBrowser': 'OPC Browser',
    'sidebar.config': 'Settings',
    'sidebar.logout': 'Logout',
    'sidebar.loggedUser': 'Logged user',
    'dashboard.title': 'Dashboard',
    'dashboard.welcome': 'Welcome to the dashboard',
    'authenticated.title': 'Authenticated interface',
    'authenticated.welcome': 'Welcome to the authenticated interface',
  },
}

export function I18nProvider({ 
  children, 
  defaultLocale = 'pt' 
}: { 
  children: React.ReactNode
  defaultLocale?: Locale 
}) {
  const [locale, setLocale] = useState<Locale>(defaultLocale)

  const t = (key: string) => {
    return translations[locale][key as keyof typeof translations.pt] || key
  }

  return (
    <I18nContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </I18nContext.Provider>
  )
}

export function useI18n() {
  const context = useContext(I18nContext)
  if (context === undefined) {
    throw new Error('useI18n must be used within an I18nProvider')
  }
  return context
}
