'use client'

import React, { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ProtectedLayout } from '@/components/layout/protected-layout'
import { Factory, Tags, Bell, ArrowLeft, Clock3, LayoutDashboard } from 'lucide-react'
import { useAuth } from '@/components/providers/auth-provider'
import { API_BASE_URL, apiFetch } from '@/lib/api'
import { usePageReady } from '@/components/providers/navigation-feedback-provider'

type ConfigSector = 'all' | 'production' | 'alerts' | 'visualization'

type TimeZoneOption = {
  id: string
  label: string
}

const configSectors: Array<{ id: ConfigSector; label: string; description: string }> = [
  { id: 'all', label: 'Todos', description: 'Tudo' },
  { id: 'production', label: 'Produção', description: 'Máquinas, tags e turnos' },
  { id: 'alerts', label: 'Alertas', description: 'Notificações' },
  { id: 'visualization', label: 'Visualização', description: 'Dashboards e BI' },
]

const normalizeConfigSector = (sector: string | null): ConfigSector =>
  configSectors.some((item) => item.id === sector) ? (sector as ConfigSector) : 'all'

const configCardBase = "group min-h-40 rounded-xl border bg-white p-5 text-left shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"

const configCardTone = {
  tags: "border-l-4 border-l-amber-500 hover:bg-amber-50/60",
  alerts: "border-l-4 border-l-rose-500 hover:bg-rose-50/60",
  machines: "border-l-4 border-l-slate-500 hover:bg-slate-50/70",
  shifts: "border-l-4 border-l-green-500 hover:bg-green-50/60",
  dashboards: "border-l-4 border-l-violet-500 hover:bg-violet-50/60",
  timezone: "border-l-4 border-l-amber-500 hover:bg-amber-50/60",
}

export default function ConfigPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user, token } = useAuth()
  const canOpenSettings = user?.role === 'admin'

  const [loading, setLoading] = useState(true)
  usePageReady(!loading)

  const [timeZoneId, setTimeZoneId] = useState('America/Sao_Paulo')
  const [timeZoneLabel, setTimeZoneLabel] = useState('Brasil - Brasília (GMT-3)')
  const [timeZoneOptions, setTimeZoneOptions] = useState<TimeZoneOption[]>([])
  const [timeZoneMessage, setTimeZoneMessage] = useState('')
  const [currentClock, setCurrentClock] = useState(new Date())

  const [configSector, setConfigSector] = useState<ConfigSector>(() => normalizeConfigSector(searchParams.get('sector')))
  const showConfigSector = (sector: ConfigSector) => configSector === 'all' || configSector === sector

  const selectConfigSector = (sector: ConfigSector) => {
    setConfigSector(sector)
    router.replace(sector === 'all' ? '/config' : `/config?sector=${sector}`, { scroll: false })
  }

  useEffect(() => {
    if (user && !canOpenSettings) {
      router.push('/principal')
    }
  }, [user, canOpenSettings, router])

  useEffect(() => {
    setConfigSector(normalizeConfigSector(searchParams.get('sector')))
  }, [searchParams])

  useEffect(() => {
    const interval = setInterval(() => setCurrentClock(new Date()), 1000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    if (!token || !user) return
    if (user.role !== 'admin') {
      setLoading(false)
      return
    }
    loadConfigs()
  }, [token, user])

  async function loadConfigs() {
    try {
      const timeZoneRes = await apiFetch(`${API_BASE_URL}/api/config/system/timezone`)
      const timeZoneData = timeZoneRes.ok ? await timeZoneRes.json() : null

      if (timeZoneData) {
        setTimeZoneId(timeZoneData.timeZoneId ?? 'America/Sao_Paulo')
        setTimeZoneLabel(timeZoneData.label ?? timeZoneData.timeZoneId ?? 'Brasil - Brasília (GMT-3)')
        setTimeZoneOptions(timeZoneData.options ?? [])
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const formatConfiguredTime = (date: Date) =>
    date.toLocaleString('pt-BR', {
      timeZone: timeZoneId,
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })

  async function saveTimeZone() {
    setTimeZoneMessage('')
    const response = await apiFetch(`${API_BASE_URL}/api/config/system/timezone`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ timeZoneId }),
    })
    const data = await response.json().catch(() => ({}))
    if (!response.ok) {
      setTimeZoneMessage(data.message ?? 'Erro ao salvar fuso horário.')
      return
    }
    setTimeZoneLabel(data.label ?? timeZoneId)
    setTimeZoneMessage('Fuso horário salvo com sucesso.')
  }

  if (loading) {
    return (
      <ProtectedLayout>
        <div className="rounded-2xl border border-gray-200 bg-white p-8 text-gray-600 shadow-sm">Carregando configurações...</div>
      </ProtectedLayout>
    )
  }

  return (
    <ProtectedLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="mb-4 flex items-center gap-4">
          <button onClick={() => router.back()} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <ArrowLeft className="h-5 w-5 text-gray-600" />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Central de Configurações</h1>
            <p className="text-gray-600 mt-1">Configurações operacionais do sistema</p>
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-3 shadow-sm">
          <div className="flex gap-2 overflow-x-auto">
            {configSectors.map((sector) => (
              <button
                key={sector.id}
                type="button"
                onClick={() => selectConfigSector(sector.id)}
                className={`min-w-36 rounded-xl px-4 py-3 text-left transition-colors ${
                  configSector === sector.id
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'bg-slate-50 text-slate-700 hover:bg-slate-100'
                }`}
              >
                <div className="text-sm font-bold">{sector.label}</div>
                <div className={`mt-0.5 text-xs ${configSector === sector.id ? 'text-slate-200' : 'text-slate-500'}`}>{sector.description}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Cards de Configuração Operacional */}
        <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-4 gap-4">
          {/* TAGs */}
          <a href="/tags" className={`${showConfigSector('production') ? '' : 'hidden'} ${configCardBase} ${configCardTone.tags}`}>
            <div className="text-center">
              <Tags className="h-12 w-12 mx-auto mb-2 text-orange-600" />
              <h3 className="text-lg font-bold text-gray-900 mb-2">TAGs</h3>
              <p className="text-sm text-gray-500 mb-3">Gestão de TAGs do sistema</p>
              <div className="text-xs text-gray-500">TAGs</div>
            </div>
          </a>

          {/* Máquinas */}
          <button onClick={() => router.push('/machines')} className={`${showConfigSector('production') ? '' : 'hidden'} ${configCardBase} ${configCardTone.machines}`}>
            <div className="text-center">
              <Factory className="h-12 w-12 mx-auto mb-2 text-gray-600" />
              <h3 className="text-lg font-bold text-gray-900 mb-2">Máquinas</h3>
              <p className="text-sm text-gray-500 mb-3">Gestão de máquinas do sistema</p>
              <div className="text-xs text-gray-500">Máquinas</div>
            </div>
          </button>

          {/* Turnos */}
          <button onClick={() => router.push('/shifts')} className={`${showConfigSector('production') ? '' : 'hidden'} ${configCardBase} ${configCardTone.shifts}`}>
            <div className="text-center">
              <Clock3 className="h-12 w-12 mx-auto mb-2 text-emerald-600" />
              <h3 className="text-lg font-bold text-gray-900 mb-2">Turnos</h3>
              <p className="text-sm text-gray-500 mb-3">Janelas operacionais da fábrica</p>
              <div className="text-xs text-gray-500">turnos</div>
            </div>
          </button>

          {/* Alertas */}
          <a href="/alerts" className={`${showConfigSector('alerts') ? '' : 'hidden'} ${configCardBase} ${configCardTone.alerts}`}>
            <div className="text-center">
              <Bell className="h-12 w-12 mx-auto mb-2 text-red-600" />
              <h3 className="text-lg font-bold text-gray-900 mb-2">Alertas</h3>
              <p className="text-sm text-gray-500 mb-3">Regras e reconhecimento</p>
              <div className="text-xs text-gray-500">alertas</div>
            </div>
          </a>

          {/* Dashboards */}
          <button onClick={() => router.push('/dashboards')} className={`${showConfigSector('visualization') ? '' : 'hidden'} ${configCardBase} ${configCardTone.dashboards}`}>
            <div className="text-center">
              <LayoutDashboard className="h-12 w-12 mx-auto mb-2 text-red-700" />
              <h3 className="text-lg font-bold text-gray-900 mb-2">Dashboards</h3>
              <p className="text-sm text-gray-500 mb-3">Layouts de gráficos por máquina</p>
              <div className="text-xs text-gray-500">tela cheia</div>
            </div>
          </button>

          {/* Fuso horário */}
          <div className={`${showConfigSector('all') ? '' : 'hidden'} ${configCardBase} ${configCardTone.timezone}`}>
            <div className="flex items-start gap-3">
              <Clock3 className="mt-1 h-10 w-10 shrink-0 text-amber-700" />
              <div className="min-w-0 flex-1">
                <h3 className="text-lg font-bold text-gray-900">Fuso horário</h3>
                <p className="mt-1 text-sm font-medium text-amber-900">{formatConfiguredTime(currentClock)}</p>
                <p className="text-xs text-amber-800">{timeZoneLabel}</p>
                <select
                  value={timeZoneId}
                  onChange={(event) => setTimeZoneId(event.target.value)}
                  className="mt-3 w-full rounded-lg border border-amber-400 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-amber-600 focus:outline-none"
                >
                  {timeZoneOptions.map((option) => (
                    <option key={option.id} value={option.id}>{option.label}</option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={saveTimeZone}
                  className="mt-3 rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-700"
                >
                  Salvar fuso
                </button>
                {timeZoneMessage && <p className="mt-2 text-xs font-medium text-amber-900">{timeZoneMessage}</p>}
              </div>
            </div>
          </div>
        </div>
      </div>
    </ProtectedLayout>
  )
}
