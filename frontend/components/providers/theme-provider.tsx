// ============================================================================
// THEME PROVIDER - iioT AnalictY
// ============================================================================
// Provider para gerenciamento de temas (dark/claro).
// Relaciona-se com: app/layout.tsx, components/ui/theme-toggle.tsx
// Usa next-themes para gerenciamento de tema
// ============================================================================

'use client'

import React from 'react'
import { ThemeProvider as NextThemesProvider } from 'next-themes'

type ThemeProviderProps = React.ComponentProps<typeof NextThemesProvider>

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>
}
