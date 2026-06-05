'use client'

import React, { useCallback, useMemo, useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ProtectedLayout } from '@/components/layout/protected-layout'
import { useAuth } from '@/components/providers/auth-provider'
import { useSelectedMachine } from '@/components/providers/selected-machine-provider'
import { Factory, Activity, AlertCircle, TrendingUp, ChevronLeft, ChevronRight, Star, Target, Edit2, ArrowLeft } from 'lucide-react'
import { ContextMenu, useContextMenu, ContextMenuOption } from '@/components/machines/context-menu'
import { Eye, AlertTriangle as AlertIcon } from 'lucide-react'
import GaugeSemiCircle from '@/components/GaugeSemiCircle'
import { useMesSignalR } from '@/lib/useMesSignalR'
import { API_BASE_URL, apiFetch } from '@/lib/api'
import { formatRuntimeValue, getFirstRuntimeValue } from '@/lib/runtime-format'
import { usePageReady } from '@/components/providers/navigation-feedback-provider'

type Machine = {
  id: number
  name: string
  code: string
  cost_center: string
  location: string
  opcua_node_id: string
  mqtt_topic: string
  is_active: boolean
}

type MachineTagMapping = {
  id?: number
  role?: string
  tag_alias?: string
  tagAlias?: string
  TagAlias?: string
  tag_id?: number
  tag_config_id?: number
  tagConfigId?: number
  TagConfigId?: number
  tag_name?: string
  tagName?: string
  address?: string
  driver?: string
  driverType?: string
  value?: any
  current_value?: any
  currentValue?: any
}

type TagRuntimeState = {
  tagId?: number
  tag_id?: number
  TagId?: number
  tagName?: string
  tag_name?: string
  value?: any
  quality?: string
}

type MachineOverviewData = {
  machine: {
    id: number
    name: string
    code: string
    costCenter: string
    location: string
  } | null
  period: {
    from: string
    to: string
  }
  goal: {
    meta_producao_dia: number | null
    meta_producao_hora: number | null
    tempo_ciclo_ideal_segundos: number | null
  } | null
  production: {
    total: number
    losses: number
    good: number
    attainment_percent: number
  }
  status: {
    production_seconds: number
    idle_seconds: number
    maintenance_seconds: number
    inactive_seconds: number
  }
  metrics: {
    target: number
    total_status_seconds: number
    availability_percent: number
    performance_percent: number
    quality_percent: number
    oee_percent: number
  }
  timeline: Array<{ hour: string; production: number; goal: number | null }>
}

type MachineGoal = {
  id: number
  machine_id: string
  meta_producao_dia: number | null
  meta_producao_hora: number | null
  tempo_ciclo_ideal_segundos: number | null
  vigente_de: string
  vigente_ate: string | null
  ativo: boolean
}

type ShiftDefinition = {
  id: number
  codigo: string
  nome: string
  hora_inicio: string
  hora_fim: string
  ativo: boolean
}

type MachineStatus = 'RODANDO' | 'PARADA' | 'OCIOSA' | 'MANUTENÇÃO' | 'OFFLINE'

const normalizeMachineStatus = (status: any): MachineStatus | null => {
  status = getFirstRuntimeValue(status)
  if (status === null || status === undefined || status === '') return null

  const normalized = String(status).trim().toUpperCase()
  if (status === true || normalized === '1' || normalized === 'RUNNING' || normalized === 'RODANDO' || normalized === 'OPERAÇÃO' || normalized === 'OPERACAO' || normalized === 'ON') return 'RODANDO'
  if (status === false || normalized === '0' || normalized === 'INACTIVE' || normalized === 'INATIVA' || normalized === 'INATIVO' || normalized === 'STOPPED' || normalized === 'PARADA' || normalized === 'OFF') return 'OFFLINE'
  if (normalized === '2' || normalized === 'IDLE' || normalized === 'OCIOSA') return 'OCIOSA'
  if (normalized === '3' || normalized === 'MAINTENANCE' || normalized === 'MANUTENÇÃO' || normalized === 'MANUTENCAO') return 'MANUTENÇÃO'
  if (normalized === 'OFFLINE' || normalized === 'UNKNOWN' || normalized === 'BAD') return 'OFFLINE'

  return null
}

const getMachineStatus = (machine: Machine, resolvedState: any): MachineStatus => {
  if (!resolvedState) return 'OFFLINE'

  const normalizedStatus = normalizeMachineStatus(resolvedState.machine_status)
  if (normalizedStatus) return normalizedStatus

  return machine.is_active ? 'OFFLINE' : 'OFFLINE'
}

const getStatusColor = (status: MachineStatus) => {
  switch (status) {
    case 'RODANDO': return 'bg-green-600 text-white shadow-lg shadow-green-600/50'
    case 'PARADA': return 'bg-red-600 text-white shadow-lg shadow-red-600/50'
    case 'OCIOSA': return 'bg-orange-400 text-white shadow-lg shadow-orange-400/50'
    case 'MANUTENÇÃO': return 'bg-red-500 text-white shadow-lg shadow-red-500/50'
    case 'OFFLINE': return 'bg-gray-500 text-white shadow-lg shadow-gray-500/50'
  }
}

const getStatusLabel = (status: MachineStatus) => status === 'OFFLINE' ? 'INATIVA' : status

const getStatusBorder = (status: MachineStatus) => {
  switch (status) {
    case 'RODANDO': return 'border-green-500 shadow-green-500/30'
    case 'PARADA': return 'border-red-500 shadow-red-500/30'
    case 'OCIOSA': return 'border-orange-400 shadow-orange-400/30'
    case 'MANUTENÇÃO': return 'border-red-500 shadow-red-500/30'
    case 'OFFLINE': return 'border-gray-500 shadow-gray-500/30'
  }
}

const getStatusBackground = (status: MachineStatus) => {
  switch (status) {
    case 'RODANDO': return 'bg-gradient-to-br from-green-50 to-green-100'
    case 'PARADA': return 'bg-gradient-to-br from-red-50 to-red-100'
    case 'OCIOSA': return 'bg-gradient-to-br from-orange-50 to-orange-100'
    case 'MANUTENÇÃO': return 'bg-gradient-to-br from-red-50 to-red-100'
    case 'OFFLINE': return 'bg-gradient-to-br from-gray-50 to-gray-100'
  }
}

const getMappingRole = (mapping: MachineTagMapping) => String(mapping.role || mapping.tag_alias || mapping.tagAlias || mapping.TagAlias || '').toLowerCase()
const getMappingTagId = (mapping: MachineTagMapping) => mapping.tag_id || mapping.tag_config_id || mapping.tagConfigId || mapping.TagConfigId || 0
const getMappingTagName = (mapping: MachineTagMapping) => mapping.tag_name || mapping.tagName || ''
const getRuntimeTagId = (state: TagRuntimeState) => state.tagId || state.tag_id || state.TagId || 0
const getRuntimeTagName = (state: TagRuntimeState) => state.tagName || state.tag_name || ''
const formatTagValue = (value: any) => formatRuntimeValue(value, '--')
const toNumber = (value: any): number | null => {
  value = getFirstRuntimeValue(value)
  if (value === null || value === undefined || value === '') return null
  if (typeof value === 'number') return Number.isFinite(value) ? value : null
  if (typeof value === 'boolean') return value ? 1 : 0

  const normalized = String(value).replace(',', '.').trim()
  const parsed = Number(normalized)
  return Number.isFinite(parsed) ? parsed : null
}
const formatQuantity = (value: any) => {
  const numeric = toNumber(value)
  if (numeric === null) return formatTagValue(value)

  return new Intl.NumberFormat('pt-BR', {
    maximumFractionDigits: Number.isInteger(numeric) ? 0 : 1,
  }).format(numeric)
}
const normalizePercent = (value: any): number | null => {
  const numeric = toNumber(value)
  if (numeric === null) return null
  return numeric <= 1 && numeric >= 0 ? numeric * 100 : numeric
}
const formatPercent = (value: number | null) => value === null ? '--' : `${Math.round(value)}%`
const formatTargetCaption = (periodLabel: string, target: any) => {
  const formattedTarget = formatQuantity(target)
  if (formattedTarget === '--') return 'meta do período ainda não calculada'
  return periodLabel === 'dia produtivo'
    ? `meta fixa do dia produtivo: ${formattedTarget}`
    : `meta fixa configurada: ${formattedTarget}`
}
const formatMinutes = (value: number | null) => value === null ? '--' : `${Math.round(value)}m`
const formatPeriodRange = (from: Date, to: Date) =>
  `${from.toLocaleDateString('pt-BR')} ${from.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} - ${to.toLocaleDateString('pt-BR')} ${to.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`
const formatDuration = (seconds: number) => {
  const totalMinutes = Math.floor(seconds / 60)
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  return `${hours}h ${minutes}m`
}
const toDateTimeLocalValue = (date: Date) => {
  const offsetDate = new Date(date.getTime() - date.getTimezoneOffset() * 60_000)
  return offsetDate.toISOString().slice(0, 16)
}
const buildIndustrialDayPeriod = (now: Date) => {
  const from = new Date(now)
  from.setHours(5, 50, 0, 0)

  if (now < from) {
    from.setDate(from.getDate() - 1)
  }

  const to = new Date(from)
  to.setDate(to.getDate() + 1)
  to.setMinutes(to.getMinutes() - 1)

  return { from, to, label: 'dia produtivo' }
}
const normalizeShiftTime = (value: string) => value.slice(0, 5)
const buildShiftPeriod = (shift: ShiftDefinition) => {
  const now = new Date()
  const [startHour, startMinute] = normalizeShiftTime(shift.hora_inicio).split(':').map(Number)
  const [endHour, endMinute] = normalizeShiftTime(shift.hora_fim).split(':').map(Number)
  const from = new Date(now)
  from.setHours(startHour, startMinute, 0, 0)
  const to = new Date(now)
  to.setHours(endHour, endMinute, 0, 0)

  if (to <= from) {
    to.setDate(to.getDate() + 1)
    if (now < from) {
      from.setDate(from.getDate() - 1)
      to.setDate(to.getDate() - 1)
    }
  }

  return { from, to, label: shift.nome }
}
const getOverviewStatusSeconds = (overview: MachineOverviewData | null, statusCode: number) => {
  if (!overview) return 0
  if (statusCode === 1) return overview.status.production_seconds
  if (statusCode === 2) return overview.status.idle_seconds
  if (statusCode === 3) return overview.status.maintenance_seconds
  return overview.status.inactive_seconds
}
const getStatusWidth = (overview: MachineOverviewData | null, statusCode: number, periodFrom: Date, periodTo: Date) => {
  const periodSeconds = Math.max((periodTo.getTime() - periodFrom.getTime()) / 1000, 1)
  const current = getOverviewStatusSeconds(overview, statusCode)
  return Math.min(Math.round((current / periodSeconds) * 100), 100)
}

function MachineTimeline({
  data,
  periodLabel,
  periodFrom,
  periodTo,
  total,
  target,
}: {
  data: Array<{ time: string; value: number }>
  periodLabel: string
  periodFrom: Date
  periodTo: Date
  total: number | null
  target: number | null
}) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)

  if (!data.length) {
    return (
      <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold uppercase text-gray-500">{periodLabel}</p>
            <p className="text-sm text-gray-500">{formatPeriodRange(periodFrom, periodTo)}</p>
          </div>
          <div className="rounded-xl bg-white px-4 py-3 shadow-sm">
            <p className="text-xs font-semibold uppercase text-gray-500">Produção</p>
            <p className="text-2xl font-black text-gray-900">{formatQuantity(total)}</p>
          </div>
        </div>
        <div className="flex h-52 items-center justify-center text-sm text-gray-500">
          Ainda não há eventos de produção no período.
        </div>
      </div>
    )
  }

  const max = Math.max(...data.map(item => item.value), 1)
  const chartTop = 8
  const chartBottom = 86
  const chartLeft = 5
  const chartRight = 96
  const chartHeight = chartBottom - chartTop
  const chartWidth = chartRight - chartLeft
  const chartPoints = data.map((item, index) => {
    const x = data.length === 1 ? chartLeft : chartLeft + (index / (data.length - 1)) * chartWidth
    const y = chartBottom - (item.value / max) * chartHeight
    return { x, y, item, index }
  })
  const points = chartPoints.map(point => `${point.x},${point.y}`).join(' ')
  const hoveredPoint = hoveredIndex === null ? null : chartPoints[hoveredIndex]
  const bestPoint = data.reduce((best, item) => item.value > best.value ? item : best, data[0])
  const lastProductionPoint = [...data].reverse().find((item) => item.value > 0) ?? data[data.length - 1]
  const totalValue = total ?? data.reduce((sum, item) => sum + item.value, 0)
  const targetValue = target ?? 0
  const targetPercent = targetValue > 0 ? Math.round((totalValue / targetValue) * 100) : null
  const maxLabels = 6
  const labelStep = data.length <= maxLabels ? 1 : Math.ceil((data.length - 1) / (maxLabels - 1))
  const labelIndexes = Array.from(new Set([
    0,
    ...data.map((_, index) => index).filter((index) => index % labelStep === 0),
    data.length - 1,
  ])).sort((a, b) => a - b)

  return (
    <div className="rounded-xl bg-gradient-to-br from-slate-50 to-blue-50 p-5">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-blue-700">{periodLabel}</p>
          <h3 className="mt-1 text-xl font-black text-gray-900">{formatQuantity(totalValue)} peças</h3>
          <p className="mt-1 text-sm text-gray-600">{formatPeriodRange(periodFrom, periodTo)}</p>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          <div className="rounded-xl bg-white px-3 py-2 shadow-sm">
            <p className="text-[11px] font-bold uppercase text-gray-500">Meta</p>
            <p className="text-lg font-black text-gray-900">{formatQuantity(targetValue)}</p>
          </div>
          <div className="rounded-xl bg-white px-3 py-2 shadow-sm">
            <p className="text-[11px] font-bold uppercase text-gray-500">Ating.</p>
            <p className="text-lg font-black text-blue-700">{targetPercent === null ? '--' : `${targetPercent}%`}</p>
          </div>
          <div className="rounded-xl bg-white px-3 py-2 shadow-sm">
            <p className="text-[11px] font-bold uppercase text-gray-500">Melhor hora</p>
            <p className="text-lg font-black text-emerald-700">{bestPoint.time}</p>
          </div>
        </div>
      </div>

      <div className="relative rounded-xl bg-white p-4 shadow-inner">
        <svg width="100%" height={260} viewBox="0 0 100 100" preserveAspectRatio="none">
          {[0, 25, 50, 75, 100].map((tick) => {
            const y = chartBottom - (tick / 100) * chartHeight
            return <line key={tick} x1={chartLeft} x2={chartRight} y1={y} y2={y} stroke="#e5e7eb" strokeWidth={0.25} />
          })}
          <polyline points={`${points} ${chartRight},${chartBottom} ${chartLeft},${chartBottom}`} fill="rgba(37,99,235,0.12)" stroke="none" />
          <polyline points={points} fill="none" stroke="#2563eb" strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round" />
          {hoveredPoint && (
            <>
              <line x1={hoveredPoint.x} x2={hoveredPoint.x} y1={chartTop} y2={chartBottom} stroke="#1e40af" strokeDasharray="1.5 1.5" strokeWidth={0.45} />
              <circle cx={hoveredPoint.x} cy={hoveredPoint.y} r={2.1} fill="#1d4ed8" stroke="#ffffff" strokeWidth={0.8} />
            </>
          )}
          {chartPoints.map(({ item, index, x, y }) => {
            return (
              <g key={`${item.time}-${index}`}>
                <circle cx={x} cy={y} r={item.value > 0 ? 1.3 : 0.7} fill={item.value === bestPoint.value ? '#10b981' : '#2563eb'} />
              </g>
            )
          })}
        </svg>
        <div className="absolute left-4 right-4 top-4 h-[260px]" onMouseLeave={() => setHoveredIndex(null)}>
          {chartPoints.map(({ item, index, x }) => (
            <div
              key={`hover-${item.time}-${index}`}
              className="absolute top-0 h-full w-8 -translate-x-1/2 cursor-crosshair"
              style={{ left: `${x}%` }}
              onMouseEnter={() => setHoveredIndex(index)}
              aria-label={`${item.time}: ${formatQuantity(item.value)} peças`}
            />
          ))}
          {hoveredPoint && (
            <div
              className="pointer-events-none absolute z-10 min-w-36 -translate-x-1/2 rounded-xl bg-gray-950 px-3 py-2 text-white shadow-xl"
              style={{
                left: `${hoveredPoint.x}%`,
                top: `${Math.max(4, hoveredPoint.y - 18)}%`,
              }}
            >
              <p className="text-[11px] font-semibold uppercase text-blue-200">{hoveredPoint.item.time}</p>
              <p className="text-lg font-black leading-tight">{formatQuantity(hoveredPoint.item.value)}</p>
              <p className="text-[11px] text-gray-300">peças produzidas</p>
            </div>
          )}
        </div>
        <div className="pointer-events-none absolute left-4 top-4 flex h-[260px] flex-col justify-between py-1 text-[11px] font-semibold text-gray-400">
          <span>{formatQuantity(max)}</span>
          <span>{formatQuantity(max / 2)}</span>
          <span>0</span>
        </div>
      </div>

      <div className="relative mt-3 h-5 text-[11px] text-gray-500">
        {labelIndexes.map((index) => {
          const left = data.length === 1 ? 0 : (index / (data.length - 1)) * 100
          const alignmentClass = index === 0
            ? 'translate-x-0 text-left'
            : index === data.length - 1
              ? '-translate-x-full text-right'
              : '-translate-x-1/2 text-center'

          return (
            <span
              key={`${data[index].time}-${index}`}
              className={`absolute top-0 whitespace-nowrap ${alignmentClass}`}
              style={{ left: `${left}%` }}
            >
              {data[index].time}
            </span>
          )
        })}
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-3">
        <div className="rounded-xl border border-blue-100 bg-white px-4 py-3">
          <p className="text-xs font-bold uppercase text-gray-500">Pico de produção</p>
          <p className="mt-1 text-xl font-black text-gray-900">{formatQuantity(bestPoint.value)}</p>
          <p className="text-xs text-gray-500">às {bestPoint.time}</p>
        </div>
        <div className="rounded-xl border border-emerald-100 bg-white px-4 py-3">
          <p className="text-xs font-bold uppercase text-gray-500">Pontos no gráfico</p>
          <p className="mt-1 text-xl font-black text-gray-900">{data.length}</p>
          <p className="text-xs text-gray-500">horários com leitura</p>
        </div>
        <div className="rounded-xl border border-amber-100 bg-white px-4 py-3">
          <p className="text-xs font-bold uppercase text-gray-500">Último evento</p>
          <p className="mt-1 text-xl font-black text-gray-900">{formatQuantity(lastProductionPoint.value)}</p>
          <p className="text-xs text-gray-500">às {lastProductionPoint.time} · atualiza a cada 5s</p>
        </div>
      </div>
    </div>
  )
}

export default function DashboardPage() {
  const { token } = useAuth()
  const { selectedMachine, setSelectedMachine } = useSelectedMachine()
  const router = useRouter()
  const [machines, setMachines] = useState<Machine[]>([])
  const [loading, setLoading] = useState(true)
  usePageReady(!loading)
  const [machinesLoadError, setMachinesLoadError] = useState<string | null>(null)
  const [resolvedStates, setResolvedStates] = useState<Record<number, any>>({})
  const [machineTagMappings, setMachineTagMappings] = useState<Record<number, MachineTagMapping[]>>({})
  const [runtimeStates, setRuntimeStates] = useState<Record<number, TagRuntimeState>>({})
  const [runtimeStatesByName, setRuntimeStatesByName] = useState<Record<string, TagRuntimeState>>({})
  const [selectedMachineOverview, setSelectedMachineOverview] = useState<MachineOverviewData | null>(null)
  const [periodPreset, setPeriodPreset] = useState('today')
  const [periodRefreshKey, setPeriodRefreshKey] = useState(0)
  const [customPeriod, setCustomPeriod] = useState(() => {
    const now = new Date()
    const from = new Date(now)
    from.setHours(0, 0, 0, 0)
    return {
      from: toDateTimeLocalValue(from),
      to: toDateTimeLocalValue(now),
    }
  })
  
  // Menu de contexto
  const { contextMenu, openContextMenu, closeContextMenu } = useContextMenu()
  const [contextMachine, setContextMachine] = useState<Machine | null>(null)
  
  // Filtros
  const [selectedSector, setSelectedSector] = useState<string>('')
  const [selectedCostCenter, setSelectedCostCenter] = useState<string>('')
  const [selectedStatus, setSelectedStatus] = useState<string>('')
  const [searchTerm, setSearchTerm] = useState('')
  const [kpiFilter, setKpiFilter] = useState<MachineStatus | 'ALL' | null>(null)
  const [machineListMode, setMachineListMode] = useState<'all' | 'favorites'>('all')
  
  // Paginação
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 50
  
  // Máquinas favoritas em ordem de escolha do usuário.
  const [favoriteOrder, setFavoriteOrder] = useState<number[]>([])
  const favorites = useMemo(() => new Set(favoriteOrder), [favoriteOrder])
  const [recentlyFavoritedMachineId, setRecentlyFavoritedMachineId] = useState<number | null>(null)
  
  const [machineGoals, setMachineGoals] = useState<Record<number, MachineGoal | null>>({})
  const [shifts, setShifts] = useState<ShiftDefinition[]>([])
  const [editingGoal, setEditingGoal] = useState<number | null>(null)
  const [goalInput, setGoalInput] = useState('')
  
  // Favoritos são preferência local do usuário, não dado de processo.
  useEffect(() => {
    const saved = localStorage.getItem('favoriteMachines')
    if (saved) {
      const parsed = JSON.parse(saved)
      if (Array.isArray(parsed)) {
        setFavoriteOrder(parsed.filter((id): id is number => typeof id === 'number'))
      }
    }
  }, [])
  
  // Salvar favoritos no localStorage
  const toggleFavorite = (machineId: number) => {
    const isFavorite = favorites.has(machineId)
    const nextFavoriteOrder = isFavorite
      ? favoriteOrder.filter((id) => id !== machineId)
      : [...favoriteOrder, machineId]

    setFavoriteOrder(nextFavoriteOrder)
    localStorage.setItem('favoriteMachines', JSON.stringify(nextFavoriteOrder))

    if (!isFavorite) {
      setRecentlyFavoritedMachineId(machineId)
      window.setTimeout(() => setRecentlyFavoritedMachineId(null), 900)
    }
  }

  const saveGoal = async (machineId: number) => {
    const parsedGoal = toNumber(goalInput)
    if (parsedGoal === null || parsedGoal < 0) return

    const currentGoal = machineGoals[machineId]
    const response = await apiFetch(`${API_BASE_URL}/api/machines/${machineId}/goals`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        meta_producao_dia: parsedGoal,
        meta_producao_hora: currentGoal?.meta_producao_hora ?? null,
        tempo_ciclo_ideal_segundos: currentGoal?.tempo_ciclo_ideal_segundos ?? null,
        vigente_de: new Date().toISOString(),
        vigente_ate: null,
        ativo: true,
      }),
    })

    if (!response.ok) {
      console.warn('Erro ao salvar meta da máquina')
      return
    }

    await loadMachineGoals()
    setEditingGoal(null)
  }

  useEffect(() => {
    if (periodPreset === 'custom') return

    const interval = setInterval(() => {
      setPeriodRefreshKey((previous) => previous + 1)
    }, 5000)

    return () => clearInterval(interval)
  }, [periodPreset])

  const selectedPeriod = useMemo(() => {
    const now = new Date()
    if (periodPreset === 'hour') {
      return { from: new Date(now.getTime() - 60 * 60 * 1000), to: now, label: 'última hora', targetMode: 'full_day' }
    }

    if (periodPreset === 'month') {
      return { from: new Date(now.getFullYear(), now.getMonth(), 1), to: now, label: 'mês atual', targetMode: 'full_day' }
    }

    if (periodPreset === 'custom') {
      const from = new Date(customPeriod.from)
      const to = new Date(customPeriod.to)
      return {
        from: Number.isNaN(from.getTime()) ? buildIndustrialDayPeriod(now).from : from,
        to: Number.isNaN(to.getTime()) ? now : to,
        label: 'janela personalizada',
        targetMode: 'full_day',
      }
    }

    if (periodPreset.startsWith('shift:')) {
      const shiftId = Number(periodPreset.replace('shift:', ''))
      const shift = shifts.find((item) => item.id === shiftId)
      if (shift) {
        return { ...buildShiftPeriod(shift), targetMode: 'full_day' }
      }
    }

    return { ...buildIndustrialDayPeriod(now), targetMode: 'full_day' }
  }, [customPeriod.from, customPeriod.to, periodPreset, periodRefreshKey, shifts])
  
  const loadMachines = useCallback(async () => {
    if (!token) return false

    try {
      const headers = {      }

      const res = await apiFetch(`${API_BASE_URL}/api/machines`, { headers })
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`)
      }

      const data = await res.json()
      setMachines(data.map((item: any) => ({
        id: item.id,
        name: item.name,
        code: item.code,
        cost_center: item.cost_center ?? item.costCenter ?? '',
        location: item.location || '',
        opcua_node_id: item.opcua_node_id || '',
        mqtt_topic: item.mqtt_topic || '',
        is_active: item.is_active ?? item.isActive ?? true,
      })))
      setMachinesLoadError(null)
      return true
    } catch (err) {
      console.warn('Erro ao carregar máquinas:', err)
      setMachinesLoadError('Aguardando o backend responder...')
      return false
    } finally {
      setLoading(false)
    }
  }, [token])

  // Carregar máquinas da API com recuperação automática no startup.
  useEffect(() => {
    if (!token) return

    let cancelled = false
    let retryTimer: ReturnType<typeof setTimeout> | null = null

    const loadWithRetry = async (attempt = 0) => {
      const success = await loadMachines()
      if (success || cancelled) return

      const delay = Math.min(1000 * Math.max(1, attempt + 1), 5000)
      retryTimer = setTimeout(() => {
        loadWithRetry(attempt + 1)
      }, delay)
    }

    loadWithRetry()

    const handleFocus = () => {
      if (!cancelled) {
        loadMachines()
      }
    }

    window.addEventListener('focus', handleFocus)
    return () => {
      cancelled = true
      if (retryTimer) clearTimeout(retryTimer)
      window.removeEventListener('focus', handleFocus)
    }
  }, [token, loadMachines])

  useEffect(() => {
    if (!token || !selectedMachine) {
      setSelectedMachineOverview(null)
      return
    }
    const selectedMachineId = selectedMachine.id

    async function loadSelectedMachineOverview() {
      const response = await apiFetch(
        `${API_BASE_URL}/api/bi/machines/${selectedMachineId}/overview?from=${encodeURIComponent(selectedPeriod.from.toISOString())}&to=${encodeURIComponent(selectedPeriod.to.toISOString())}&target_mode=${selectedPeriod.targetMode}`,
        {  }
      )
      if (!response.ok) return
      setSelectedMachineOverview(await response.json())
    }

    loadSelectedMachineOverview().catch((err) => console.warn('Erro ao carregar BI da máquina:', err))
  }, [selectedMachine, selectedPeriod.from, selectedPeriod.to, token])

  const loadMachineTagMappings = useCallback(async () => {
    if (!token || machines.length === 0) return

    try {
      const headers = {      }

      const mappingPairs = await Promise.all(
        machines.map(async (machine) => {
          const response = await apiFetch(`${API_BASE_URL}/api/machines/${machine.id}/tag-mapping`, { headers })
          if (!response.ok) {
            return [machine.id, []] as const
          }

          const data = await response.json()
          return [machine.id, data.mappings || []] as const
        })
      )

      setMachineTagMappings(Object.fromEntries(mappingPairs))
    } catch (err) {
      console.warn('Erro ao carregar tags vinculadas às máquinas:', err)
    }
  }, [token, machines])

  useEffect(() => {
    if (!token || machines.length === 0) return

    loadMachineTagMappings()
    const interval = setInterval(loadMachineTagMappings, 5000)

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        loadMachineTagMappings()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('focus', loadMachineTagMappings)

    return () => {
      clearInterval(interval)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('focus', loadMachineTagMappings)
    }
  }, [token, machines, loadMachineTagMappings])

  const loadMachineGoals = useCallback(async () => {
    if (!token || machines.length === 0) return

    try {
      const goalPairs = await Promise.all(
        machines.map(async (machine) => {
          const response = await apiFetch(`${API_BASE_URL}/api/machines/${machine.id}/goals`)
          if (!response.ok) {
            return [machine.id, null] as const
          }

          const goals = await response.json() as MachineGoal[]
          return [machine.id, goals.find((goal) => goal.ativo) ?? null] as const
        }),
      )

      setMachineGoals(Object.fromEntries(goalPairs))
    } catch (err) {
      console.warn('Erro ao carregar metas das máquinas:', err)
    }
  }, [token, machines])

  useEffect(() => {
    loadMachineGoals()
  }, [loadMachineGoals])

  useEffect(() => {
    if (!token) return

    async function loadShifts() {
      const response = await apiFetch(`${API_BASE_URL}/api/config/shifts`)
      if (!response.ok) return
      const data = await response.json()
      setShifts(
        data
          .filter((item: any) => item.ativo)
          .map((item: any) => ({
            id: item.id,
            codigo: item.codigo,
            nome: item.nome,
            hora_inicio: normalizeShiftTime(item.hora_inicio),
            hora_fim: normalizeShiftTime(item.hora_fim),
            ativo: item.ativo,
          })),
      )
    }

    loadShifts().catch((err) => console.warn('Erro ao carregar turnos:', err))
  }, [token])

  const { connected: wsConnected } = useMesSignalR({
    onMachineSnapshot: (snapshot) => {
      setResolvedStates((previous) => {
        const machinesMap = { ...previous }
        snapshot.forEach((machine: any) => {
          machinesMap[machine.machine_id] = {
            ...(previous[machine.machine_id] || {}),
            ...(machine.resolved_state || {}),
          }
        })
        return machinesMap
      })
    },
    onMachineUpdate: (update) => {
      if (update.machine_id && update.resolved_state !== undefined) {
        setResolvedStates((previous) => ({
          ...previous,
          [update.machine_id]: {
            ...(previous[update.machine_id] || {}),
            ...(update.resolved_state || {}),
          },
        }))
      }
    },
    onRuntimeSnapshot: (snapshot) => {
      const states = Object.fromEntries(
        snapshot.map((state) => [getRuntimeTagId(state), state]).filter(([tagId]) => Number(tagId) > 0)
      )
      const statesByName = Object.fromEntries(
        snapshot.map((state) => [getRuntimeTagName(state).toLowerCase(), state]).filter(([tagName]) => String(tagName).length > 0)
      )
      setRuntimeStates(states)
      setRuntimeStatesByName(statesByName)
    },
    onRuntimeUpdate: (update) => {
      const tagId = getRuntimeTagId(update)
      const tagName = getRuntimeTagName(update).toLowerCase()
      if (tagId > 0) {
        setRuntimeStates((previous) => ({ ...previous, [tagId]: update }))
      }
      if (tagName) {
        setRuntimeStatesByName((previous) => ({ ...previous, [tagName]: update }))
      }
    },
    enabled: !!token,
  })

  // Carregar resolved state das máquinas
  useEffect(() => {
    if (!token || machines.length === 0) return

    let isFetching = false

    const fetchWithTimeout = async (url: string, options: RequestInit, timeout = 10000): Promise<Response> => {
      return Promise.race([
        apiFetch(url, options),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('timeout')), timeout)
        )
      ])
    }

    async function loadResolvedStates() {
      // Polling só roda se WebSocket cair (fallback)
      if (wsConnected) return
      if (isFetching) return
      isFetching = true

      try {
        const headers = {        }

        // Buscar resolved state de todas as máquinas em um único request com timeout
        const res = await fetchWithTimeout(`${API_BASE_URL}/api/machines/resolved-state-all`, { headers }, 10000)
        const data = await res.json()

        // Converter array para objeto indexado por machine_id
        const statesMap: Record<number, any> = {}
        data.machines.forEach((machine: any) => {
          statesMap[machine.machine_id] = machine.resolved_state
        })

        setResolvedStates(statesMap)
      } catch (err) {
        console.warn('Erro ao buscar resolved state:', err)
        // NÃO limpa o estado em caso de erro/timeout para não marcar tudo como OFFLINE
      } finally {
        isFetching = false
      }
    }

    // Primeiro load imediato
    loadResolvedStates()

    // Polling a cada 5 segundos
    const interval = setInterval(loadResolvedStates, 5000)
    return () => clearInterval(interval)
  }, [token, machines, wsConnected])

  const getMappedRuntimeState = (machineId: number, roles: string[]) => {
    const linkedTags = machineTagMappings[machineId] || []
    const roleSet = new Set(roles.map(role => role.toLowerCase()))
    const mapping = linkedTags.find(item => roleSet.has(getMappingRole(item)))
    if (!mapping) return undefined

    return runtimeStates[getMappingTagId(mapping)] || runtimeStatesByName[getMappingTagName(mapping).toLowerCase()]
  }

  const getMappedValue = (machineId: number, roles: string[], resolvedFallback?: any) => {
    const linkedTags = machineTagMappings[machineId] || []
    const roleSet = new Set(roles.map(role => role.toLowerCase()))
    const mapping = linkedTags.find(item => roleSet.has(getMappingRole(item)))
    const state = getMappedRuntimeState(machineId, roles)
    return state?.value
      ?? mapping?.current_value
      ?? mapping?.currentValue
      ?? mapping?.value
      ?? resolvedFallback
  }

  const getProductionValue = (machine: Machine) => {
    return getMappedValue(machine.id, ['production_counter', 'production', 'counter'], resolvedStates[machine.id]?.production_counter)
  }

  const getMachineStatusFromData = (machine: Machine) => {
    const effectiveStatus = normalizeMachineStatus(resolvedStates[machine.id]?.machine_status)
    if (effectiveStatus) return effectiveStatus

    const linkedTags = machineTagMappings[machine.id] || []
    const statusMapping = linkedTags.find(item => ['machine_status', 'status'].includes(getMappingRole(item)))
    if (!statusMapping) return 'OFFLINE'

    const statusState = runtimeStates[getMappingTagId(statusMapping)]
      || runtimeStatesByName[getMappingTagName(statusMapping).toLowerCase()]
    const statusValue = statusState?.value
      ?? statusMapping.current_value
      ?? statusMapping.currentValue
      ?? statusMapping.value
      ?? resolvedStates[machine.id]?.machine_status
    return getMachineStatus(machine, { machine_status: statusValue })
  }

  const selectedMachineMetrics = useMemo(() => {
    if (!selectedMachine) return null

    const productionValue = getProductionValue(selectedMachine)
    const currentProduction = selectedMachineOverview?.production.total ?? null
    const availability = selectedMachineOverview?.metrics.availability_percent ?? null
    const performance = selectedMachineOverview?.metrics.performance_percent ?? null
    const quality = selectedMachineOverview?.metrics.quality_percent ?? null
    const downtime = selectedMachineOverview
      ? (selectedMachineOverview.status.inactive_seconds +
          selectedMachineOverview.status.idle_seconds +
          selectedMachineOverview.status.maintenance_seconds) / 60
      : null
    const target = selectedMachineOverview?.metrics.target ?? null

    return {
      productionValue,
      currentProduction,
      target,
      efficiency: selectedMachineOverview?.production.attainment_percent ?? null,
      availability,
      performance,
      quality,
      downtime,
      oee: selectedMachineOverview?.metrics.oee_percent ?? null,
      oeeFormula: availability !== null && performance !== null && quality !== null
        ? `${Math.round(availability)}% x ${Math.round(performance)}% x ${Math.round(quality)}%`
        : 'Configure meta e ciclo ideal'
    }
  }, [selectedMachine, selectedMachineOverview, machineTagMappings, runtimeStates, runtimeStatesByName, resolvedStates])

  // Extrair setores únicos (location)
  const sectors = useMemo(() => {
    const uniqueSectors = [...new Set(machines.map(m => m.location).filter(Boolean))]
    return uniqueSectors.sort()
  }, [machines])

  // Extrair centros de custo únicos
  const costCenters = useMemo(() => {
    const uniqueCC = [...new Set(machines.map(m => m.cost_center).filter(Boolean))]
    return uniqueCC.sort()
  }, [machines])

  // Filtrar máquinas
  const filteredMachines = useMemo(() => {
    const favoritePositions = new Map(favoriteOrder.map((id, index) => [id, index]))

    return machines.filter(m => {
      if (selectedSector && m.location !== selectedSector) return false
      if (selectedCostCenter && m.cost_center !== selectedCostCenter) return false
      if (selectedStatus === 'active' && !m.is_active) return false
      if (selectedStatus === 'inactive' && m.is_active) return false
      if (machineListMode === 'favorites' && !favorites.has(m.id)) return false
      
      // Filtro por KPI
      if (kpiFilter && kpiFilter !== 'ALL') {
        const machineStatus = getMachineStatusFromData(m)
        if (kpiFilter === 'OCIOSA' || kpiFilter === 'MANUTENÇÃO') {
          // Se filtro é OCIOSA ou MANUTENÇÃO individual, filtrar apenas esse status
          if (kpiFilter === 'OCIOSA' && machineStatus !== 'OCIOSA') return false
          if (kpiFilter === 'MANUTENÇÃO' && machineStatus !== 'MANUTENÇÃO') return false
        } else {
          // Para RODANDO, filtrar diretamente
          if (machineStatus !== kpiFilter) return false
        }
      }
      
      if (searchTerm) {
        const term = searchTerm.toLowerCase()
        return m.name.toLowerCase().includes(term) || m.code.toLowerCase().includes(term)
      }
      return true
    }).sort((a, b) => {
      const aFavoritePosition = favoritePositions.get(a.id)
      const bFavoritePosition = favoritePositions.get(b.id)

      if (aFavoritePosition !== undefined && bFavoritePosition !== undefined) {
        return aFavoritePosition - bFavoritePosition
      }
      if (aFavoritePosition !== undefined) return -1
      if (bFavoritePosition !== undefined) return 1
      return a.name.localeCompare(b.name, 'pt-BR')
    })
  }, [machines, selectedSector, selectedCostCenter, selectedStatus, searchTerm, kpiFilter, machineTagMappings, runtimeStates, runtimeStatesByName, resolvedStates, favoriteOrder, machineListMode, favorites])
  
  // Contagem por status considerando filtros (para KPIs)
  const filteredStatusCounts = useMemo(() => {
    const counts: Record<MachineStatus, number> = { RODANDO: 0, PARADA: 0, OCIOSA: 0, MANUTENÇÃO: 0, OFFLINE: 0 }
    filteredMachines.forEach(m => {
      const status = getMachineStatusFromData(m)
      counts[status]++
    })
    return counts
  }, [filteredMachines, machineTagMappings, runtimeStates, runtimeStatesByName, resolvedStates])

  // Paginação
  const totalPages = Math.ceil(filteredMachines.length / itemsPerPage)
  const paginatedMachines = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage
    return filteredMachines.slice(startIndex, startIndex + itemsPerPage)
  }, [filteredMachines, currentPage, itemsPerPage])

  // Resetar página quando mudar filtros
  useEffect(() => {
    setCurrentPage(1)
  }, [selectedSector, selectedCostCenter, selectedStatus, searchTerm, kpiFilter, favoriteOrder, machineListMode])

  // Handler para clique direito no card da máquina
  const handleMachineContextMenu = (e: React.MouseEvent, machine: Machine) => {
    setContextMachine(machine)
    openContextMenu(e)
  }

  // Opções do menu de contexto
  const getContextOptions = (): ContextMenuOption[] => {
    if (!contextMachine) return []

    return [
      {
        id: 'downtime-reasons',
        label: 'Motivo Paradas',
        icon: <AlertIcon className="h-4 w-4 text-orange-600" />,
        onClick: () => router.push(`/downtime-reasons?machine_id=${contextMachine.id}&machine_name=${encodeURIComponent(contextMachine.name)}&machine_code=${encodeURIComponent(contextMachine.code)}`)
      },
      {
        id: 'overview',
        label: 'Visão Geral',
        icon: <Eye className="h-4 w-4 text-blue-600" />,
        onClick: () => setSelectedMachine(contextMachine)
      },
      {
        id: 'status',
        label: 'Status',
        icon: <Activity className="h-4 w-4 text-green-600" />,
        onClick: () => router.push(`/status?machine_id=${contextMachine.id}`)
      }
    ]
  }

  // Handler para clique nos cards de KPI
  const handleKpiClick = (filter: MachineStatus | 'ALL' | null) => {
    if (kpiFilter === filter) {
      // Se clicar no mesmo filtro, remove o filtro
      setKpiFilter(null)
    } else {
      setKpiFilter(filter)
    }
  }

  // Resetar filtros quando mudar setor
  const handleSectorChange = (value: string) => {
    setSelectedSector(value)
    setSelectedCostCenter('')
  }

  if (loading) {
    return (
      <ProtectedLayout>
        <div className="flex items-center justify-center h-64">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-red-600 border-t-transparent" />
        </div>
      </ProtectedLayout>
    )
  }

  return (
    <ProtectedLayout>
      <div className="space-y-6">
        {!selectedMachine ? (
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Visão Geral dos Equipamentos</h1>
            <p className="text-gray-600">Monitoramento de {machines.length} máquinas</p>
          </div>
        ) : (
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSelectedMachine(null)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="h-5 w-5 text-gray-600" />
            </button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Visão Geral da Máquina</h1>
              <p className="text-gray-600">{selectedMachine.name} ({selectedMachine.code})</p>
            </div>
          </div>
        )}

        {!selectedMachine && machinesLoadError && machines.length === 0 && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            {machinesLoadError} Tentando novamente automaticamente.
          </div>
        )}

        {selectedMachine && (
          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-sm font-semibold text-gray-900">Janela de análise</p>
                <p className="mt-1 text-sm text-gray-500">
                  Os indicadores abaixo respondem ao período escolhido.
                </p>
              </div>
              <div className="flex flex-col gap-3 md:flex-row md:items-end">
                <label className="space-y-1 text-sm">
                  <span className="block text-gray-500">Período</span>
                  <select
                    value={periodPreset}
                    onChange={(event) => setPeriodPreset(event.target.value as typeof periodPreset)}
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 md:w-44"
                  >
                    <option value="today">Dia produtivo</option>
                    <option value="hour">Última hora</option>
                    <option value="month">Mês atual</option>
                    {shifts.map((shift) => (
                      <option key={shift.id} value={`shift:${shift.id}`}>
                        {shift.nome} ({normalizeShiftTime(shift.hora_inicio)} - {normalizeShiftTime(shift.hora_fim)})
                      </option>
                    ))}
                    <option value="custom">Personalizado</option>
                  </select>
                </label>
                {periodPreset === 'custom' && (
                  <>
                    <label className="space-y-1 text-sm">
                      <span className="block text-gray-500">De</span>
                      <input
                        type="datetime-local"
                        value={customPeriod.from}
                        onChange={(event) => setCustomPeriod((current) => ({ ...current, from: event.target.value }))}
                        className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900"
                      />
                    </label>
                    <label className="space-y-1 text-sm">
                      <span className="block text-gray-500">Até</span>
                      <input
                        type="datetime-local"
                        value={customPeriod.to}
                        onChange={(event) => setCustomPeriod((current) => ({ ...current, to: event.target.value }))}
                        className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900"
                      />
                    </label>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {/* KPIs */}
        {!selectedMachine && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div 
              onClick={() => handleKpiClick('ALL')}
              className={`bg-gradient-to-br from-blue-400 via-blue-500 to-indigo-600 rounded-xl p-6 shadow-lg shadow-blue-500/30 text-white cursor-pointer transition-all duration-200 hover:scale-105 ${kpiFilter === 'ALL' ? 'ring-4 ring-white ring-offset-2 ring-offset-blue-500' : ''}`}
            >
              <div className="flex items-center gap-3 mb-2">
                <Factory className="h-6 w-6 text-white" />
                <span className="text-sm font-medium text-white/90">Total Máquinas</span>
              </div>
              <p className="text-4xl font-bold text-white">{filteredMachines.length}</p>
              <p className="text-xs text-white/80 mt-1">Cadastradas no sistema</p>
            </div>

            <div 
              onClick={() => handleKpiClick('RODANDO')}
              className={`bg-gradient-to-br from-emerald-400 via-green-500 to-teal-600 rounded-xl p-6 shadow-lg shadow-green-500/30 text-white cursor-pointer transition-all duration-200 hover:scale-105 ${kpiFilter === 'RODANDO' ? 'ring-4 ring-white ring-offset-2 ring-offset-green-500' : ''}`}
            >
              <div className="flex items-center gap-3 mb-2">
                <Activity className="h-6 w-6 text-white" />
                <span className="text-sm font-medium text-white/90">Total Em Operação</span>
              </div>
              <p className="text-4xl font-bold text-white">{filteredStatusCounts.RODANDO}</p>
              <p className="text-xs text-white/80 mt-1">
                {filteredMachines.length > 0 ? Math.round((filteredStatusCounts.RODANDO / filteredMachines.length) * 100) : 0}% do total
              </p>
            </div>

            <div 
              onClick={() => handleKpiClick('MANUTENÇÃO')}
              className={`bg-gradient-to-br from-rose-400 via-red-500 to-red-700 rounded-xl p-6 shadow-lg shadow-red-500/30 text-white cursor-pointer transition-all duration-200 hover:scale-105 ${kpiFilter === 'MANUTENÇÃO' ? 'ring-4 ring-white ring-offset-2 ring-offset-red-500' : ''}`}
            >
              <div className="flex items-center gap-3 mb-2">
                <AlertCircle className="h-6 w-6 text-white" />
                <span className="text-sm font-medium text-white/90">Total em Manutenção</span>
              </div>
              <p className="text-4xl font-bold text-white">{filteredStatusCounts.MANUTENÇÃO}</p>
              <p className="text-xs text-white/80 mt-1">
                {filteredMachines.length > 0 ? Math.round((filteredStatusCounts.MANUTENÇÃO / filteredMachines.length) * 100) : 0}% do total
              </p>
            </div>

            <div 
              onClick={() => handleKpiClick('OCIOSA')}
              className={`bg-gradient-to-br from-amber-400 via-orange-500 to-orange-700 rounded-xl p-6 shadow-lg shadow-orange-500/30 text-white cursor-pointer transition-all duration-200 hover:scale-105 ${kpiFilter === 'OCIOSA' ? 'ring-4 ring-white ring-offset-2 ring-offset-orange-500' : ''}`}
            >
              <div className="flex items-center gap-3 mb-2">
                <TrendingUp className="h-6 w-6 text-white" />
                <span className="text-sm font-medium text-white/90">Total Ociosas</span>
              </div>
              <p className="text-4xl font-bold text-white">{filteredStatusCounts.OCIOSA}</p>
              <p className="text-xs text-white/80 mt-1">
                {filteredMachines.length > 0 ? Math.round((filteredStatusCounts.OCIOSA / filteredMachines.length) * 100) : 0}% do total
              </p>
            </div>
          </div>
        )}

        {/* KPIs da Máquina Selecionada */}
        {selectedMachine && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-6 shadow-lg shadow-green-500/30 text-white">
              <div className="flex items-center gap-3 mb-2">
                <Activity className="h-6 w-6 text-white" />
                <span className="text-sm font-medium text-white/90">Produção Atual</span>
              </div>
              <p className="text-4xl font-bold text-white">{formatQuantity(selectedMachineMetrics?.currentProduction)}</p>
              <p className="text-xs text-white/80 mt-1">Produção no período selecionado</p>
            </div>

            <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-6 shadow-lg shadow-blue-500/30 text-white">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  <Target className="h-6 w-6 text-white" />
                  <span className="text-sm font-medium text-white/90">Meta Escolhida</span>
                </div>
                <button
                  onClick={() => {
                    setEditingGoal(selectedMachine.id)
                    setGoalInput(String(machineGoals[selectedMachine.id]?.meta_producao_dia ?? ''))
                  }}
                  className="text-white/70 hover:text-white transition-colors"
                  title="Editar meta"
                >
                  <Edit2 className="h-4 w-4" />
                </button>
              </div>
              {editingGoal === selectedMachine.id ? (
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="0"
                    value={goalInput}
                    onChange={(event) => setGoalInput(event.target.value)}
                    className="w-28 rounded border border-white/30 bg-white/20 px-2 py-1 text-2xl font-bold text-white"
                    autoFocus
                  />
                  <button
                    onClick={() => void saveGoal(selectedMachine.id)}
                    className="rounded bg-white/20 px-3 py-1 font-medium text-white transition-colors hover:bg-white/30"
                  >
                    Salvar
                  </button>
                  <button
                    onClick={() => setEditingGoal(null)}
                    className="rounded bg-white/20 px-3 py-1 font-medium text-white transition-colors hover:bg-white/30"
                  >
                    Cancelar
                  </button>
                </div>
              ) : (
                <p className="text-4xl font-bold text-white">
                  {formatQuantity(machineGoals[selectedMachine.id]?.meta_producao_dia)}
                </p>
              )}
              <p className="text-xs text-white/80 mt-1">
                {formatTargetCaption(selectedPeriod.label, selectedMachineMetrics?.target)}
              </p>
            </div>

            <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-6 shadow-lg shadow-purple-500/30 text-white">
              <div className="flex items-center gap-3 mb-2">
                <TrendingUp className="h-6 w-6 text-white" />
                <span className="text-sm font-medium text-white/90">Percentual Atingido</span>
              </div>
              <p className="text-4xl font-bold text-white">{formatPercent(selectedMachineMetrics?.efficiency ?? null)}</p>
              <p className="text-xs text-white/80 mt-1">produção / meta do período</p>
            </div>

            <div className="bg-gradient-to-br from-amber-500 to-orange-500 rounded-xl p-6 shadow-lg shadow-amber-500/30 text-white">
              <div className="flex items-center gap-3 mb-2">
                <AlertCircle className="h-6 w-6 text-white" />
                <span className="text-sm font-medium text-white/90">Tempo Paradas</span>
              </div>
              <p className="text-4xl font-bold text-white">{formatMinutes(selectedMachineMetrics?.downtime ?? null)}</p>
              <p className="text-xs text-white/80 mt-1">calculado pelos eventos de status</p>
            </div>
          </div>
        )}

        {/* KPIs OEE da Máquina Selecionada */}
        {selectedMachine && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                  <Activity className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase">Disponibilidade</p>
                  <p className="text-2xl font-bold text-gray-900">{formatPercent(selectedMachineMetrics?.availability ?? null)}</p>
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-2">Tempo de operação / tempo total</p>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <TrendingUp className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase">Performance</p>
                  <p className="text-2xl font-bold text-gray-900">{formatPercent(selectedMachineMetrics?.performance ?? null)}</p>
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-2">Velocidade real / velocidade padrão</p>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                  <Target className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase">Qualidade</p>
                  <p className="text-2xl font-bold text-gray-900">{formatPercent(selectedMachineMetrics?.quality ?? null)}</p>
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-2">Prod. boa / produção total</p>
            </div>
          </div>
        )}

        {/* Atingimento da meta da máquina */}
        {selectedMachine && (
          <div className="bg-gradient-to-r from-green-500 via-blue-500 to-purple-500 rounded-2xl p-6 shadow-lg text-white">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center">
                  <Target className="h-8 w-8 text-white" />
                </div>
                <div>
                  <p className="text-sm font-medium text-white/90 uppercase tracking-wide">Meta Atingida</p>
                  <p className="text-5xl font-bold text-white mt-1">{formatPercent(selectedMachineMetrics?.efficiency ?? null)}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm text-white/80">
                  {formatQuantity(selectedMachineMetrics?.currentProduction)} de {formatQuantity(selectedMachineMetrics?.target)}
                </p>
                <p className="text-xs text-white/70 mt-1">Produção realizada / meta do período</p>
              </div>
            </div>
          </div>
        )}

        {selectedMachine && (
          <div className="grid grid-cols-1 xl:grid-cols-[1.4fr_1fr] gap-4">
            <div className="overflow-hidden rounded-xl border border-blue-100 bg-white shadow-sm">
              <div className="bg-gradient-to-r from-slate-900 via-blue-800 to-indigo-700 px-6 py-5 text-white">
                <h2 className="text-lg font-bold">Produção acumulada no período</h2>
                <p className="mt-1 text-sm text-white/75">Eventos reais agrupados a cada 30 minutos.</p>
              </div>
              <div className="p-6">
                <MachineTimeline data={(selectedMachineOverview?.timeline || []).map(item => ({
                  time: new Date(item.hour).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
                  value: item.production,
                }))}
                  periodLabel={selectedPeriod.label}
                  periodFrom={selectedPeriod.from}
                  periodTo={selectedPeriod.to}
                  total={selectedMachineMetrics?.currentProduction ?? null}
                  target={selectedMachineMetrics?.target ?? null}
                />
              </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
              <div className="mb-5">
                <h2 className="text-lg font-bold text-gray-900">Tempo por status</h2>
                <p className="mt-1 text-sm text-gray-500">{formatPeriodRange(selectedPeriod.from, selectedPeriod.to)}</p>
                <p className="mt-1 text-xs font-semibold text-gray-400">barras proporcionais ao filtro selecionado</p>
              </div>
              <div className="space-y-4">
                {[
                  { code: 1, label: 'Operação', color: 'bg-green-500' },
                  { code: 2, label: 'Ociosa', color: 'bg-orange-400' },
                  { code: 3, label: 'Manutenção', color: 'bg-red-500' },
                  { code: 0, label: 'Inativa', color: 'bg-gray-500' },
                ].map(item => {
                  const seconds = getOverviewStatusSeconds(selectedMachineOverview, item.code)
                  return (
                    <div key={item.code}>
                      <div className="mb-1 flex items-center justify-between text-sm">
                        <span className="font-medium text-gray-700">{item.label}</span>
                        <span className="text-gray-500">{formatDuration(seconds)}</span>
                      </div>
                      <div className="h-2 rounded-full bg-gray-100">
                        <div
                          className={`h-2 rounded-full ${item.color}`}
                          style={{ width: `${getStatusWidth(selectedMachineOverview, item.code, selectedPeriod.from, selectedPeriod.to)}%` }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )}

        {/* Filtros */}
        {!selectedMachine && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm space-y-2">
            <label className="block text-sm font-medium text-gray-600">Setor</label>
            <select
              value={selectedSector}
              onChange={(e) => handleSectorChange(e.target.value)}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:border-red-500 focus:outline-none"
            >
              <option value="">Todos os setores</option>
              {sectors.map((sector) => (
                <option key={sector} value={sector}>
                  {sector}
                </option>
              ))}
            </select>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm space-y-2">
            <label className="block text-sm font-medium text-gray-600">Centro de Custo</label>
            <select
              value={selectedCostCenter}
              onChange={(e) => setSelectedCostCenter(e.target.value)}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:border-red-500 focus:outline-none"
            >
              <option value="">Todos os centros</option>
              {costCenters.map((cc) => (
                <option key={cc} value={cc}>
                  {cc}
                </option>
              ))}
            </select>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm space-y-2">
            <label className="block text-sm font-medium text-gray-600">Status</label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:border-red-500 focus:outline-none"
            >
              <option value="">Todos</option>
              <option value="active">Ativas</option>
              <option value="inactive">Inativas</option>
            </select>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm space-y-2">
            <label className="block text-sm font-medium text-gray-600">Buscar</label>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Nome ou código..."
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:border-red-500 focus:outline-none"
            />
          </div>
        </div>
        )}

        {/* Lista de máquinas */}
        {!selectedMachine && (
          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <div className="mb-6 flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
            <h2 className="text-xl font-semibold text-gray-900">Máquinas</h2>
            <p className="text-sm text-gray-500">
              {filteredMachines.length} máquina{filteredMachines.length !== 1 ? 's' : ''} encontrada{filteredMachines.length !== 1 ? 's' : ''}
              {totalPages > 1 && ` - Página ${currentPage} de ${totalPages}`}
            </p>
            <div className="flex items-center">
              <div className="inline-flex rounded-lg border border-gray-200 bg-gray-50 p-1">
                <button onClick={() => setMachineListMode('all')} className={`rounded-md px-3 py-2 text-sm font-semibold transition-colors ${machineListMode === 'all' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}>
                  Todos
                </button>
                <button onClick={() => setMachineListMode('favorites')} className={`rounded-md px-3 py-2 text-sm font-semibold transition-colors ${machineListMode === 'favorites' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}>
                  Favoritos
                </button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {paginatedMachines.map((machine) => {
              const status = getMachineStatusFromData(machine)
              const productionValue = getProductionValue(machine)
              return (
                <div 
                  key={machine.id} 
                  onClick={() => setSelectedMachine(machine)}
                  onContextMenu={(e) => handleMachineContextMenu(e, machine)}
                  className={`rounded-xl border-4 ${getStatusBorder(status)} ${getStatusBackground(status)} ${status === 'MANUTENÇÃO' ? 'maintenance-pulse' : ''} ${status === 'OFFLINE' ? 'opacity-80' : ''} p-4 hover:shadow-2xl hover:scale-105 transition-all duration-300 relative overflow-hidden group cursor-pointer min-h-[180px] flex flex-col`}>
                  {/* Barra de status mais visível */}
                  <div className={`absolute top-0 left-0 w-full h-3 ${getStatusColor(status).split(' ')[0]}`} />
                  
                  {/* Badge de status */}
                  <div className={`absolute top-2 left-4 px-3 py-1 rounded-full text-xs font-bold text-white ${getStatusColor(status)}`}>
                    {getStatusLabel(status)}
                  </div>
                  
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      toggleFavorite(machine.id)
                    }}
                    className={`absolute top-4 right-4 p-2 rounded-full hover:bg-gray-100 transition-all z-10 ${recentlyFavoritedMachineId === machine.id ? 'favorite-pop' : ''}`}
                    title={favorites.has(machine.id) ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
                  >
                    <Star 
                      className={`h-6 w-6 ${favorites.has(machine.id) ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`} 
                    />
                  </button>
                  
                  <div className="mt-8">
                    <p className="text-xs text-gray-500 font-mono font-bold">{machine.code}</p>
                    <h3 className="mt-1 text-base font-bold text-gray-900 truncate leading-tight">{machine.name}</h3>
                    <p className="mt-1 text-xs text-gray-600 truncate font-semibold">{machine.cost_center}</p>
                    {machine.location && (
                      <p className="text-xs text-gray-400 truncate mt-0.5">{machine.location}</p>
                    )}
                  </div>

                  {/* Gauge semicircular com ponteiro */}
                  <div className="mt-2 flex items-center justify-center flex-1">
                    <GaugeSemiCircle
                      value={(() => {
                        const prod = toNumber(productionValue)
                        const meta = toNumber(machineGoals[machine.id]?.meta_producao_dia)
                        if (prod !== null && meta !== null && meta > 0) {
                          const percent = Math.round((prod / meta) * 100)
                          return percent
                        }
                        return null
                      })()}
                      min={0}
                      max={100}
                      label="Produção %"
                    />
                  </div>
                  
                  {/* Produção destacada */}
                  <div className="mt-2 bg-gray-50 rounded-lg p-2 border border-gray-200">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Produção</span>
                      <span className="text-sm font-black text-gray-900">
                        {productionValue !== null && productionValue !== undefined
                          ? formatTagValue(productionValue)
                          : '--'}
                        <span className="text-xs font-semibold text-gray-600 ml-1">peças</span>
                      </span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {filteredMachines.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              Nenhuma máquina encontrada com os filtros selecionados.
            </div>
          ) : totalPages > 1 && (
            <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-200">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="h-4 w-4" />
                Anterior
              </button>
              
              <div className="flex items-center gap-2">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum
                  if (totalPages <= 5) {
                    pageNum = i + 1
                  } else if (currentPage <= 3) {
                    pageNum = i + 1
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i
                  } else {
                    pageNum = currentPage - 2 + i
                  }
                  
                  return (
                    <button
                      key={pageNum}
                      onClick={() => setCurrentPage(pageNum)}
                      className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${
                        currentPage === pageNum
                          ? 'bg-red-600 text-white'
                          : 'border border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      {pageNum}
                    </button>
                  )
                })}
              </div>
              
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Próxima
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
        )}

        {/* Menu de contexto */}
        {contextMenu && contextMachine && (
          <ContextMenu
            options={getContextOptions()}
            onClose={closeContextMenu}
            position={contextMenu}
          />
        )}
      </div>
    </ProtectedLayout>
  )
}
