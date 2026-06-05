'use client'

import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'

type NavigationFeedbackContextValue = {
  beginNavigation: (label: string) => void
  reportPageReady: (ready: boolean) => void
}

const NavigationFeedbackContext = createContext<NavigationFeedbackContextValue | null>(null)

export function NavigationFeedbackProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [pendingLabel, setPendingLabel] = useState<string | null>(null)
  const [visibleLabel, setVisibleLabel] = useState<string | null>(null)
  const [pageReady, setPageReady] = useState(true)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const clearTimer = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }

  const beginNavigation = useCallback((label: string) => {
    clearTimer()
    setPendingLabel(label)
    setVisibleLabel(null)
    setPageReady(false)
    timerRef.current = setTimeout(() => {
      setVisibleLabel(label)
    }, 1500)
  }, [])

  const reportPageReady = useCallback((ready: boolean) => {
    setPageReady(ready)
  }, [])

  useEffect(() => {
    if (!pendingLabel || !pageReady) return
    clearTimer()
    setPendingLabel(null)
    setVisibleLabel(null)
  }, [pageReady, pendingLabel])

  useEffect(() => {
    // New routes begin in the "not ready yet" state only when the sidebar started the navigation.
    if (pendingLabel) {
      setPageReady(false)
    }
  }, [pathname, searchParams, pendingLabel])

  useEffect(() => {
    return clearTimer
  }, [])

  return (
    <NavigationFeedbackContext.Provider value={{ beginNavigation, reportPageReady }}>
      {children}
      {visibleLabel && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/35 backdrop-blur-[1px]">
          <div className="flex min-w-72 items-center gap-4 rounded-lg border border-gray-200 bg-white px-6 py-5 text-gray-900 shadow-2xl">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-red-600 border-t-transparent" />
            <div>
              <p className="text-sm font-semibold">Carregando</p>
              <p className="text-sm text-gray-500">{visibleLabel}</p>
            </div>
          </div>
        </div>
      )}
    </NavigationFeedbackContext.Provider>
  )
}

export function useNavigationFeedback() {
  const context = useContext(NavigationFeedbackContext)
  if (!context) {
    throw new Error('useNavigationFeedback must be used within NavigationFeedbackProvider')
  }
  return context
}

export function usePageReady(ready: boolean) {
  const { reportPageReady } = useNavigationFeedback()

  useEffect(() => {
    reportPageReady(ready)
  }, [ready, reportPageReady])
}
