'use client'

import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { BarChart3, Brain, CalendarDays, Cloud, Database, Target, TrendingUp } from 'lucide-react'
import { useSelectedMachine } from '@/components/providers/selected-machine-provider'
import { API_BASE_URL, apiFetch } from '@/lib/api'
import { usePageReady } from '@/components/providers/navigation-feedback-provider'

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

export default function AnalysisBiPage() {
  const { selectedMachine } = useSelectedMachine()
  const [selectedDate, setSelectedDate] = useState(toDateInputValue(new Date()))
  const [data, setData] = useState<ShiftProductionResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  usePageReady(!loading)

  const dateLabel = useMemo(
    () => new Date(`${selectedDate}T00:00:00`).toLocaleDateString('pt-BR'),
    [selectedDate],
  )
  const bestShift = useMemo(() => {
    if (!data?.items.length) return null
    return data.items.reduce((best, item) => item.production > best.production ? item : best, data.items[0])
  }, [data])

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
        if (!response.ok) throw new Error('Erro ao carregar produção por turno')
        setData(await response.json())
      } catch (caughtError) {
        console.error(caughtError)
        setError('Não foi possível carregar a análise BI da máquina.')
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [selectedDate, selectedMachine])

  return (
    <div className="space-y-7">
      <header>
        <h1 className="text-3xl font-bold text-gray-900">Análise BI</h1>
        <p className="mt-1 text-gray-600">
          Resumo executivo de turno, tendências e integridade operacional
          {selectedMachine ? ` - ${selectedMachine.name}` : ''}
        </p>
      </header>

      <section className="rounded-xl border border-blue-100 bg-gradient-to-br from-slate-50 to-blue-50 p-5 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Janela de análise</h2>
            <p className="mt-1 text-sm text-gray-600">
              BI resume apenas análises complementares. Operação em tempo real fica na Visão Geral e tempo por estado fica em Status.
            </p>
          </div>
          <label className="space-y-1 text-sm">
            <span className="block text-gray-500">Data de referência</span>
            <div className="relative">
              <CalendarDays className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
              <input
                type="date"
                value={selectedDate}
                onChange={(event) => setSelectedDate(event.target.value)}
                className="rounded-xl border border-gray-300 bg-white py-2 pl-10 pr-4 text-gray-900 focus:border-red-500 focus:outline-none"
              />
            </div>
          </label>
        </div>
      </section>

      {!selectedMachine ? (
        <section className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          Selecione uma máquina na Visão Geral para abrir o resumo BI dela.
        </section>
      ) : (
        <>
          {error && (
            <section className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700">
              {error}
            </section>
          )}

          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <KpiCard
              icon={<BarChart3 className="h-6 w-6" />}
              label="Produção"
              value={loading ? '...' : formatNumber(data?.totals.production)}
              detail={`Data: ${dateLabel}`}
              tone="from-sky-400 via-blue-500 to-indigo-600"
            />
            <KpiCard
              icon={<Target className="h-6 w-6" />}
              label="Meta"
              value={loading ? '...' : formatNumber(data?.totals.target)}
              detail={`${formatPercent(data?.totals.attainment_percent)}% atingido`}
              tone="from-emerald-400 via-green-500 to-teal-600"
            />
            <KpiCard
              icon={<TrendingUp className="h-6 w-6" />}
              label="Melhor turno"
              value={loading ? '...' : bestShift?.shift_name ?? '--'}
              detail={bestShift ? `${formatNumber(bestShift.production)} peças` : 'Sem turno com produção'}
              tone="from-violet-400 via-purple-500 to-indigo-700"
            />
            <KpiCard
              icon={<Database className="h-6 w-6" />}
              label="Perdas"
              value={loading ? '...' : formatNumber(data?.totals.losses)}
              detail={`Boas: ${formatNumber(data?.totals.good)}`}
              tone="from-amber-400 via-orange-500 to-red-600"
            />
          </section>

          <section className="grid gap-4 xl:grid-cols-[1.35fr_0.65fr]">
            <div className="overflow-hidden rounded-xl border border-blue-100 bg-white shadow-sm">
              <div className="bg-gradient-to-r from-slate-900 via-blue-800 to-indigo-700 px-6 py-5 text-white">
                <h2 className="text-lg font-bold">Produção por turno</h2>
                <p className="mt-1 text-sm text-white/75">Comparativo do dia por janela operacional configurada.</p>
              </div>
              <div className="p-6">
                {data?.items.length ? (
                  <div className="space-y-4">
                    {data.items.map((item) => {
                      const progress = item.target > 0 ? Math.min((item.production / item.target) * 100, 100) : 0
                      return (
                        <div key={item.shift_id} className="rounded-xl border border-gray-200 bg-gradient-to-br from-slate-50 to-blue-50 p-4">
                          <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
                            <div>
                              <p className="font-bold text-gray-900">{item.shift_name}</p>
                              <p className="text-xs text-gray-500">{item.shift_code} · {formatWindow(item.start, item.end)}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-lg font-black text-gray-900">{formatNumber(item.production)}</p>
                              <p className="text-xs text-gray-500">de {formatNumber(item.target)}</p>
                            </div>
                          </div>
                          <div className="h-2 rounded-full bg-white">
                            <div className="h-full rounded-full bg-emerald-500" style={{ width: `${progress}%` }} />
                          </div>
                          <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
                            <MiniMetric label="ating." value={`${formatPercent(item.attainment_percent)}%`} />
                            <MiniMetric label="perdas" value={formatNumber(item.losses)} />
                            <MiniMetric label="oee" value={`${formatPercent(item.oee_percent)}%`} />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">Nenhum turno ativo com dados para esta data.</p>
                )}
              </div>
            </div>

            <div className="space-y-4">
              <SummaryPanel
                icon={<Brain className="h-5 w-5" />}
                title="Analytics"
                description="Use este bloco para destacar anomalias, tendência de queda/subida e oportunidades. Mantive como resumo para não duplicar a operação em tempo real."
                tone="border-violet-200 bg-violet-50 text-violet-700"
              />
              <SummaryPanel
                icon={<Cloud className="h-5 w-5" />}
                title="Cloud / Sync"
                description="Resumo executivo de sincronização e integridade dos dados. Detalhes técnicos continuam melhor na área de configuração/logs."
                tone="border-indigo-200 bg-indigo-50 text-indigo-700"
              />
            </div>
          </section>
        </>
      )}
    </div>
  )
}

function KpiCard({
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
    <div className={`rounded-xl bg-gradient-to-br ${tone} p-5 text-white shadow-lg`}>
      <div className="mb-4 flex items-center justify-between text-white/85">
        {icon}
        <span className="text-xs font-bold uppercase">{label}</span>
      </div>
      <p className="text-3xl font-black">{value}</p>
      <p className="mt-1 text-sm text-white/85">{detail}</p>
    </div>
  )
}

function SummaryPanel({
  icon,
  title,
  description,
  tone,
}: {
  icon: ReactNode
  title: string
  description: string
  tone: string
}) {
  return (
    <div className={`rounded-xl border p-5 shadow-sm ${tone}`}>
      <div className="mb-3 flex items-center gap-2">
        {icon}
        <h2 className="font-bold text-gray-900">{title}</h2>
      </div>
      <p className="text-sm text-gray-600">{description}</p>
    </div>
  )
}

function MiniMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-white/75 px-3 py-2">
      <p className="font-semibold text-gray-400">{label}</p>
      <p className="mt-1 font-bold text-gray-900">{value}</p>
    </div>
  )
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
