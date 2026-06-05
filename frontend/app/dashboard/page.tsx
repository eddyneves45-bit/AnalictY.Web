'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { BarChart3, CalendarDays, Expand, Gauge, LayoutDashboard, RefreshCw } from 'lucide-react'
import GridLayout, { noCompactor } from 'react-grid-layout'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { ProtectedLayout } from '@/components/layout/protected-layout'
import { useSelectedMachine } from '@/components/providers/selected-machine-provider'
import { API_BASE_URL, apiFetch } from '@/lib/api'
import { usePageReady } from '@/components/providers/navigation-feedback-provider'

type Widget = { id: string; type: 'kpi' | 'bar' | 'pie' | 'line'; metric: string; title: string; color?: string; x?: number; y?: number; w?: number; h?: number }
type DashboardConfig = { id?: number; name: string; machineId: string; refreshInterval: string; widgets: Widget[] }

const fallbackWidgets: Widget[] = [
  { id: 'kpi-production', type: 'kpi', metric: 'production', title: 'Produção atual', color: '#2563eb', x: 0, y: 0, w: 6, h: 3 },
  { id: 'kpi-target', type: 'kpi', metric: 'target', title: 'Meta e atingimento', color: '#16a34a', x: 6, y: 0, w: 6, h: 3 },
  { id: 'bar-shift', type: 'bar', metric: 'production_by_shift', title: 'Produção por turno', color: '#0891b2', x: 0, y: 3, w: 6, h: 4 },
  { id: 'pie-status', type: 'pie', metric: 'status_distribution', title: 'Distribuição de status', color: '#f59e0b', x: 6, y: 3, w: 6, h: 4 },
]

const colors = ['#2563eb', '#16a34a', '#0891b2', '#f59e0b', '#475569']

export default function DashboardPage() {
  const dashboardRef = useRef<HTMLDivElement | null>(null)
  const params = useSearchParams()
  const { selectedMachine } = useSelectedMachine()
  const machineId = params.get('machine_id') ?? (selectedMachine?.id ? String(selectedMachine.id) : '')
  const [date, setDate] = useState(toDateInputValue(new Date()))
  const [config, setConfig] = useState<DashboardConfig | null>(null)
  const [shiftData, setShiftData] = useState<any | null>(null)
  const [overview, setOverview] = useState<any | null>(null)
  const [loading, setLoading] = useState(true)
  const [lastUpdatedAt, setLastUpdatedAt] = useState<Date | null>(null)
  const [error, setError] = useState('')
  usePageReady(!loading)

  const widgets = config?.widgets?.length ? config.widgets : fallbackWidgets
  const machineLabel = overview?.machine?.name ?? selectedMachine?.name ?? (machineId ? `Máquina ${machineId}` : 'Máquina')
  const refreshMs = Math.max(Number(config?.refreshInterval ?? 10), 5) * 1000

  const overviewWindow = useMemo(() => {
    const from = new Date(`${date}T00:00:00`)
    const to = new Date(`${date}T23:59:59`)
    return { from, to }
  }, [date])

  useEffect(() => {
    if (!machineId) {
      setLoading(false)
      return
    }
    void loadAll()
  }, [machineId, date])

  useEffect(() => {
    if (!machineId) return
    const interval = window.setInterval(() => void loadDataOnly(), refreshMs)
    return () => window.clearInterval(interval)
  }, [machineId, date, refreshMs])

  async function loadAll() {
    setLoading(true)
    setError('')
    try {
      await Promise.all([loadConfig(), loadDataOnly()])
    } catch (caughtError) {
      console.error(caughtError)
      setError('Não foi possível carregar o dashboard.')
    } finally {
      setLoading(false)
    }
  }

  async function loadConfig() {
    const response = await apiFetch(`${API_BASE_URL}/api/dashboard/configs/default?machine_id=${machineId}`)
    if (response.status === 404) {
      setConfig(null)
      return
    }
    if (!response.ok) throw new Error('Dashboard config')
    setConfig(normalizeDashboard(await response.json()))
  }

  async function loadDataOnly() {
    const from = encodeURIComponent(overviewWindow.from.toISOString())
    const to = encodeURIComponent(overviewWindow.to.toISOString())
    const [shiftResponse, overviewResponse] = await Promise.all([
      apiFetch(`${API_BASE_URL}/api/bi/machines/${machineId}/production-by-shift?date=${date}`),
      apiFetch(`${API_BASE_URL}/api/bi/machines/${machineId}/overview?from=${from}&to=${to}&target_mode=full_day`),
    ])
    if (!shiftResponse.ok || !overviewResponse.ok) throw new Error('Dashboard data')
    setShiftData(await shiftResponse.json())
    setOverview(await overviewResponse.json())
    setLastUpdatedAt(new Date())
  }

  function enterFullscreen() {
    void dashboardRef.current?.requestFullscreen?.()
  }

  return (
    <ProtectedLayout>
      <div ref={dashboardRef} className="space-y-5 bg-gray-100 [&:fullscreen]:overflow-auto [&:fullscreen]:bg-slate-100 [&:fullscreen]:p-6">
        <header className="flex flex-col gap-4 rounded-lg border border-slate-200 bg-white px-5 py-4 shadow-sm lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex items-center gap-2 text-sm font-bold uppercase text-blue-700">
              <LayoutDashboard className="h-4 w-4" />
              Dashboard
            </div>
            <h1 className="mt-1 text-3xl font-black text-gray-900">{config?.name ?? 'Dashboard operacional'}</h1>
            <p className="mt-1 text-sm text-gray-500">
              {machineLabel}
              <span className="mx-2 text-gray-300">|</span>
              Última atualização: {lastUpdatedAt ? formatDateTime(lastUpdatedAt) : '--'}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <label className="relative">
              <CalendarDays className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
              <input type="date" value={date} onChange={(event) => setDate(event.target.value)} className="h-10 rounded-lg border border-gray-300 pl-9 pr-3 text-sm" />
            </label>
            <button onClick={() => void loadAll()} className="inline-flex h-10 items-center gap-2 rounded-lg border px-3 text-sm font-bold text-gray-700 hover:bg-gray-50">
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Atualizar
            </button>
            <button onClick={enterFullscreen} className="inline-flex h-10 items-center gap-2 rounded-lg bg-blue-700 px-3 text-sm font-bold text-white hover:bg-blue-800">
              <Expand className="h-4 w-4" />
              Tela cheia
            </button>
          </div>
        </header>

        {!machineId && <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">Selecione uma máquina para abrir o dashboard.</div>}
        {error && <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

        <section className="overflow-x-auto">
          <div className="min-w-[1280px]">
            <GridLayout
              className="layout"
              width={1280}
              gridConfig={{ cols: 12, rowHeight: 82 }}
              layout={widgets.map((widget, index) => ({
                i: widget.id,
                x: widget.x ?? (index % 2) * 6,
                y: widget.y ?? Math.floor(index / 2) * 4,
                w: widget.w ?? 6,
                h: widget.h ?? (widget.type === 'kpi' ? 3 : 4),
              }))}
              dragConfig={{ enabled: false }}
              resizeConfig={{ enabled: false }}
              compactor={noCompactor}
            >
              {widgets.map((widget) => (
                <div key={widget.id}>
                  <WidgetPanel widget={widget} shiftData={shiftData} overview={overview} />
                </div>
              ))}
            </GridLayout>
          </div>
        </section>
      </div>
    </ProtectedLayout>
  )
}

function WidgetPanel({ widget, shiftData, overview }: { widget: Widget; shiftData: any; overview: any }) {
  const color = widget.color ?? colors[0]
  if (widget.type === 'kpi') {
    const value = widget.metric === 'target'
      ? formatNumber(shiftData?.totals?.target)
      : formatNumber(shiftData?.totals?.production ?? overview?.production?.total)
    const detail = widget.metric === 'target'
      ? `${formatNumber(shiftData?.totals?.attainment_percent)}% atingido`
      : `Boas ${formatNumber(shiftData?.totals?.good)} · perdas ${formatNumber(shiftData?.totals?.losses)}`
    return (
      <article
        className="flex h-full flex-col rounded-lg border border-slate-700 p-6 text-white shadow-sm"
        style={{ background: `linear-gradient(135deg, #0f172a 0%, ${color} 55%, #1e293b 100%)` }}
      >
        <Gauge className="mb-8 h-8 w-8 text-white/80" />
        <p className="text-sm font-bold uppercase text-white/75">{widget.title}</p>
        <p className="mt-3 text-6xl font-black">{value}</p>
        <p className="mt-2 text-sm text-white/75">{detail}</p>
      </article>
    )
  }

  return (
    <article className="flex h-full flex-col rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="mb-4 flex items-center gap-2 font-bold text-gray-900">
        <BarChart3 className="h-5 w-5 text-blue-700" />
        {widget.title}
      </h2>
      <div className="min-h-0 flex-1">{renderChart(widget, shiftData, overview)}</div>
    </article>
  )
}

function renderChart(widget: Widget, shiftData: any, overview: any) {
  const color = widget.color ?? colors[0]
  if (widget.metric === 'production_by_shift') {
    const data = (shiftData?.items ?? []).map((item: any) => ({ name: item.shift_name, produção: item.production, meta: item.target }))
    return (
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" />
          <YAxis />
          <Tooltip />
          <Bar dataKey="produção" fill={color} />
          <Bar dataKey="meta" fill="#16a34a" />
        </BarChart>
      </ResponsiveContainer>
    )
  }

  if (widget.metric === 'loss_quality') {
    const data = [
      { name: 'Boas', value: Number(shiftData?.totals?.good ?? 0) },
      { name: 'Perdas', value: Number(shiftData?.totals?.losses ?? 0) },
    ]
    return <PieBlock data={data} primaryColor={color} />
  }

  if (widget.metric === 'status_distribution') {
    const status = overview?.status ?? {}
    const data = [
      { name: 'Produzindo', value: Number(status.production_seconds ?? 0) / 60 },
      { name: 'Ociosa', value: Number(status.idle_seconds ?? 0) / 60 },
      { name: 'Manutenção', value: Number(status.maintenance_seconds ?? 0) / 60 },
      { name: 'Inativa', value: Number(status.inactive_seconds ?? 0) / 60 },
    ].filter((item) => item.value > 0)
    return <PieBlock data={data.length ? data : [{ name: 'Sem dados', value: 1 }]} primaryColor={color} />
  }

  const data = (overview?.timeline ?? []).map((item: any) => ({
    time: new Date(item.hour).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
    produção: item.production,
  }))
  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="time" />
        <YAxis />
        <Tooltip />
        <Line type="monotone" dataKey="produção" stroke={color} strokeWidth={3} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  )
}

function PieBlock({ data, primaryColor }: { data: Array<{ name: string; value: number }>; primaryColor: string }) {
  const palette = [primaryColor, ...colors.filter((color) => color.toLowerCase() !== primaryColor.toLowerCase())]
  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie data={data} dataKey="value" nameKey="name" innerRadius={55} outerRadius={90} label>
          {data.map((_, index) => <Cell key={index} fill={palette[index % palette.length]} />)}
        </Pie>
        <Tooltip />
      </PieChart>
    </ResponsiveContainer>
  )
}

function normalizeDashboard(raw: any): DashboardConfig {
  const rawWidgets = raw.widgets ?? raw.Widgets ?? []
  const duplicatedPositions = new Set<string>()
  const seenPositions = new Set<string>()
  rawWidgets.forEach((widget: any) => {
    const positionKey = `${widget.x ?? ''}:${widget.y ?? ''}`
    if (seenPositions.has(positionKey)) duplicatedPositions.add(positionKey)
    seenPositions.add(positionKey)
  })
  return {
    id: Number(raw.id ?? raw.Id),
    name: raw.name ?? raw.Name,
    machineId: String(raw.machineId ?? raw.MachineId ?? ''),
    refreshInterval: String(raw.refreshInterval ?? raw.RefreshInterval ?? '10'),
    widgets: rawWidgets.map((widget: any, index: number) => normalizeWidget(widget, index, duplicatedPositions)),
  }
}

function normalizeWidget(widget: any, index: number, duplicatedPositions: Set<string>): Widget {
  const positionKey = `${widget.x ?? ''}:${widget.y ?? ''}`
  const hasPosition = Number.isFinite(Number(widget.x)) && Number.isFinite(Number(widget.y)) && !duplicatedPositions.has(positionKey)
  const hasSize = Number.isFinite(Number(widget.w)) && Number.isFinite(Number(widget.h))
  return {
    id: widget.id ?? `${widget.type}-${widget.metric}`,
    type: widget.type,
    metric: widget.metric,
    title: widget.title,
    color: widget.color ?? colors[index % colors.length],
    x: hasPosition ? Number(widget.x) : (index % 2) * 6,
    y: hasPosition ? Number(widget.y) : Math.floor(index / 2) * 4,
    w: hasSize ? Number(widget.w) : 6,
    h: hasSize ? Number(widget.h) : (widget.type === 'kpi' ? 3 : 4),
  }
}

function toDateInputValue(date: Date) {
  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000)
  return localDate.toISOString().slice(0, 10)
}

function formatNumber(value?: number | null) {
  return value === null || value === undefined ? '--' : value.toLocaleString('pt-BR', { maximumFractionDigits: 1 })
}

function formatDateTime(value: Date) {
  return value.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}
