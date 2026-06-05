'use client'

import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { BarChart3, CalendarDays, Target, TrendingUp } from 'lucide-react'
import { API_BASE_URL, apiFetch } from '@/lib/api'
import { useSelectedMachine } from '@/components/providers/selected-machine-provider'

interface ShiftProductionItem {
  shift_id: number
  shift_code: string
  shift_name: string
  start: string
  end: string
  target: number
  production: number
  losses: number
  good: number
  attainment_percent: number
  availability_percent: number
  performance_percent: number
  quality_percent: number
  oee_percent: number
}

interface ShiftProductionResponse {
  machine_id: string
  date: string
  items: ShiftProductionItem[]
  totals: {
    production: number
    losses: number
    good: number
    target: number
    attainment_percent: number
  }
}

export default function Production() {
  const { selectedMachine } = useSelectedMachine()
  const [selectedDate, setSelectedDate] = useState(toDateInputValue(new Date()))
  const [data, setData] = useState<ShiftProductionResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const dateLabel = useMemo(
    () => new Date(`${selectedDate}T00:00:00`).toLocaleDateString('pt-BR'),
    [selectedDate],
  )

  useEffect(() => {
    if (!selectedMachine) {
      setData(null)
      return
    }

    const load = async () => {
      setLoading(true)
      setError('')
      try {
        const response = await apiFetch(
          `${API_BASE_URL}/api/bi/machines/${selectedMachine.id}/production-by-shift?date=${selectedDate}`,
        )
        if (!response.ok) {
          throw new Error('Erro ao carregar produção por turno')
        }
        setData(await response.json())
      } catch (caughtError) {
        console.error(caughtError)
        setError('Não foi possível carregar a produção por turno.')
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [selectedDate, selectedMachine])

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-bold text-gray-900">Produção por Turno</h1>
        <p className="mt-1 text-gray-600">
          Produção real, perdas, meta e eficiência por turno
          {selectedMachine ? ` - ${selectedMachine.name}` : ''}
        </p>
      </header>

      {!selectedMachine ? (
        <section className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          Selecione uma máquina antes de analisar a produção por turno.
        </section>
      ) : (
        <>
          <section className="flex flex-wrap items-end justify-between gap-4 rounded-xl border border-gray-200 bg-white p-5">
            <label className="space-y-2">
              <span className="text-sm font-medium text-gray-600">Data de referência</span>
              <div className="relative">
                <CalendarDays className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(event) => setSelectedDate(event.target.value)}
                  className="rounded-xl border border-gray-300 py-2 pl-10 pr-4 text-gray-900 focus:border-red-500 focus:outline-none"
                />
              </div>
            </label>
            <div className="text-sm text-gray-500">
              Turnos calculados para <span className="font-medium text-gray-900">{dateLabel}</span>
            </div>
          </section>

          {error && (
            <section className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700">
              {error}
            </section>
          )}

          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <Kpi
              icon={<BarChart3 className="h-6 w-6" />}
              label="Produção"
              value={loading ? '...' : formatNumber(data?.totals.production)}
              detail="Total do dia"
              tone="from-blue-500 to-blue-600"
            />
            <Kpi
              icon={<Target className="h-6 w-6" />}
              label="Meta"
              value={loading ? '...' : formatNumber(data?.totals.target)}
              detail="Meta somada dos turnos"
              tone="from-emerald-500 to-emerald-600"
            />
            <Kpi
              icon={<TrendingUp className="h-6 w-6" />}
              label="Atingimento"
              value={loading ? '...' : `${formatPercent(data?.totals.attainment_percent)}%`}
              detail="Produção / meta"
              tone="from-violet-500 to-violet-600"
            />
            <Kpi
              icon={<BarChart3 className="h-6 w-6" />}
              label="Perdas"
              value={loading ? '...' : formatNumber(data?.totals.losses)}
              detail={`Boas: ${formatNumber(data?.totals.good)}`}
              tone="from-orange-500 to-orange-600"
            />
          </section>

          <section className="rounded-xl border border-gray-200 bg-white">
            <div className="border-b border-gray-200 px-5 py-4">
              <h2 className="text-lg font-semibold text-gray-900">Detalhe por turno</h2>
              <p className="text-sm text-gray-500">Cada linha usa os horários configurados na tabela de turnos.</p>
            </div>
            {data?.items.length ? (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <Th>Turno</Th>
                      <Th>Janela</Th>
                      <Th align="right">Produção</Th>
                      <Th align="right">Meta</Th>
                      <Th align="right">Atingimento</Th>
                      <Th align="right">Perdas</Th>
                      <Th align="right">OEE est.</Th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white">
                    {data.items.map((item) => (
                      <tr key={item.shift_id}>
                        <Td>
                          <div className="font-medium text-gray-900">{item.shift_name}</div>
                          <div className="text-xs text-gray-500">{item.shift_code}</div>
                        </Td>
                        <Td>{formatWindow(item.start, item.end)}</Td>
                        <Td align="right">{formatNumber(item.production)}</Td>
                        <Td align="right">{formatNumber(item.target)}</Td>
                        <Td align="right">
                          <span className={item.attainment_percent >= 100 ? 'font-semibold text-emerald-700' : 'font-semibold text-orange-700'}>
                            {formatPercent(item.attainment_percent)}%
                          </span>
                        </Td>
                        <Td align="right">{formatNumber(item.losses)}</Td>
                        <Td align="right">{formatPercent(item.oee_percent)}%</Td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="px-5 py-8 text-sm text-gray-500">
                Nenhum turno ativo cadastrado ainda. Cadastre os turnos no banco para começar a análise por turno.
              </div>
            )}
          </section>

          <section className="rounded-xl border border-gray-200 bg-white p-5">
            <h2 className="text-lg font-semibold text-gray-900">Leitura rápida</h2>
            <div className="mt-4 space-y-4">
              {data?.items.map((item) => {
                const progress = item.target > 0 ? Math.min((item.production / item.target) * 100, 100) : 0
                return (
                  <div key={`bar-${item.shift_id}`} className="grid gap-3 md:grid-cols-[160px_1fr_90px] md:items-center">
                    <div>
                      <div className="text-sm font-medium text-gray-900">{item.shift_name}</div>
                      <div className="text-xs text-gray-500">{formatWindow(item.start, item.end)}</div>
                    </div>
                    <div className="h-3 overflow-hidden rounded-full bg-gray-100">
                      <div className="h-full rounded-full bg-emerald-500" style={{ width: `${progress}%` }} />
                    </div>
                    <div className="text-right text-sm font-semibold text-gray-900">
                      {formatNumber(item.production)}
                    </div>
                  </div>
                )
              })}
              {!data?.items.length && <p className="text-sm text-gray-500">Sem dados para desenhar o comparativo.</p>}
            </div>
          </section>
        </>
      )}
    </div>
  )
}

function Kpi({
  icon,
  label,
  value,
  detail,
  tone,
}: {
  icon: ReactNode
  label: string
  value: string
  detail: string
  tone: string
}) {
  return (
    <div className={`rounded-xl bg-gradient-to-br ${tone} p-5 text-white shadow-sm`}>
      <div className="mb-4 flex items-center justify-between">
        {icon}
        <span className="text-xs uppercase text-white/75">{label}</span>
      </div>
      <div className="text-3xl font-bold">{value}</div>
      <div className="mt-1 text-sm text-white/85">{detail}</div>
    </div>
  )
}

function Th({ children, align = 'left' }: { children: ReactNode; align?: 'left' | 'right' }) {
  return (
    <th className={`px-5 py-3 ${align === 'right' ? 'text-right' : 'text-left'} text-xs font-medium uppercase tracking-wider text-gray-500`}>
      {children}
    </th>
  )
}

function Td({ children, align = 'left' }: { children: ReactNode; align?: 'left' | 'right' }) {
  return <td className={`px-5 py-4 ${align === 'right' ? 'text-right' : 'text-left'} text-sm text-gray-700`}>{children}</td>
}

function toDateInputValue(date: Date) {
  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000)
  return localDate.toISOString().slice(0, 10)
}

function formatNumber(value?: number | null) {
  return value === null || value === undefined ? '--' : value.toLocaleString('pt-BR', { maximumFractionDigits: 1 })
}

function formatPercent(value?: number | null) {
  return value === null || value === undefined ? '--' : value.toLocaleString('pt-BR', { maximumFractionDigits: 1 })
}

function formatWindow(start: string, end: string) {
  const formatter = new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' })
  return `${formatter.format(new Date(start))} - ${formatter.format(new Date(end))}`
}
