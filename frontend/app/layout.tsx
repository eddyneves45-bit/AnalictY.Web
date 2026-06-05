// ============================================================================
// LAYOUT PRINCIPAL - iioT AnalictY
// ============================================================================
// Layout raiz do aplicativo Next.js.
// Relaciona-se com: app/page.tsx, app/globals.css
// Configura: Tema (dark/claro), Idioma (PT/EN), Provider de estado
// ============================================================================

import React, { Suspense } from 'react'
import type { Metadata } from 'next'
import './globals.css'
import { ThemeProvider } from '@/components/providers/theme-provider'
import { AuthProvider } from '@/components/providers/auth-provider'
import { I18nProvider } from '@/components/providers/i18n-provider'
import { SelectedMachineProvider } from '@/components/providers/selected-machine-provider'
import { SelectedMachineModal } from '@/components/machines/selected-machine-modal'
import { NavigationFeedbackProvider } from '@/components/providers/navigation-feedback-provider'

export const metadata: Metadata = {
  title: 'iioT AnalictY',
  description: 'Plataforma IIoT de inteligência industrial',
  icons: {
    icon: [
      { url: '/logos/iiot-analicty-favicon.svg?v=1', type: 'image/svg+xml' },
      { url: '/favicon.svg?v=3', type: 'image/svg+xml' },
    ],
    shortcut: '/logos/iiot-analicty-favicon.svg?v=1',
    apple: '/logos/iiot-analicty-favicon.svg?v=1',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        <link rel="icon" href="/logos/iiot-analicty-favicon.svg?v=1" type="image/svg+xml" />
        <link rel="shortcut icon" href="/logos/iiot-analicty-favicon.svg?v=1" type="image/svg+xml" />
        <link rel="apple-touch-icon" href="/logos/iiot-analicty-favicon.svg?v=1" />
      </head>
      <body>
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange
        >
          <I18nProvider defaultLocale="pt">
            <SelectedMachineProvider>
              <AuthProvider>
                <Suspense fallback={null}>
                  <NavigationFeedbackProvider>
                    {children}
                    <SelectedMachineModal />
                  </NavigationFeedbackProvider>
                </Suspense>
              </AuthProvider>
            </SelectedMachineProvider>
          </I18nProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
