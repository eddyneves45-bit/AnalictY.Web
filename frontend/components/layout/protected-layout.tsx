'use client'

import React, { useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { Sidebar } from '@/components/layout/sidebar'
import { SystemStatusIndicator } from '@/components/layout/system-status-indicator'
import { useAuth } from '@/components/providers/auth-provider'

type ProtectedLayoutProps = {
  children: React.ReactNode
  allowedRoles?: string[]
  allowedPermissions?: string[]
}

export function ProtectedLayout({ children, allowedRoles, allowedPermissions }: ProtectedLayoutProps) {
  const { isAuthenticated, loading, user } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const hasAllowedRole = !allowedRoles?.length || !!user?.role && allowedRoles.includes(user.role)
  const hasAllowedPermission = !allowedPermissions?.length ||
    user?.role === 'admin' ||
    allowedPermissions.some((permission) => user?.permissions?.includes(permission))
  const hasAccess = hasAllowedRole && hasAllowedPermission

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.replace('/')
    }
  }, [isAuthenticated, loading, router])

  useEffect(() => {
    if (!loading && isAuthenticated && !hasAccess) {
      router.replace('/principal')
    }
  }, [hasAccess, isAuthenticated, loading, router])

  if (loading || !isAuthenticated || !hasAccess) {
    return <div className="min-h-screen bg-gray-100" />
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <Sidebar />
      <SystemStatusIndicator />
      <main className="ml-64 min-h-screen p-8">{children}</main>
    </div>
  )
}
