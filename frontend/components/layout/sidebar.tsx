// ============================================================================
// SIDEBAR - ESTILO SCADA WEB - iioT AnalictY
// ============================================================================
// Barra lateral esquerda estilo SCADA web com marca iioT AnalictY e menu.
// Relaciona-se com: app/layout.tsx, components/layout/dashboard-layout.tsx
// Template: Barra lateral fixa à esquerda com menu compacto
// ============================================================================
'use client'

import React from 'react'
import { useI18n } from '@/components/providers/i18n-provider'
import { useAuth } from '@/components/providers/auth-provider'
import { useSelectedMachine } from '@/components/providers/selected-machine-provider'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { useNavigationFeedback } from '@/components/providers/navigation-feedback-provider'
import { 
  LayoutDashboard, 
  Settings, 
  LogOut,
  Activity,
  FileText,
  BarChart3,
  BellRing,
  X,
  Factory,
  MapPin,
  Building2,
  AlertTriangle,
  Table2,
  HelpCircle
} from 'lucide-react'

export function Sidebar() {
  const { t } = useI18n()
  const { user, logout } = useAuth()
  const { selectedMachine, clearSelectedMachine } = useSelectedMachine()
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const { beginNavigation } = useNavigationFeedback()
  const hasPermission = (permission: string) =>
    user?.role === 'admin' || !!user?.permissions?.includes(permission)

  const menuItems = [
    { icon: LayoutDashboard, label: 'Visão Geral', href: '/principal' },
    { icon: Activity, label: 'Status', href: '/status' },
    ...(hasPermission('reports.download')
      ? [{ icon: Table2, label: 'Histórico Produção', href: '/production-history' }]
      : []),
    {
      icon: AlertTriangle,
      label: 'Histórico Paradas',
      href: selectedMachine
        ? `/downtime-reasons?machine_id=${selectedMachine.id}&machine_name=${encodeURIComponent(selectedMachine.name)}&machine_code=${encodeURIComponent(selectedMachine.code)}`
        : '/downtime-reasons'
    },
    ...(selectedMachine
      ? [{ icon: BarChart3, label: 'Análise BI', href: '/bi' }]
      : []),
    ...(hasPermission('reports.download')
      ? [{ icon: FileText, label: 'Relatório', href: '/report' }]
      : []),
    ...(hasPermission('alert-rules.manage')
      ? [{ icon: BellRing, label: 'Alertas', href: '/alerts' }]
      : []),
    ...(user?.role === 'admin' || hasPermission('users.manage') || hasPermission('audit.view')
      ? [{ icon: Settings, label: t('sidebar.config'), href: '/config' }]
      : []),
  ]

  const handleLogout = async () => {
    await logout()
    localStorage.setItem('logging_out', 'true')
    router.replace('/')
  }

  const handleNavigate = (href: string, label: string) => {
    const queryString = searchParams.toString()
    const currentHref = queryString ? `${pathname}?${queryString}` : pathname
    if (currentHref === href) return

    beginNavigation(label)
    router.push(href)
  }

  return (
    <div className="w-64 bg-gradient-to-b from-gray-700 to-gray-600 text-white h-screen fixed left-0 top-0 flex flex-col overflow-hidden border-r border-gray-500 shadow-2xl">
      {/* Marca iioT AnalictY */}
      <div className="p-6 border-b border-gray-500 bg-gradient-to-r from-gray-700 to-gray-600">
        <div className="flex items-center justify-center">
          <div className="flex items-center gap-3" aria-label="iioT AnalictY">
            <div className="grid h-11 w-11 place-items-center rounded-lg bg-gray-900 shadow-inner ring-1 ring-white/10">
              <span className="text-lg font-black text-red-500">iT</span>
            </div>
            <div className="leading-none">
              <p className="text-2xl font-black tracking-normal text-white">iioT</p>
              <p className="mt-1 text-sm font-bold tracking-normal text-red-400">AnalictY</p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto">
      <div className="px-6 py-4 border-b border-gray-700 bg-gray-800/50 backdrop-blur">
        <p className="text-sm text-gray-400 text-xs uppercase tracking-wider">{t('sidebar.loggedUser')}</p>
        <p className="font-semibold text-white truncate mt-1">{user?.full_name || user?.username || 'Usuário'}</p>
        <p className="text-xs text-red-400 uppercase font-bold mt-1">{user?.role || 'user'}</p>
      </div>

      {/* Selected Machine Details */}
      {selectedMachine && (
        <div className="px-4 py-4 border-b border-gray-600 bg-gray-800/70 backdrop-blur">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs text-gray-400 uppercase tracking-wider font-semibold">Máquina Selecionada</p>
            <button
              onClick={clearSelectedMachine}
              className="p-1 hover:bg-gray-700 rounded-lg transition-colors"
              title="Limpar seleção"
            >
              <X className="w-4 h-4 text-gray-400" />
            </button>
          </div>
          <div className="space-y-2">
            <div className="flex items-start gap-2">
              <Factory className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs text-gray-500 font-mono">{selectedMachine.code}</p>
                <p className="text-sm font-semibold text-white truncate">{selectedMachine.name}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-gray-400 flex-shrink-0" />
              <p className="text-xs text-gray-300 truncate">{selectedMachine.cost_center}</p>
            </div>
            {selectedMachine.location && (
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-gray-400 flex-shrink-0" />
                <p className="text-xs text-gray-300 truncate">{selectedMachine.location}</p>
              </div>
            )}
            <button
              onClick={() => handleNavigate(`/dashboard?machine_id=${selectedMachine.id}`, 'Dashboard')}
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg bg-red-600 px-3 py-2 text-xs font-bold text-white transition-colors hover:bg-red-700"
            >
              <BarChart3 className="h-4 w-4" />
              Dashboard
            </button>
          </div>
        </div>
      )}

      {/* Menu */}
      <nav className="p-4 space-y-1">
        {menuItems.map((item) => {
          const isActive = pathname === item.href || (item.href === '/config' && ['/users', '/audit'].includes(pathname))
          return (
            <button
              key={item.href}
              onClick={() => handleNavigate(item.href, item.label)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 group ${
                isActive
                  ? 'bg-red-600/20 text-red-400 border border-red-600/50'
                  : 'hover:bg-gradient-to-r hover:from-red-600 hover:to-red-700 hover:shadow-lg hover:shadow-red-600/30'
              }`}
            >
              <item.icon className={`w-5 h-5 transition-colors ${isActive ? 'text-red-400' : 'text-gray-400 group-hover:text-white'}`} />
              <span className={`transition-colors font-medium ${isActive ? 'text-red-400' : 'text-gray-300 group-hover:text-white'}`}>{item.label}</span>
            </button>
          )
        })}
      </nav>
      </div>

      {/* Help and logout */}
      <div className="space-y-2 border-t border-gray-700 p-4">
        <button
          onClick={() => handleNavigate('/help', 'Ajuda')}
          className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 font-semibold ${
            pathname === '/help'
              ? 'border border-red-600/50 bg-red-600/20 text-red-400'
              : 'bg-gray-800/70 text-gray-200 hover:bg-gray-700'
          }`}
        >
          <HelpCircle className={`w-5 h-5 ${pathname === '/help' ? 'text-red-400' : 'text-gray-300'}`} />
          <span>Ajuda</span>
        </button>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-red-600 hover:bg-red-700 hover:shadow-lg hover:shadow-red-600/50 transition-all duration-300 text-white font-semibold"
        >
          <LogOut className="w-5 h-5" />
          <span>{t('sidebar.logout')}</span>
        </button>
      </div>
    </div>
  )
}
