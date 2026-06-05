'use client'

import React, { Suspense, useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ProtectedLayout } from '@/components/layout/protected-layout'
import { useSelectedMachine } from '@/components/providers/selected-machine-provider'
import { useAuth } from '@/components/providers/auth-provider'
import { API_BASE_URL, apiFetch } from '@/lib/api'
import { usePageReady } from '@/components/providers/navigation-feedback-provider'
import { Activity, ArrowLeft, ChevronRight, Clock3, Factory, Filter, Folder, Gauge, TrendingUp } from 'lucide-react'

interface Machine {
  id: number
  name: string
  code: string
  cost_center: string
  location: string
  folder_id?: number | null
  folderId?: number | null
}

interface Mapping {
  role?: string
  tag_alias?: string
  tagAlias?: string
  tag_id?: number
  tag_config_id?: number
  tagConfigId?: number
}

interface RuntimeTag {
  tag_id: number
  value: unknown
  quality: string
  timestamp: string
}

interface DashboardData {
  production_total: number
  timeline: Array<{ time: string; value: number }>
  status_summary: Array<{ status: number; description: string; seconds: number }>
}

interface MachineFolder {
  id: number
  name: string
  parent_folder_id: number | null
  is_sector: boolean
}

interface ShiftDefinition {
  id: number
  codigo: string
  nome: string
  hora_inicio: string
  hora_fim: string
  ativo: boolean
}

const statusMeta: Record<number, { label: string; tone: string }> = {
  0: { label: 'Inativa', tone: 'bg-slate-500' },
  1: { label: 'Em operação', tone: 'bg-emerald-600' },
  2: { label: 'Ociosa', tone: 'bg-amber-500' },
  3: { label: 'Manutenção', tone: 'bg-red-600' },
}

const statusCardTone: Record<number, string> = {
  0: 'border-slate-200 bg-gradient-to-br from-slate-50 to-slate-100',
  1: 'border-emerald-200 bg-gradient-to-br from-emerald-50 to-green-100',
  2: 'border-amber-200 bg-gradient-to-br from-amber-50 to-orange-100',
  3: 'border-red-200 bg-gradient-to-br from-red-50 to-rose-100',
}

const toDateTimeLocalValue = (date: Date) => {
  const offsetDate = new Date(date.getTime() - date.getTimezoneOffset() * 60_000)
  return offsetDate.toISOString().slice(0, 16)
}
const normalizeShiftTime = (value: string) => value.slice(0, 5)
const formatPeriodRange = (from: Date, to: Date) =>
  `${from.toLocaleDateString('pt-BR')} ${from.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} - ${to.toLocaleDateString('pt-BR')} ${to.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`
const buildIndustrialDayPeriod = (now: Date) => {
  const from = new Date(now)
  from.setHours(5, 50, 0, 0)
  if (now < from) from.setDate(from.getDate() - 1)
  const to = new Date(from)
  to.setDate(to.getDate() + 1)
  to.setMinutes(to.getMinutes() - 1)
  return { from, to, label: 'dia produtivo' }
}
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

export default function StatusPage() {
  return (
    <Suspense fallback={<StatusLoading />}>
      <StatusPageContent />
    </Suspense>
  )
}

function StatusPageContent() {
  const { selectedMachine } = useSelectedMachine()
  const { token } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const machineId = searchParams.get('machine_id')
  const [machine, setMachine] = useState<Machine | null>(null)
  const [mappings, setMappings] = useState<Mapping[]>([])
  const [runtimeTags, setRuntimeTags] = useState<RuntimeTag[]>([])
  const [dashboard, setDashboard] = useState<DashboardData | null>(null)
  const [generalMachines, setGeneralMachines] = useState<Machine[]>([])
  const [generalMappings, setGeneralMappings] = useState<Record<number, Mapping[]>>({})
  const [folders, setFolders] = useState<MachineFolder[]>([])
  const [shifts, setShifts] = useState<ShiftDefinition[]>([])
  const [periodPreset, setPeriodPreset] = useState('today')
  const [customPeriod, setCustomPeriod] = useState(() => {
    const now = new Date()
    const from = new Date(now)
    from.setHours(0, 0, 0, 0)
    return {
      from: toDateTimeLocalValue(from),
      to: toDateTimeLocalValue(now),
    }
  })
  const [isLoading, setIsLoading] = useState(true)
  const [expandedSectorIds, setExpandedSectorIds] = useState<number[]>([])
  const [filterSectorId, setFilterSectorId] = useState<number | null | 'all'>('all')
  usePageReady(!isLoading)

  const activeMachineId = machineId ?? selectedMachine?.id?.toString() ?? null

  const selectedPeriod = useMemo(() => {
    const now = new Date()
    if (periodPreset === 'hour') {
      return { from: new Date(now.getTime() - 60 * 60 * 1000), to: now, label: 'última hora' }
    }

    if (periodPreset === 'month') {
      return { from: new Date(now.getFullYear(), now.getMonth(), 1), to: now, label: 'mês atual' }
    }

    if (periodPreset === 'custom') {
      const from = new Date(customPeriod.from)
      const to = new Date(customPeriod.to)
      return {
        from: Number.isNaN(from.getTime()) ? buildIndustrialDayPeriod(now).from : from,
        to: Number.isNaN(to.getTime()) ? now : to,
        label: 'janela personalizada',
      }
    }

    if (periodPreset.startsWith('shift:')) {
      const shiftId = Number(periodPreset.replace('shift:', ''))
      const shift = shifts.find((item) => item.id === shiftId)
      if (shift) return buildShiftPeriod(shift)
    }

    return buildIndustrialDayPeriod(now)
  }, [customPeriod.from, customPeriod.to, periodPreset, shifts])

  useEffect(() => {
    if (!token) return

    async function loadFilters() {
      const shiftsRes = await apiFetch(`${API_BASE_URL}/api/config/shifts`)
      const shiftsData = shiftsRes.ok ? await shiftsRes.json() : []

      setShifts((shiftsData ?? [])
        .filter((item: any) => item.ativo)
        .map((item: any) => ({
          id: item.id,
          codigo: item.codigo,
          nome: item.nome,
          hora_inicio: normalizeShiftTime(item.hora_inicio),
          hora_fim: normalizeShiftTime(item.hora_fim),
          ativo: item.ativo,
        })))
    }

    loadFilters().catch((error) => console.warn('Erro ao carregar filtros de status:', error))
  }, [token])

  useEffect(() => {
    if (!token) return
    if (!activeMachineId) {
      async function loadGeneral() {
        setIsLoading(true)
        const headers = {}
        const [machinesRes, foldersRes, runtimeRes] = await Promise.all([
          apiFetch(`${API_BASE_URL}/api/machines`, { headers }),
          apiFetch(`${API_BASE_URL}/api/machine-folders`, { headers }),
          apiFetch(`${API_BASE_URL}/api/runtime/state`, { headers }),
        ])
        const [machinesData, foldersData, runtimeData] = await Promise.all([
          machinesRes.json(),
          foldersRes.json(),
          runtimeRes.json(),
        ])

        const normalizedMachines = (machinesData ?? []).map((item: any) => ({
          id: item.id,
          name: item.name,
          code: item.code,
          cost_center: item.cost_center ?? item.costCenter ?? '',
          location: item.location ?? '',
          folder_id: item.folder_id ?? item.folderId ?? item.FolderId ?? null,
        }))
        const mappingPairs = await Promise.all(
          normalizedMachines.map(async (item: Machine) => {
            const response = await apiFetch(`${API_BASE_URL}/api/machines/${item.id}/tag-mapping`, { headers })
            const data = response.ok ? await response.json() : { mappings: [] }
            return [item.id, data.mappings ?? []] as const
          }),
        )

        setGeneralMachines(normalizedMachines)
        setFolders((foldersData ?? []).map((item: any) => ({
          id: item.id,
          name: item.name,
          parent_folder_id: item.parent_folder_id ?? item.parentFolderId ?? item.ParentFolderId ?? null,
          is_sector: item.is_sector ?? item.isSector ?? item.IsSector ?? false,
        })))
        setExpandedSectorIds([])
        setRuntimeTags(runtimeData ?? [])
        setGeneralMappings(Object.fromEntries(mappingPairs))
        setIsLoading(false)
      }

      loadGeneral().catch((error) => {
        console.error(error)
        setIsLoading(false)
      })
      return
    }

    async function load() {
      setIsLoading(true)
      const headers = {}
      const [machineRes, mappingRes, runtimeRes, dashboardRes] = await Promise.all([
        apiFetch(`${API_BASE_URL}/api/machines/${activeMachineId}`, { headers }),
        apiFetch(`${API_BASE_URL}/api/machines/${activeMachineId}/tag-mapping`, { headers }),
        apiFetch(`${API_BASE_URL}/api/runtime/state`, { headers }),
        apiFetch(`${API_BASE_URL}/api/reports/machine-dashboard?machine_id=${activeMachineId}&from=${encodeURIComponent(selectedPeriod.from.toISOString())}&to=${encodeURIComponent(selectedPeriod.to.toISOString())}`, { headers }),
      ])

      const machineData = await machineRes.json()
      const mappingData = await mappingRes.json()
      const runtimeData = await runtimeRes.json()
      const dashboardData = await dashboardRes.json()

      setMachine(machineData)
      setMappings(mappingData.mappings ?? [])
      setRuntimeTags(runtimeData)
      setDashboard(dashboardData)
      setIsLoading(false)
    }

    load().catch((error) => {
      console.error(error)
      setIsLoading(false)
    })
  }, [activeMachineId, selectedPeriod.from, selectedPeriod.to, token])

  const currentStatus = useMemo(() => {
    const mapping = mappings.find((item) => (item.role ?? item.tag_alias ?? item.tagAlias) === 'machine_status')
    const tagId = mapping?.tag_id ?? mapping?.tag_config_id ?? mapping?.tagConfigId
    const runtime = runtimeTags.find((tag) => tag.tag_id === tagId)
    const value = Number(runtime?.value)
    return Number.isFinite(value) ? value : 0
  }, [mappings, runtimeTags])

  const currentProduction = useMemo(() => {
    const mapping = mappings.find((item) => (item.role ?? item.tag_alias ?? item.tagAlias) === 'production_counter')
    const tagId = mapping?.tag_id ?? mapping?.tag_config_id ?? mapping?.tagConfigId
    const runtime = runtimeTags.find((tag) => tag.tag_id === tagId)
    const value = Number(runtime?.value)
    return Number.isFinite(value) ? value : null
  }, [mappings, runtimeTags])

  const totalSeconds = dashboard?.status_summary.reduce((sum, item) => sum + item.seconds, 0) ?? 0
  const status = statusMeta[currentStatus] ?? statusMeta[0]
  const generalRows = useMemo(() => {
    return generalMachines.map((item) => {
      const mapping = (generalMappings[item.id] ?? []).find((entry) => (entry.role ?? entry.tag_alias ?? entry.tagAlias) === 'machine_status')
      const tagId = mapping?.tag_id ?? mapping?.tag_config_id ?? mapping?.tagConfigId
      const runtime = runtimeTags.find((tag) => tag.tag_id === tagId)
      const rawStatus = Number(runtime?.value)
      const normalizedStatus = Number.isFinite(rawStatus) && rawStatus >= 0 && rawStatus <= 3 ? rawStatus : 0
      return {
        machine: item,
        status: normalizedStatus,
        folderName: getTopLevelFolderName(item.folder_id ?? item.folderId ?? null, folders),
      }
    })
  }, [folders, generalMachines, generalMappings, runtimeTags])
  const generalTotals = useMemo(() => {
    return [0, 1, 2, 3].map((code) => ({
      code,
      count: generalRows.filter((item) => item.status === code).length,
    }))
  }, [generalRows])
  const statusByFolder = useMemo(() => {
    const grouped = new Map<string, typeof generalRows>()
    generalRows.forEach((row) => {
      const key = row.folderName
      grouped.set(key, [...(grouped.get(key) ?? []), row])
    })
    return Array.from(grouped.entries()).map(([folderName, rows]) => ({
      folderName,
      total: rows.length,
      counts: [0, 1, 2, 3].map((code) => ({
        code,
        count: rows.filter((row) => row.status === code).length,
      })),
    }))
  }, [generalRows])
  const sectors = useMemo(() => {
    const sectorFolders = folders.filter((f) => f.is_sector)
    return sectorFolders.map((sector) => {
      const machinesInSector = generalRows.filter((row) => {
        if (!row.machine.folder_id && !row.machine.folderId) return false
        const sectorFolderIds = getSectorFolderIds(sector.id, folders)
        return sectorFolderIds.includes(row.machine.folder_id ?? row.machine.folderId ?? 0)
      })
      const operatingCount = machinesInSector.filter((row) => row.status === 1).length
      const totalCount = machinesInSector.length
      const healthPercent = totalCount > 0 ? Math.round((operatingCount / totalCount) * 100) : 0
      return {
        sector,
        machines: machinesInSector,
        operatingCount,
        totalCount,
        healthPercent,
      }
    })
  }, [folders, generalRows])
  const filteredRows = filterSectorId === 'all'
    ? generalRows
    : generalRows.filter((row) => {
        if (filterSectorId === null) return !row.machine.folder_id && !row.machine.folderId
        const sectorFolderIds = getSectorFolderIds(filterSectorId, folders)
        return sectorFolderIds.includes(row.machine.folder_id ?? row.machine.folderId ?? 0)
      })
  const filteredTotals = useMemo(() => {
    return [0, 1, 2, 3].map((code) => ({
      code,
      count: filteredRows.filter((item) => item.status === code).length,
    }))
  }, [filteredRows])
  const toggleSector = (sectorId: number) => {
    setExpandedSectorIds((previous) =>
      previous.includes(sectorId)
        ? previous.filter((id) => id !== sectorId)
        : [...previous, sectorId],
    )
  }
  const expandAllSectors = () => {
    setExpandedSectorIds(sectors.map((s) => s.sector.id))
  }
  const collapseAllSectors = () => {
    setExpandedSectorIds([])
  }

  return (
    <ProtectedLayout>
      <div className="space-y-6">
        <header className="flex items-center gap-4">
          <button onClick={() => router.back()} className="rounded-lg p-2 transition-colors hover:bg-gray-100">
            <ArrowLeft className="h-5 w-5 text-gray-600" />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{activeMachineId ? 'Status da Máquina' : 'Status Geral dos Equipamentos'}</h1>
            <p className="mt-1 text-gray-600">
              {activeMachineId ? (machine ? `${machine.name} (${machine.code})` : 'Carregando máquina...') : 'Resumo operacional por pasta da estrutura de máquinas'}
            </p>
          </div>
        </header>

        <section className="rounded-xl border border-blue-100 bg-gradient-to-br from-slate-50 to-blue-50 p-4 shadow-sm">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h2 className="text-lg font-bold text-gray-900">Janela de análise</h2>
              <p className="mt-1 text-sm text-gray-500">Os indicadores abaixo respondem ao período escolhido.</p>
            </div>
            <div className="flex flex-col gap-3 md:flex-row md:items-end">
              <label className="space-y-1 text-sm">
                <span className="block text-gray-500">Período</span>
                <select
                  value={periodPreset}
                  onChange={(event) => setPeriodPreset(event.target.value)}
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
        </section>

        {!activeMachineId ? (
          isLoading ? (
            <div className="rounded-xl border border-gray-200 bg-white p-8 text-center text-gray-500">Carregando status geral...</div>
          ) : (
            <>
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                {filteredTotals.map((item) => (
                  <KpiCard
                    key={item.code}
                    icon={<Activity className="h-5 w-5" />}
                    label={statusMeta[item.code].label}
                    value={String(item.count)}
                    tone={statusMeta[item.code].tone}
                  />
                ))}
              </div>

              <section>
                <div className="mb-5 flex items-center justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-bold text-gray-900">Visão por Setor</h2>
                    <p className="mt-1 text-sm text-gray-500">Agrupado por setores operacionais da estrutura de máquinas.</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <select
                      value={String(filterSectorId)}
                      onChange={(e) => setFilterSectorId(e.target.value === 'all' ? 'all' : e.target.value === 'null' ? null : Number(e.target.value))}
                      className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 focus:border-blue-500 focus:outline-none"
                    >
                      <option value="all">Todos os setores</option>
                      <option value="null">Sem setor</option>
                      {folders.filter((f) => f.is_sector).map((sector) => (
                        <option key={sector.id} value={sector.id}>{sector.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="grid gap-6 lg:grid-cols-2 xl:grid-cols-3">
                  {sectors.map((sectorData) => {
                    const isExpanded = expandedSectorIds.includes(sectorData.sector.id)
                    const healthColor = sectorData.healthPercent >= 80 ? 'bg-emerald-500' : sectorData.healthPercent >= 50 ? 'bg-amber-500' : 'bg-red-500'
                    return (
                      <div key={sectorData.sector.id} className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
                        <button
                          onClick={() => toggleSector(sectorData.sector.id)}
                          className="flex w-full items-center justify-between p-4 text-left transition-colors hover:bg-gray-50"
                        >
                          <div className="flex items-center gap-3">
                            <Folder className="h-5 w-5 text-amber-500" />
                            <div>
                              <h3 className="font-semibold text-gray-900">{sectorData.sector.name}</h3>
                              <p className="text-sm text-gray-500">{sectorData.totalCount} máquina{sectorData.totalCount === 1 ? '' : 's'}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="flex items-center gap-2">
                              <span className="text-sm text-gray-600">Saúde:</span>
                              <div className="flex items-center gap-2">
                                <div className="h-2 w-16 rounded-full bg-gray-200">
                                  <div
                                    className={`h-full rounded-full ${healthColor}`}
                                    style={{ width: `${sectorData.healthPercent}%` }}
                                  />
                                </div>
                                <span className="text-sm font-semibold text-gray-700">{sectorData.healthPercent}%</span>
                              </div>
                            </div>
                            <ChevronRight className={`h-5 w-5 text-gray-400 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                          </div>
                        </button>
                        {isExpanded && (
                          <div className="border-t border-gray-200 p-4">
                            <div className="space-y-2">
                              {sectorData.machines.map((row) => (
                                <div
                                  key={row.machine.id}
                                  className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 p-3 transition-colors hover:bg-gray-100"
                                >
                                  <div className="flex items-center gap-2">
                                    <span className={`h-2.5 w-2.5 rounded-full ${statusMeta[row.status].tone}`} />
                                    <span className="text-sm font-semibold text-gray-900">{row.machine.name}</span>
                                  </div>
                                  <div className="flex items-center gap-3">
                                    <span className="text-xs text-gray-500">{row.machine.code}</span>
                                    <span className="text-xs font-medium text-gray-600">{statusMeta[row.status].label}</span>
                                  </div>
                                </div>
                              ))}
                              {sectorData.machines.length === 0 && (
                                <p className="text-sm text-gray-500">Nenhuma máquina neste setor.</p>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })}
                  {sectors.length === 0 && (
                    <p className="text-center text-gray-500">Nenhum setor configurado.</p>
                  )}
                </div>
              </section>
            </>
          )
        ) : isLoading ? (
          <div className="rounded-xl border border-gray-200 bg-white p-8 text-center text-gray-500">Carregando dados reais...</div>
        ) : (
          <>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <KpiCard icon={<Activity className="h-5 w-5" />} label="Status atual" value={status.label} tone={status.tone} />
              <KpiCard icon={<TrendingUp className="h-5 w-5" />} label="Produção acumulada no período" value={String(dashboard?.production_total ?? 0)} tone="bg-blue-600" />
              <KpiCard icon={<Gauge className="h-5 w-5" />} label="Contador atual" value={currentProduction === null ? '-' : String(currentProduction)} tone="bg-violet-600" />
              <KpiCard icon={<Clock3 className="h-5 w-5" />} label="Tempo monitorado" value={formatDuration(totalSeconds)} tone="bg-slate-700" />
            </div>

            <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
              <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                <div>
                  <h2 className="text-lg font-bold text-gray-900">Distribuição de status no período</h2>
                  <p className="mt-1 text-sm text-gray-500">{formatPeriodRange(selectedPeriod.from, selectedPeriod.to)}</p>
                </div>
                <div className="rounded-xl bg-slate-900 px-4 py-3 text-white shadow-md">
                  <p className="text-[11px] font-bold uppercase text-white/65">tempo monitorado</p>
                  <p className="text-xl font-black">{formatDuration(totalSeconds)}</p>
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                {[0, 1, 2, 3].map((code) => {
                  const item = dashboard?.status_summary.find((entry) => entry.status === code)
                  const percent = totalSeconds > 0 ? Math.round(((item?.seconds ?? 0) / totalSeconds) * 100) : 0
                  return (
                    <div key={code} className={`rounded-xl border p-4 shadow-sm ${statusCardTone[code]}`}>
                      <div className="mb-3 flex items-center gap-2">
                        <span className={`h-2.5 w-2.5 rounded-full ${statusMeta[code].tone}`} />
                        <span className="text-sm font-semibold text-gray-700">{statusMeta[code].label}</span>
                      </div>
                      <p className="text-2xl font-bold text-gray-900">{formatDuration(item?.seconds ?? 0)}</p>
                      <div className="mt-3 h-2 rounded-full bg-white/70">
                        <div className={`h-full rounded-full ${statusMeta[code].tone}`} style={{ width: `${percent}%` }} />
                      </div>
                      <p className="mt-2 text-xs font-semibold text-gray-500">{percent}% do período monitorado</p>
                    </div>
                  )
                })}
              </div>
            </section>

            <section className="overflow-hidden rounded-xl border border-blue-100 bg-white shadow-sm">
              <div className="bg-gradient-to-r from-slate-900 via-blue-800 to-indigo-700 px-6 py-5 text-white">
                <h2 className="text-lg font-bold">Produção acumulada no período</h2>
                <p className="mt-1 text-sm text-white/75">Eventos reais de produção agrupados a cada 30 minutos.</p>
              </div>
              <div className="p-6">
                <TimelineChart data={dashboard?.timeline ?? []} periodFrom={selectedPeriod.from} periodTo={selectedPeriod.to} />
              </div>
            </section>
          </>
        )}
      </div>
    </ProtectedLayout>
  )
}

function StatusLoading() {
  return (
    <ProtectedLayout>
      <div className="rounded-xl border border-gray-200 bg-white p-8 text-center text-gray-500">
        Carregando dados reais...
      </div>
    </ProtectedLayout>
  )
}

function KpiCard({ icon, label, value, tone }: { icon: React.ReactNode; label: string; value: string; tone: string }) {
  const gradientTone = {
    'bg-slate-500': 'bg-gradient-to-br from-slate-400 via-slate-500 to-slate-700',
    'bg-emerald-600': 'bg-gradient-to-br from-emerald-400 via-green-500 to-teal-600',
    'bg-amber-500': 'bg-gradient-to-br from-amber-400 via-orange-500 to-orange-700',
    'bg-red-600': 'bg-gradient-to-br from-rose-400 via-red-500 to-red-700',
    'bg-blue-600': 'bg-gradient-to-br from-sky-400 via-blue-500 to-indigo-600',
    'bg-violet-600': 'bg-gradient-to-br from-violet-400 via-purple-500 to-indigo-700',
    'bg-slate-700': 'bg-gradient-to-br from-slate-500 via-slate-700 to-gray-900',
  }[tone] ?? tone

  return (
    <div className={`${gradientTone} rounded-xl p-5 text-white shadow-lg`}>
      <div className="mb-3 flex items-center gap-2 text-white/85">
        {icon}
        <span className="text-sm font-medium">{label}</span>
      </div>
      <p className="text-3xl font-bold">{value}</p>
    </div>
  )
}

function TimelineChart({
  data,
  periodFrom,
  periodTo,
}: {
  data: Array<{ time: string; value: number }>
  periodFrom: Date
  periodTo: Date
}) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)

  if (!data.length) {
    return (
      <div className="flex h-52 items-center justify-center rounded-lg border border-dashed border-gray-300 text-sm text-gray-500">
        Ainda não há eventos de produção no período.
      </div>
    )
  }

  const max = Math.max(...data.map((item) => item.value), 1)
  const chartTop = 8
  const chartBottom = 86
  const chartLeft = 5
  const chartRight = 96
  const chartHeight = chartBottom - chartTop
  const chartWidth = chartRight - chartLeft
  const chartPoints = data.map((item, index) => {
    const x = data.length === 1 ? chartLeft : chartLeft + (index / (data.length - 1)) * chartWidth
    const y = chartBottom - (item.value / max) * chartHeight
    const date = parseTimelineDate(item.time, periodFrom)
    return { x, y, item, index, date }
  })
  const points = chartPoints.map((point) => `${point.x},${point.y}`).join(' ')
  const hoveredPoint = hoveredIndex === null ? null : chartPoints[hoveredIndex]
  const labelStep = data.length <= 6 ? 1 : Math.ceil((data.length - 1) / 5)
  const labelIndexes = Array.from(new Set([
    0,
    ...data.map((_, index) => index).filter((index) => index % labelStep === 0),
    data.length - 1,
  ])).sort((a, b) => a - b)
  const bestPoint = chartPoints.reduce((best, item) => item.item.value > best.item.value ? item : best, chartPoints[0])

  return (
    <div className="rounded-xl bg-gradient-to-br from-slate-50 to-blue-50 p-5">
      <div className="mb-4 grid gap-3 md:grid-cols-3">
        <div className="rounded-xl border border-blue-100 bg-white/90 px-4 py-3 shadow-sm">
          <p className="text-xs font-bold uppercase text-gray-500">Período</p>
          <p className="mt-1 text-sm font-semibold text-gray-900">{formatPeriodRange(periodFrom, periodTo)}</p>
        </div>
        <div className="rounded-xl border border-emerald-100 bg-white/90 px-4 py-3 shadow-sm">
          <p className="text-xs font-bold uppercase text-gray-500">Pico acumulado</p>
          <p className="mt-1 text-xl font-black text-gray-900">{formatNumber(bestPoint.item.value)}</p>
          <p className="text-xs text-gray-500">{formatPointDate(bestPoint.date)}</p>
        </div>
        <div className="rounded-xl border border-amber-100 bg-white/90 px-4 py-3 shadow-sm">
          <p className="text-xs font-bold uppercase text-gray-500">Pontos</p>
          <p className="mt-1 text-xl font-black text-gray-900">{data.length}</p>
          <p className="text-xs text-gray-500">intervalos com leitura</p>
        </div>
      </div>

      <div className="relative rounded-xl bg-white p-4 shadow-inner ring-1 ring-blue-100">
        <svg width="100%" height={240} viewBox="0 0 100 100" preserveAspectRatio="none">
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
          {chartPoints.map((point) => (
            <circle key={`${point.item.time}-${point.index}`} cx={point.x} cy={point.y} r={point.item.value > 0 ? 1.2 : 0.65} fill={point.index === bestPoint.index ? '#10b981' : '#2563eb'} />
          ))}
        </svg>
        <div className="absolute left-4 right-4 top-4 h-[240px]" onMouseLeave={() => setHoveredIndex(null)}>
          {chartPoints.map((point) => (
            <div
              key={`hover-${point.item.time}-${point.index}`}
              className="absolute top-0 h-full w-8 -translate-x-1/2 cursor-crosshair"
              style={{ left: `${point.x}%` }}
              onMouseEnter={() => setHoveredIndex(point.index)}
              aria-label={`${formatPointDate(point.date)}: ${formatNumber(point.item.value)} peças`}
            />
          ))}
          {hoveredPoint && (
            <div
              className="pointer-events-none absolute z-10 min-w-44 -translate-x-1/2 rounded-xl bg-gray-950 px-3 py-2 text-white shadow-xl"
              style={{
                left: `${hoveredPoint.x}%`,
                top: `${Math.max(4, hoveredPoint.y - 18)}%`,
              }}
            >
              <p className="text-[11px] font-semibold uppercase text-blue-200">{formatPointDate(hoveredPoint.date)}</p>
              <p className="text-lg font-black leading-tight">{formatNumber(hoveredPoint.item.value)}</p>
              <p className="text-[11px] text-gray-300">peças acumuladas</p>
            </div>
          )}
        </div>
        <div className="pointer-events-none absolute left-4 top-4 flex h-[240px] flex-col justify-between py-1 text-[11px] font-semibold text-gray-400">
          <span>{formatNumber(max)}</span>
          <span>{formatNumber(max / 2)}</span>
          <span>0</span>
        </div>
      </div>

      <div className="relative mt-3 h-5 text-[11px] text-gray-500">
        {labelIndexes.map((index) => {
          const point = chartPoints[index]
          const left = data.length === 1 ? 0 : (index / (data.length - 1)) * 100
          const alignmentClass = index === 0
            ? 'translate-x-0 text-left'
            : index === data.length - 1
              ? '-translate-x-full text-right'
              : '-translate-x-1/2 text-center'

          return (
            <span key={`${point.item.time}-${index}`} className={`absolute top-0 whitespace-nowrap ${alignmentClass}`} style={{ left: `${left}%` }}>
              {point.date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
            </span>
          )
        })}
      </div>
    </div>
  )
}

function formatNumber(value: number) {
  return new Intl.NumberFormat('pt-BR', {
    maximumFractionDigits: Number.isInteger(value) ? 0 : 1,
  }).format(value)
}

function formatPointDate(date: Date) {
  return `${date.toLocaleDateString('pt-BR')} ${date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`
}

function parseTimelineDate(value: string, fallbackDate: Date) {
  const parsed = new Date(value)
  if (!Number.isNaN(parsed.getTime())) return parsed

  const match = value.match(/^(\d{1,2}):(\d{2})/)
  if (!match) return fallbackDate

  const date = new Date(fallbackDate)
  date.setHours(Number(match[1]), Number(match[2]), 0, 0)
  return date
}

function formatDuration(seconds: number) {
  const totalMinutes = Math.floor(seconds / 60)
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  return `${hours}h ${minutes}m`
}

function getFolderPath(folderId: number | null | undefined, folders: MachineFolder[]) {
  if (!folderId) return 'Raiz'
  const folder = folders.find((item) => item.id === folderId)
  if (!folder) return 'Raiz'

  const names = [folder.name]
  let cursor = folders.find((item) => item.id === folder.parent_folder_id) ?? null
  while (cursor) {
    names.unshift(cursor.name)
    cursor = folders.find((item) => item.id === cursor?.parent_folder_id) ?? null
  }
  return names.join(' / ')
}

function getTopLevelFolderName(folderId: number | null | undefined, folders: MachineFolder[]) {
  if (!folderId) return 'Sem setor'
  let cursor = folders.find((item) => item.id === folderId) ?? null

  while (cursor) {
    if (cursor.is_sector) return cursor.name
    cursor = folders.find((item) => item.id === cursor?.parent_folder_id) ?? null
  }

  return 'Sem setor'
}

function getSectorFolderIds(sectorId: number, folders: MachineFolder[]): number[] {
  const sector = folders.find((f) => f.id === sectorId)
  if (!sector) return []

  const ids = [sector.id]
  const queue = folders.filter((f) => f.parent_folder_id === sectorId)

  while (queue.length > 0) {
    const current = queue.shift()!
    ids.push(current.id)
    queue.push(...folders.filter((f) => f.parent_folder_id === current.id))
  }

  return ids
}
