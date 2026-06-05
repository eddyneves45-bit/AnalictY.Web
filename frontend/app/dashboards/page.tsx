'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, BarChart3, Circle, Eye, LayoutDashboard, LineChart, Pencil, PieChart, Save, Trash2 } from 'lucide-react'
import GridLayout, { type Layout } from 'react-grid-layout/legacy'
import { ProtectedLayout } from '@/components/layout/protected-layout'
import { API_BASE_URL, apiFetch } from '@/lib/api'
import { usePageReady } from '@/components/providers/navigation-feedback-provider'

type Machine = { id: number; name: string; code: string }
type WidgetType = 'kpi' | 'bar' | 'pie' | 'line'
type Widget = { id: string; type: WidgetType; title: string; metric: string; color?: string; x?: number; y?: number; w?: number; h?: number }
type DashboardConfig = {
  id?: number
  name: string
  machineId: string
  periodPreset: string
  refreshInterval: string
  isDefault: boolean
  widgets: Widget[]
}

const widgetOptions: Array<{ type: WidgetType; metric: string; title: string; icon: typeof BarChart3 }> = [
  { type: 'kpi', metric: 'production', title: 'Produção atual', icon: Circle },
  { type: 'kpi', metric: 'target', title: 'Meta e atingimento', icon: Circle },
  { type: 'bar', metric: 'production_by_shift', title: 'Produção por turno', icon: BarChart3 },
  { type: 'pie', metric: 'status_distribution', title: 'Distribuição de status', icon: PieChart },
  { type: 'pie', metric: 'loss_quality', title: 'Boas x perdas', icon: PieChart },
  { type: 'line', metric: 'production_timeline', title: 'Produção no tempo', icon: LineChart },
]

const colorPalette = ['#2563eb', '#16a34a', '#0891b2', '#f59e0b', '#64748b', '#7c3aed', '#dc2626', '#0f766e']
const editorMinWidth = 720
const editorPadding = 24

const emptyForm: DashboardConfig = {
  name: 'Dashboard operacional',
  machineId: '',
  periodPreset: 'today',
  refreshInterval: '10',
  isDefault: true,
  widgets: widgetOptions.slice(0, 4).map((item, index) => ({
    id: `${item.type}-${item.metric}`,
    type: item.type,
    metric: item.metric,
    title: item.title,
    color: colorPalette[index % colorPalette.length],
    x: (index % 2) * 6,
    y: Math.floor(index / 2) * 4,
    w: 6,
    h: item.type === 'kpi' ? 3 : 4,
  })),
}

export default function DashboardsPage() {
  const router = useRouter()
  const gridContainerRef = useRef<HTMLDivElement | null>(null)
  const [machines, setMachines] = useState<Machine[]>([])
  const [dashboards, setDashboards] = useState<DashboardConfig[]>([])
  const [form, setForm] = useState<DashboardConfig>(emptyForm)
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [gridWidth, setGridWidth] = useState(editorMinWidth)
  usePageReady(!loading)

  const selectedMachine = useMemo(() => machines.find((machine) => String(machine.id) === form.machineId), [form.machineId, machines])

  useEffect(() => {
    void load()
  }, [])

  useEffect(() => {
    const element = gridContainerRef.current
    if (!element) return
    const observedElement = element

    function updateWidth() {
      setGridWidth(Math.max(editorMinWidth, Math.floor(observedElement.clientWidth - editorPadding)))
    }

    updateWidth()
    const observer = new ResizeObserver(updateWidth)
    observer.observe(observedElement)
    window.addEventListener('resize', updateWidth)
    return () => {
      observer.disconnect()
      window.removeEventListener('resize', updateWidth)
    }
  }, [])

  async function load() {
    setLoading(true)
    setError('')
    try {
      const [machinesResponse, dashboardsResponse] = await Promise.all([
        apiFetch(`${API_BASE_URL}/api/machines`),
        apiFetch(`${API_BASE_URL}/api/dashboard/configs`),
      ])
      if (!machinesResponse.ok || !dashboardsResponse.ok) throw new Error('Falha ao carregar dashboards')
      const machinesData = await machinesResponse.json()
      const normalizedMachines = (machinesData ?? []).map((item: any) => ({
        id: Number(item.id ?? item.Id),
        name: item.name ?? item.Name,
        code: item.code ?? item.Code,
      }))
      const normalizedDashboards = (await dashboardsResponse.json()).map(normalizeDashboard)
      setMachines(normalizedMachines)
      setDashboards(normalizedDashboards)
      setForm((current) => ({
        ...current,
        machineId: current.machineId || String(normalizedMachines[0]?.id ?? ''),
      }))
    } catch (caughtError) {
      console.error(caughtError)
      setError('Não foi possível carregar os dashboards.')
    } finally {
      setLoading(false)
    }
  }

  function toggleWidget(option: (typeof widgetOptions)[number]) {
    setForm((current) => {
      const exists = current.widgets.some((widget) => widget.metric === option.metric)
      const nextIndex = current.widgets.length
      return {
        ...current,
        widgets: exists
          ? current.widgets.filter((widget) => widget.metric !== option.metric)
          : [
              ...current.widgets,
              {
                id: `${option.type}-${option.metric}`,
                type: option.type,
                metric: option.metric,
                title: option.title,
                color: colorPalette[nextIndex % colorPalette.length],
                x: (nextIndex % 2) * 6,
                y: Math.floor(nextIndex / 2) * 4,
                w: 6,
                h: option.type === 'kpi' ? 3 : 4,
              },
            ],
      }
    })
  }

  function handleLayoutChange(layout: Layout) {
    setForm((current) => ({
      ...current,
      widgets: current.widgets.map((widget) => {
        const item = layout.find((layoutItem) => layoutItem.i === widget.id)
        return item ? { ...widget, x: item.x, y: item.y, w: item.w, h: item.h } : widget
      }),
    }))
  }

  function updateWidgetColor(widgetId: string, color: string) {
    setForm((current) => ({
      ...current,
      widgets: current.widgets.map((widget) => widget.id === widgetId ? { ...widget, color } : widget),
    }))
  }

  async function saveDashboard() {
    setMessage('')
    setError('')
    const response = await apiFetch(`${API_BASE_URL}/api/dashboard/configs`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: form.id,
        name: form.name,
        machine_id: form.machineId,
        period_preset: form.periodPreset,
        refresh_interval: form.refreshInterval,
        is_default: form.isDefault,
        is_active: true,
        widgets: form.widgets,
      }),
    })
    if (!response.ok) {
      setError('Não foi possível salvar o dashboard.')
      return
    }
    setMessage('Dashboard salvo.')
    await load()
  }

  async function deleteDashboard(id?: number) {
    if (!id || !window.confirm('Excluir este dashboard?')) return
    const response = await apiFetch(`${API_BASE_URL}/api/dashboard/configs/${id}`, { method: 'DELETE' })
    if (!response.ok) {
      setError('Não foi possível excluir o dashboard.')
      return
    }
    setForm({ ...emptyForm, machineId: form.machineId })
    await load()
  }

  return (
    <ProtectedLayout allowedRoles={['admin']}>
      <div className="space-y-6">
        <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex items-start gap-4">
            <button onClick={() => router.back()} className="rounded-lg p-2 transition-colors hover:bg-gray-100">
              <ArrowLeft className="h-5 w-5 text-gray-600" />
            </button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Dashboards</h1>
              <p className="mt-1 text-gray-600">Monte layouts de gráficos por máquina para operação em tela cheia.</p>
            </div>
          </div>
          <a
            href={form.machineId ? `/dashboard?machine_id=${form.machineId}` : '/dashboard'}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-700 px-4 py-2 text-sm font-bold text-white hover:bg-blue-800"
          >
            <Eye className="h-4 w-4" />
            Visualizar
          </a>
        </header>

        {message && <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{message}</div>}
        {error && <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

        <section className="grid min-w-0 gap-5 xl:grid-cols-[360px_minmax(0,1fr)]">
          <aside className="min-w-0 rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
            <h2 className="mb-4 flex items-center gap-2 font-bold text-gray-900">
              <LayoutDashboard className="h-5 w-5 text-blue-700" />
              Layouts salvos
            </h2>
            <div className="space-y-2">
              {dashboards.map((dashboard) => (
                <div
                  key={dashboard.id}
                  className={`rounded-lg border px-3 py-3 text-sm transition-colors ${
                    dashboard.id === form.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-blue-300'
                  }`}
                >
                  <div className="font-bold text-gray-900">{dashboard.name}</div>
                  <div className="text-xs text-gray-500">
                    {machines.find((machine) => String(machine.id) === dashboard.machineId)?.name ?? `Máquina ${dashboard.machineId}`}
                    {dashboard.isDefault ? ' · padrão' : ''}
                  </div>
                  <div className="mt-3 flex gap-2">
                    <button
                      type="button"
                      onClick={() => setForm(dashboard)}
                      className="inline-flex flex-1 items-center justify-center gap-2 rounded-md border border-blue-200 bg-white px-3 py-2 text-xs font-bold text-blue-700 hover:bg-blue-50"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                      Editar
                    </button>
                    <button
                      type="button"
                      onClick={() => void deleteDashboard(dashboard.id)}
                      className="inline-flex flex-1 items-center justify-center gap-2 rounded-md border border-red-200 bg-white px-3 py-2 text-xs font-bold text-red-600 hover:bg-red-50"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Excluir
                    </button>
                  </div>
                </div>
              ))}
              {!dashboards.length && <p className="text-sm text-gray-500">Nenhum dashboard salvo ainda.</p>}
            </div>
          </aside>

          <section className="min-w-0 rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
            <div className="grid gap-4 md:grid-cols-2">
              <label className="space-y-1 text-sm">
                <span className="font-semibold text-gray-700">Nome</span>
                <input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} className="w-full rounded-lg border px-3 py-2" />
              </label>
              <label className="space-y-1 text-sm">
                <span className="font-semibold text-gray-700">Máquina</span>
                <select value={form.machineId} onChange={(event) => setForm({ ...form, machineId: event.target.value })} className="w-full rounded-lg border px-3 py-2">
                  {machines.map((machine) => (
                    <option key={machine.id} value={machine.id}>{machine.name} ({machine.code})</option>
                  ))}
                </select>
              </label>
              <label className="space-y-1 text-sm">
                <span className="font-semibold text-gray-700">Período</span>
                <select value={form.periodPreset} onChange={(event) => setForm({ ...form, periodPreset: event.target.value })} className="w-full rounded-lg border px-3 py-2">
                  <option value="today">Hoje</option>
                  <option value="shift">Turno atual</option>
                  <option value="last_8h">Últimas 8h</option>
                </select>
              </label>
              <label className="space-y-1 text-sm">
                <span className="font-semibold text-gray-700">Atualização</span>
                <select value={form.refreshInterval} onChange={(event) => setForm({ ...form, refreshInterval: event.target.value })} className="w-full rounded-lg border px-3 py-2">
                  <option value="5">5 segundos</option>
                  <option value="10">10 segundos</option>
                  <option value="30">30 segundos</option>
                  <option value="60">60 segundos</option>
                </select>
              </label>
            </div>

            <div className="mt-6">
              <h2 className="mb-3 font-bold text-gray-900">Gráficos</h2>
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {widgetOptions.map((option) => {
                  const selected = form.widgets.some((widget) => widget.metric === option.metric)
                  const Icon = option.icon
                  return (
                    <button
                      key={option.metric}
                      onClick={() => toggleWidget(option)}
                      className={`rounded-lg border px-4 py-3 text-left transition-colors ${selected ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-blue-300'}`}
                    >
                      <Icon className={`mb-2 h-5 w-5 ${selected ? 'text-blue-700' : 'text-gray-500'}`} />
                      <div className="font-semibold text-gray-900">{option.title}</div>
                      <div className="text-xs uppercase text-gray-500">{option.type}</div>
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="mt-6">
              <h2 className="mb-1 font-bold text-gray-900">Posição e tamanho</h2>
              <p className="mb-3 text-sm text-gray-500">Arraste pelo topo do card e ajuste o tamanho pelo canto inferior direito.</p>
              <div ref={gridContainerRef} className="overflow-x-auto rounded-lg border border-slate-200 bg-slate-50 p-3">
                <div style={{ width: gridWidth }}>
                  <GridLayout
                    className="layout"
                    width={gridWidth}
                    cols={12}
                    rowHeight={42}
                    margin={[10, 10]}
                    containerPadding={[0, 0]}
                    draggableHandle=".dashboard-drag-handle"
                    compactType={null}
                    preventCollision
                    layout={form.widgets.map((widget, index) => ({
                      i: widget.id,
                      x: widget.x ?? (index % 2) * 6,
                      y: widget.y ?? Math.floor(index / 2) * 4,
                      w: widget.w ?? 6,
                      h: widget.h ?? (widget.type === 'kpi' ? 3 : 4),
                      minW: 3,
                      minH: widget.type === 'kpi' ? 2 : 3,
                    }))}
                    onLayoutChange={handleLayoutChange}
                  >
                    {form.widgets.map((widget) => (
                      <div key={widget.id} className="overflow-hidden rounded-lg border border-slate-300 bg-white shadow-sm">
                        <div className="dashboard-drag-handle flex cursor-move items-center justify-between border-b border-slate-200 bg-slate-100 px-3 py-2 text-sm font-bold text-slate-800">
                          <span className="min-w-0 truncate">{widget.title}</span>
                          <span className="text-xs uppercase text-slate-500">{widget.type}</span>
                        </div>
                        <div className="flex h-[calc(100%-41px)] flex-col items-center justify-center gap-3 bg-white px-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
                          <div className="h-8 w-24 rounded-md" style={{ backgroundColor: widget.color ?? colorPalette[0] }} />
                          <div className="flex items-center gap-2">
                            <input
                              type="color"
                              value={widget.color ?? colorPalette[0]}
                              onChange={(event) => updateWidgetColor(widget.id, event.target.value)}
                              className="h-8 w-10 cursor-pointer rounded border border-slate-200 bg-white p-1"
                              aria-label={`Cor de ${widget.title}`}
                            />
                            <span>{widget.color ?? colorPalette[0]}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </GridLayout>
                </div>
              </div>
            </div>

            <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t pt-5">
              <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                <input type="checkbox" checked={form.isDefault} onChange={(event) => setForm({ ...form, isDefault: event.target.checked })} />
                Dashboard padrão da máquina {selectedMachine ? selectedMachine.name : ''}
              </label>
              <div className="flex gap-2">
                {form.id && (
                  <button onClick={() => void deleteDashboard(form.id)} className="inline-flex items-center gap-2 rounded-lg border border-red-200 px-4 py-2 text-sm font-bold text-red-600 hover:bg-red-50">
                    <Trash2 className="h-4 w-4" />
                    Excluir
                  </button>
                )}
                <button onClick={() => setForm({ ...emptyForm, machineId: form.machineId })} className="rounded-lg border px-4 py-2 text-sm font-bold text-gray-700 hover:bg-gray-50">
                  Novo
                </button>
                <button onClick={() => void saveDashboard()} className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-700">
                  <Save className="h-4 w-4" />
                  Salvar
                </button>
              </div>
            </div>
          </section>
        </section>
      </div>
    </ProtectedLayout>
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
    machineId: String(raw.machineId ?? raw.MachineId ?? raw.machine_id ?? ''),
    periodPreset: raw.periodPreset ?? raw.PeriodPreset ?? 'today',
    refreshInterval: String(raw.refreshInterval ?? raw.RefreshInterval ?? '10'),
    isDefault: Boolean(raw.isDefault ?? raw.IsDefault),
    widgets: rawWidgets.map((widget: any, index: number) => normalizeWidget(widget, index, duplicatedPositions)),
  }
}

function normalizeWidget(widget: any, index: number, duplicatedPositions: Set<string>): Widget {
  const type = widget.type as WidgetType
  const positionKey = `${widget.x ?? ''}:${widget.y ?? ''}`
  const hasPosition = Number.isFinite(Number(widget.x)) && Number.isFinite(Number(widget.y)) && !duplicatedPositions.has(positionKey)
  const hasSize = Number.isFinite(Number(widget.w)) && Number.isFinite(Number(widget.h))
  return {
    id: widget.id ?? `${widget.type}-${widget.metric}`,
    type,
    metric: widget.metric,
    title: widget.title,
    color: widget.color ?? colorPalette[index % colorPalette.length],
    x: hasPosition ? Number(widget.x) : (index % 2) * 6,
    y: hasPosition ? Number(widget.y) : Math.floor(index / 2) * 4,
    w: hasSize ? Number(widget.w) : 6,
    h: hasSize ? Number(widget.h) : (type === 'kpi' ? 3 : 4),
  }
}
