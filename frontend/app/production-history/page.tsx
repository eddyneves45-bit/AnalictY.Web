'use client'

import React, { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ProtectedLayout } from '@/components/layout/protected-layout'
import { useSelectedMachine } from '@/components/providers/selected-machine-provider'
import { usePageReady } from '@/components/providers/navigation-feedback-provider'
import { API_BASE_URL, apiFetch } from '@/lib/api'
import {
  ArrowLeft,
  CalendarDays,
  Clock3,
  Download,
  Factory,
  FileText,
  RefreshCw,
  Search,
  Table2,
} from 'lucide-react'

interface Machine {
  id: number
  name: string
  code: string
}

interface ProductionMatrixRow {
  hourStart?: string
  hour: string
  values: Record<string, number>
  total: number
}

interface ProductionMatrix {
  success: boolean
  machine: string
  startAt: string
  endAt: string
  rows: ProductionMatrixRow[]
  grandTotal: number
}

interface FilterState {
  machineId: string
  startDate: string
  endDate: string
  startTime: string
  endTime: string
}

interface DayColumn {
  key: string
  label: string
  date: Date
}

interface HourRow {
  key: string
  label: string
}

const todayRange = getTodayRange()

export default function ProductionHistoryPage() {
  const router = useRouter()
  const { selectedMachine } = useSelectedMachine()
  const [machines, setMachines] = useState<Machine[]>([])
  const [filters, setFilters] = useState<FilterState>({
    machineId: selectedMachine?.id ? String(selectedMachine.id) : '',
    startDate: todayRange.startDate,
    endDate: todayRange.endDate,
    startTime: '00:00',
    endTime: '23:59',
  })
  const [matrix, setMatrix] = useState<ProductionMatrix | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [autoLoadedMachineId, setAutoLoadedMachineId] = useState('')
  const [error, setError] = useState('')
  usePageReady(!isLoading)

  useEffect(() => {
    async function loadMachines() {
      try {
        const response = await apiFetch(`${API_BASE_URL}/api/machines`)
        if (!response.ok) throw new Error('Falha ao carregar maquinas')
        const data = await response.json()
        setMachines(data.map(normalizeMachine))
      } catch (err) {
        console.error(err)
        setError('Não foi possível carregar a lista de máquinas.')
      } finally {
        setIsLoading(false)
      }
    }

    void loadMachines()
  }, [])

  useEffect(() => {
    if (!selectedMachine?.id) return
    const selectedMachineId = String(selectedMachine.id)
    setFilters((current) =>
      current.machineId === selectedMachineId
        ? current
        : { ...current, machineId: selectedMachineId },
    )
  }, [selectedMachine?.id])

  useEffect(() => {
    if (isLoading || !filters.machineId || autoLoadedMachineId === filters.machineId) return
    setAutoLoadedMachineId(filters.machineId)
    void loadHistory(filters)
  }, [isLoading, filters, autoLoadedMachineId])

  const days = useMemo(
    () => buildDayColumns(filters.startDate, filters.endDate),
    [filters.startDate, filters.endDate],
  )

  const hours = useMemo(
    () => buildHourRows(filters.startTime, filters.endTime),
    [filters.startTime, filters.endTime],
  )

  const valuesByCell = useMemo(() => {
    const cells = new Map<string, number>()
    if (!matrix) return cells

    matrix.rows.forEach((row, index) => {
      const hourStart = row.hourStart ? new Date(row.hourStart) : inferHourStart(matrix.startAt, index)
      if (Number.isNaN(hourStart.getTime())) return
      const key = `${toDateInputValue(hourStart)}|${hourStart.getHours().toString().padStart(2, '0')}:00`
      cells.set(key, (cells.get(key) ?? 0) + Number(row.total || 0))
    })

    return cells
  }, [matrix])

  const dayTotals = useMemo(() => {
    return days.map((day) =>
      hours.reduce((sum, hour) => sum + (valuesByCell.get(`${day.key}|${hour.key}`) ?? 0), 0),
    )
  }, [days, hours, valuesByCell])

  const grandTotal = dayTotals.reduce((sum, value) => sum + value, 0)
  const filledCells = Array.from(valuesByCell.values()).filter((value) => value > 0)
  const bestValue = filledCells.length ? Math.max(...filledCells) : 0

  async function loadHistory(nextFilters = filters) {
    if (!nextFilters.machineId) {
      setError('Escolha a máquina para carregar o histórico de produção.')
      return
    }

    setIsSubmitting(true)
    setError('')

    try {
      const response = await apiFetch(`${API_BASE_URL}/api/reports/production/matrix`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          report_type: 'production',
          machine_id: nextFilters.machineId,
          inicio_em: `${nextFilters.startDate}T${nextFilters.startTime}:00`,
          fim_em: `${nextFilters.endDate}T${nextFilters.endTime}:00`,
          formato: 'csv',
          incluir_motivos_parada: false,
        }),
      })

      if (!response.ok) throw new Error('Falha ao carregar histórico')
      setMatrix(normalizeProductionMatrix(await response.json()))
    } catch (err) {
      console.error(err)
      setError('Não foi possível carregar o histórico de produção.')
    } finally {
      setIsSubmitting(false)
    }
  }

  function applyQuickRange(daysBack: number) {
    const end = new Date()
    const start = new Date(end)
    start.setDate(end.getDate() - daysBack + 1)
    const nextFilters = {
      ...filters,
      startDate: toDateInputValue(start),
      endDate: toDateInputValue(end),
      startTime: '00:00',
      endTime: '23:59',
    }
    setFilters(nextFilters)
    void loadHistory(nextFilters)
  }

  function exportCsv() {
    const header = ['Hora', ...days.map((day) => formatDateLabel(day.date)), 'Total']
    const lines = [header]

    hours.forEach((hour) => {
      const values = days.map((day) => valuesByCell.get(`${day.key}|${hour.key}`) ?? 0)
      lines.push([hour.label, ...values.map((value) => String(value)), String(sum(values))])
    })

    lines.push(['Total', ...dayTotals.map((value) => String(value)), String(grandTotal)])

    const csv = lines.map((line) => line.map(escapeCsv).join(';')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `historico-producao-${filters.startDate}-${filters.endDate}.csv`
    anchor.style.display = 'none'
    document.body.appendChild(anchor)
    anchor.click()
    anchor.remove()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

  function exportPdf() {
    if (!matrix) return

    const header = days
      .map((day) => `<th>${escapeHtml(formatDateLabel(day.date))}</th>`)
      .join('')
    const rows = hours.map((hour) => {
      const rowValues = days.map((day) => valuesByCell.get(`${day.key}|${hour.key}`) ?? 0)
      return `
        <tr>
          <td class="strong">${escapeHtml(hour.label)}</td>
          ${rowValues.map((value) => `<td class="number">${escapeHtml(formatMatrixValue(value))}</td>`).join('')}
          <td class="number strong">${escapeHtml(formatMatrixValue(sum(rowValues)))}</td>
        </tr>
      `
    }).join('')
    const totals = dayTotals
      .map((value) => `<td class="number strong">${escapeHtml(formatMatrixValue(value))}</td>`)
      .join('')

    const printFrame = document.createElement('iframe')
    printFrame.style.position = 'fixed'
    printFrame.style.right = '0'
    printFrame.style.bottom = '0'
    printFrame.style.width = '0'
    printFrame.style.height = '0'
    printFrame.style.border = '0'
    document.body.appendChild(printFrame)

    const printDocument = printFrame.contentWindow?.document
    if (!printDocument) {
      printFrame.remove()
      alert('Não foi possível preparar o PDF neste navegador.')
      return
    }

    printDocument.open()
    printDocument.write(`
      <!doctype html>
      <html>
        <head>
          <title>Histórico de Produção</title>
          <style>
            @page { size: landscape; margin: 8mm; }
            body { font-family: Arial, sans-serif; color: #111827; margin: 0; }
            h1 { margin: 0 0 4px; font-size: 18px; }
            p { margin: 0 0 12px; color: #4b5563; font-size: 11px; }
            table { border-collapse: collapse; width: 100%; font-size: 10px; }
            th, td { border: 1px solid #111827; padding: 5px 6px; }
            th { background: #e5e7eb; text-align: center; }
            tfoot td { background: #111827; color: #fff; }
            .number { text-align: right; }
            .strong { font-weight: 700; }
          </style>
        </head>
        <body>
          <h1>Histórico de Produção</h1>
          <p>${escapeHtml(matrix.machine)} · ${escapeHtml(formatDate(filters.startDate))} ${escapeHtml(filters.startTime)} até ${escapeHtml(formatDate(filters.endDate))} ${escapeHtml(filters.endTime)}</p>
          <table>
            <thead>
              <tr><th>Hora</th>${header}<th>Total</th></tr>
            </thead>
            <tbody>${rows}</tbody>
            <tfoot>
              <tr><td class="strong">Total</td>${totals}<td class="number strong">${escapeHtml(formatMatrixValue(grandTotal))}</td></tr>
            </tfoot>
          </table>
        </body>
      </html>
    `)
    printDocument.close()

    window.setTimeout(() => {
      printFrame.contentWindow?.focus()
      printFrame.contentWindow?.print()
      window.setTimeout(() => printFrame.remove(), 1000)
    }, 250)
  }

  return (
    <ProtectedLayout allowedPermissions={['reports.download']}>
      <div className="space-y-6">
        <header className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div className="flex items-start gap-4">
            <button onClick={() => router.back()} className="rounded-lg p-2 transition-colors hover:bg-gray-200">
              <ArrowLeft className="h-5 w-5 text-gray-600" />
            </button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Histórico de Produção</h1>
              <p className="mt-1 text-gray-600">
                Produção por hora cruzada por dia, no formato de acompanhamento da fábrica.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => applyQuickRange(1)}
              className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
            >
              Hoje
            </button>
            <button
              onClick={() => applyQuickRange(7)}
              className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
            >
              Últimos 7 dias
            </button>
            <button
              onClick={() => applyQuickRange(30)}
              className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
            >
              30 dias anteriores
            </button>
          </div>
        </header>

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
            {error}
          </div>
        )}

        <section className="rounded-lg border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-200 px-6 py-4">
            <div className="flex items-center gap-2">
              <Search className="h-5 w-5 text-red-600" />
              <h2 className="text-lg font-bold text-gray-900">Filtros</h2>
            </div>
          </div>
          <div className="grid gap-4 p-6 md:grid-cols-2 xl:grid-cols-6">
            <Field label="Máquina">
              <select
                value={filters.machineId}
                onChange={(event) => setFilters((current) => ({ ...current, machineId: event.target.value }))}
                className="h-11 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm outline-none focus:border-red-500 focus:ring-2 focus:ring-red-100"
              >
                <option value="">Escolha a máquina</option>
                {machines.map((machine) => (
                  <option key={machine.id} value={machine.id}>
                    {machine.name} ({machine.code})
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Data inicial">
              <DateInput
                value={filters.startDate}
                onChange={(value) => setFilters((current) => ({ ...current, startDate: value }))}
              />
            </Field>

            <Field label="Data final">
              <DateInput
                value={filters.endDate}
                onChange={(value) => setFilters((current) => ({ ...current, endDate: value }))}
              />
            </Field>

            <Field label="Hora inicial">
              <TimeInput
                value={filters.startTime}
                onChange={(value) => setFilters((current) => ({ ...current, startTime: value }))}
              />
            </Field>

            <Field label="Hora final">
              <TimeInput
                value={filters.endTime}
                onChange={(value) => setFilters((current) => ({ ...current, endTime: value }))}
              />
            </Field>

            <div className="flex items-end gap-2">
              <button
                onClick={() => loadHistory()}
                disabled={isSubmitting}
                className="flex h-11 flex-1 items-center justify-center gap-2 rounded-lg bg-red-600 px-4 text-sm font-bold text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-red-300"
              >
                <RefreshCw className={`h-4 w-4 ${isSubmitting ? 'animate-spin' : ''}`} />
                Carregar
              </button>
              <button
                onClick={exportCsv}
                disabled={!matrix}
                className="grid h-11 w-11 place-items-center rounded-lg border border-gray-300 bg-white text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                title="Exportar CSV"
              >
                <Download className="h-4 w-4" />
              </button>
              <button
                onClick={exportPdf}
                disabled={!matrix}
                className="grid h-11 w-11 place-items-center rounded-lg border border-gray-300 bg-white text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                title="Exportar PDF"
              >
                <FileText className="h-4 w-4" />
              </button>
            </div>
          </div>
        </section>

        <div className="grid gap-4 md:grid-cols-3">
          <SummaryCard icon={Factory} label="Máquina" value={matrix?.machine ?? 'Aguardando filtro'} />
          <SummaryCard icon={Table2} label="Total produzido" value={formatNumber(grandTotal)} />
          <SummaryCard icon={CalendarDays} label="Maior hora" value={formatNumber(bestValue)} />
        </div>

        <section className="rounded-lg border border-gray-200 bg-white shadow-sm">
          <div className="flex flex-col gap-2 border-b border-gray-200 px-6 py-4 md:flex-row md:items-end md:justify-between">
            <div>
              <h2 className="text-lg font-bold text-gray-900">Matriz hora x dia</h2>
              <p className="text-sm text-gray-500">
                {formatDate(filters.startDate)} {filters.startTime} até {formatDate(filters.endDate)} {filters.endTime}
              </p>
            </div>
            <div className="text-sm font-semibold text-gray-700">
              mínimo de 7 dias · {hours.length} faixa(s) de hora
            </div>
          </div>

          <div className="p-5">
            <div className="max-h-[62vh] overflow-auto rounded-lg border border-gray-300">
            <table className="min-w-full border-collapse text-sm">
              <thead>
                <tr className="bg-gray-100 text-xs uppercase text-gray-600">
                  <th className="sticky left-0 top-0 z-30 w-24 border border-gray-300 bg-gray-100 px-3 py-2 text-left">
                    Hora
                  </th>
                  {days.map((day, index) => (
                    <th key={day.key} className="sticky top-0 z-20 min-w-28 border border-gray-300 bg-gray-100 px-3 py-2 text-center">
                      <div className="font-bold">{formatDateLabel(day.date)}</div>
                    </th>
                  ))}
                  <th className="sticky right-0 top-0 z-30 min-w-28 border border-gray-300 bg-gray-900 px-3 py-2 text-right text-white">
                    Total
                  </th>
                </tr>
              </thead>
              <tbody>
                {hours.map((hour) => {
                  const rowValues = days.map((day) => valuesByCell.get(`${day.key}|${hour.key}`) ?? 0)
                  const rowTotal = sum(rowValues)
                  return (
                    <tr key={hour.key} className="odd:bg-white even:bg-gray-50">
                      <td className="sticky left-0 z-10 border border-gray-300 bg-inherit px-3 py-2 font-semibold text-gray-900">
                        {hour.label}
                      </td>
                      {rowValues.map((value, index) => (
                        <td
                          key={`${hour.key}-${days[index].key}`}
                          className={value > 0
                            ? 'border border-gray-300 bg-emerald-50 px-3 py-2 text-right font-semibold text-gray-900'
                            : 'border border-gray-300 px-3 py-2 text-right text-gray-400'}
                        >
                          {formatMatrixValue(value)}
                        </td>
                      ))}
                      <td className="sticky right-0 z-10 border border-gray-700 bg-gray-900 px-3 py-2 text-right font-bold text-white">
                        {formatMatrixValue(rowTotal)}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
              <tfoot>
                <tr>
                  <td className="sticky bottom-0 left-0 z-30 border border-gray-700 bg-gray-900 px-3 py-2 font-bold text-white">
                    Total
                  </td>
                  {dayTotals.map((value, index) => (
                    <td key={days[index].key} className="sticky bottom-0 z-20 border border-gray-700 bg-gray-900 px-3 py-2 text-right font-bold text-white">
                      {formatMatrixValue(value)}
                    </td>
                  ))}
                  <td className="sticky bottom-0 right-0 z-30 border border-gray-700 bg-gray-950 px-3 py-2 text-right font-bold text-white">
                    {formatMatrixValue(grandTotal)}
                  </td>
                </tr>
              </tfoot>
            </table>
            </div>
          </div>

          {!matrix && (
            <div className="border-t border-gray-200 px-6 py-10 text-center text-sm text-gray-500">
              Carregue um período para visualizar o histórico.
            </div>
          )}
        </section>
      </div>
    </ProtectedLayout>
  )
}

function normalizeMachine(item: any): Machine {
  return {
    id: Number(item.id),
    name: item.name ?? '',
    code: item.code ?? '',
  }
}

function normalizeProductionMatrix(raw: any): ProductionMatrix {
  const rows = raw?.rows ?? raw?.Rows ?? []
  return {
    success: Boolean(raw?.success ?? raw?.Success),
    machine: raw?.machine ?? raw?.Machine ?? 'Todas as máquinas',
    startAt: raw?.startAt ?? raw?.StartAt,
    endAt: raw?.endAt ?? raw?.EndAt,
    rows: rows.map((row: any) => ({
      hourStart: row.hourStart ?? row.HourStart,
      hour: row.hour ?? row.Hour ?? '',
      values: row.values ?? row.Values ?? {},
      total: Number(row.total ?? row.Total ?? 0),
    })),
    grandTotal: Number(raw?.grandTotal ?? raw?.GrandTotal ?? 0),
  }
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-semibold text-gray-700">{label}</span>
      {children}
    </label>
  )
}

function DateInput({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return (
    <div className="relative">
      <CalendarDays className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
      <input
        type="date"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-11 w-full rounded-lg border border-gray-300 bg-white pl-10 pr-3 text-sm outline-none focus:border-red-500 focus:ring-2 focus:ring-red-100"
      />
    </div>
  )
}

function TimeInput({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return (
    <div className="relative">
      <Clock3 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
      <input
        type="time"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-11 w-full rounded-lg border border-gray-300 bg-white pl-10 pr-3 text-sm outline-none focus:border-red-500 focus:ring-2 focus:ring-red-100"
      />
    </div>
  )
}

function SummaryCard({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white px-5 py-4 shadow-sm">
      <div className="flex items-center gap-2 text-xs font-bold uppercase text-gray-500">
        <Icon className="h-4 w-4 text-red-600" />
        {label}
      </div>
      <p className="mt-2 truncate text-2xl font-bold text-gray-900">{value}</p>
    </div>
  )
}

function buildDayColumns(startDate: string, endDate: string): DayColumn[] {
  const start = parseDateInput(startDate)
  const parsedEnd = parseDateInput(endDate)
  const minimumEnd = start ? new Date(start) : null
  if (minimumEnd) minimumEnd.setDate(minimumEnd.getDate() + 6)
  const end = parsedEnd && minimumEnd && parsedEnd < minimumEnd ? minimumEnd : parsedEnd
  if (!start || !end || end < start) return []

  const columns: DayColumn[] = []
  const cursor = new Date(start)
  while (cursor <= end && columns.length < 62) {
    columns.push({
      key: toDateInputValue(cursor),
      label: `Dia ${columns.length + 1}`,
      date: new Date(cursor),
    })
    cursor.setDate(cursor.getDate() + 1)
  }
  return columns
}

function buildHourRows(startTime: string, endTime: string): HourRow[] {
  const startHour = Number((startTime || '00:00').slice(0, 2))
  const endHour = Number((endTime || '23:59').slice(0, 2))
  const hours: HourRow[] = []

  if (Number.isNaN(startHour) || Number.isNaN(endHour)) return hours

  if (endHour >= startHour) {
    for (let hour = startHour; hour <= endHour; hour += 1) {
      hours.push(toHourRow(hour))
    }
    return hours
  }

  for (let hour = startHour; hour <= 23; hour += 1) {
    hours.push(toHourRow(hour))
  }
  for (let hour = 0; hour <= endHour; hour += 1) {
    hours.push(toHourRow(hour))
  }
  return hours
}

function toHourRow(hour: number): HourRow {
  const key = `${hour.toString().padStart(2, '0')}:00`
  return { key, label: key }
}

function inferHourStart(startAt: string, index: number) {
  const date = new Date(startAt)
  date.setMinutes(0, 0, 0)
  date.setHours(date.getHours() + index)
  return date
}

function parseDateInput(value: string) {
  if (!value) return null
  const [year, month, day] = value.split('-').map(Number)
  if (!year || !month || !day) return null
  return new Date(year, month - 1, day)
}

function toDateInputValue(value: Date) {
  const year = value.getFullYear()
  const month = String(value.getMonth() + 1).padStart(2, '0')
  const day = String(value.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function getTodayRange() {
  const today = new Date()
  return {
    startDate: toDateInputValue(today),
    endDate: toDateInputValue(today),
  }
}

function formatDate(value: string) {
  const date = parseDateInput(value)
  if (!date) return '-'
  return date.toLocaleDateString('pt-BR')
}

function formatDateLabel(value: Date) {
  return value.toLocaleDateString('pt-BR')
}

function formatNumber(value: number) {
  return new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 }).format(Number(value || 0))
}

function formatMatrixValue(value: number) {
  return Number(value || 0) > 0 ? formatNumber(value) : ''
}

function sum(values: number[]) {
  return values.reduce((total, value) => total + Number(value || 0), 0)
}

function escapeCsv(value: string) {
  return `"${String(value).replace(/"/g, '""')}"`
}

function escapeHtml(value: string) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}
