'use client'

import React, { Suspense, useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { AlertTriangle, ArrowLeft, Check } from 'lucide-react'
import { ProtectedLayout } from '@/components/layout/protected-layout'
import { API_BASE_URL, apiFetch } from '@/lib/api'
import { useAuth } from '@/components/providers/auth-provider'
import { usePageReady } from '@/components/providers/navigation-feedback-provider'

type Downtime = {
  id: number
  downtime_id: number | null
  machine_id: string
  machine_name: string | null
  machine_code: string | null
  start_time: string
  end_time: string | null
  duration_seconds: number | null
  status_origin: number | null
  status_origin_description: string | null
  can_classify: boolean
  reason_id: number | null
  reason: string | null
  category: string | null
  informed_reason: string | null
  observation: string | null
  acknowledged_by: string | null
}

type Reason = {
  id: number
  code: string
  description: string
  category: string | null
}

type Machine = {
  id: number
  name: string
  code: string
}

export default function DowntimeReasonsPage() {
  return (
    <Suspense fallback={<DowntimeReasonsLoading />}>
      <DowntimeReasonsPageContent />
    </Suspense>
  )
}

function DowntimeReasonsPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const machineId = searchParams.get('machine_id')
  const machineName = searchParams.get('machine_name')
  const machineCode = searchParams.get('machine_code')
  const { token } = useAuth()
  const [downtimes, setDowntimes] = useState<Downtime[]>([])
  const [reasons, setReasons] = useState<Reason[]>([])
  const [machines, setMachines] = useState<Machine[]>([])
  const [filterMachineId, setFilterMachineId] = useState(machineId ?? '')
  const [filterFromDate, setFilterFromDate] = useState('')
  const [filterToDate, setFilterToDate] = useState('')
  const [retentionDays, setRetentionDays] = useState(1)
  const [timeZoneId, setTimeZoneId] = useState('America/Sao_Paulo')
  const [timeZoneLabel, setTimeZoneLabel] = useState('Brasil - Brasília (GMT-3)')
  const [selected, setSelected] = useState<Downtime | null>(null)
  const [reasonId, setReasonId] = useState('')
  const [informedReason, setInformedReason] = useState('')
  const [observation, setObservation] = useState('')
  const [loading, setLoading] = useState(true)
  usePageReady(!loading)

  async function loadData(nextFilters?: { machineId?: string; fromDate?: string; toDate?: string }) {
    setLoading(true)
    const activeMachineId = nextFilters?.machineId ?? filterMachineId
    const activeFromDate = nextFilters?.fromDate ?? filterFromDate
    const activeToDate = nextFilters?.toDate ?? filterToDate
    const params = new URLSearchParams()
    if (activeMachineId) params.set('machine_id', activeMachineId)
    if (activeFromDate) params.set('from', toDateBoundaryIso(activeFromDate, false))
    if (activeToDate) params.set('to', toDateBoundaryIso(activeToDate, true))
    params.set('limit', activeFromDate || activeToDate || activeMachineId ? '200' : '30')
    const [downtimeRes, reasonsRes, retentionRes, timeZoneRes, machinesRes] = await Promise.all([
      apiFetch(`${API_BASE_URL}/api/downtimes?${params.toString()}`, { }),
      apiFetch(`${API_BASE_URL}/api/downtime-reasons/catalog`, { }),
      apiFetch(`${API_BASE_URL}/api/downtimes/retention`, { }),
      apiFetch(`${API_BASE_URL}/api/config/system/timezone`, { }),
      apiFetch(`${API_BASE_URL}/api/machines`, { }),
    ])
    if (downtimeRes.ok) setDowntimes(await downtimeRes.json())
    if (reasonsRes.ok) setReasons(await reasonsRes.json())
    if (retentionRes.ok) {
      const data = await retentionRes.json()
      setRetentionDays(data.retention_days ?? 1)
    }
    if (timeZoneRes.ok) {
      const data = await timeZoneRes.json()
      setTimeZoneId(data.timeZoneId ?? data.time_zone_id ?? 'America/Sao_Paulo')
      setTimeZoneLabel(data.label ?? data.timeZoneId ?? data.time_zone_id ?? 'America/Sao_Paulo')
    }
    if (machinesRes.ok) {
      const data = await machinesRes.json()
      setMachines((data ?? []).map((machine: any) => ({
        id: Number(machine.id ?? machine.Id),
        name: machine.name ?? machine.Name ?? `Máquina ${machine.id ?? machine.Id}`,
        code: machine.code ?? machine.Code ?? '',
      })))
    }
    setLoading(false)
  }

  useEffect(() => {
    setFilterMachineId(machineId ?? '')
    if (token) void loadData({ machineId: machineId ?? '', fromDate: filterFromDate, toDate: filterToDate })
  }, [machineId, token])

  const openCount = useMemo(() => downtimes.filter((item) => item.can_classify && !item.end_time).length, [downtimes])
  const selectedFilterMachine = useMemo(() => machines.find((machine) => String(machine.id) === filterMachineId), [machines, filterMachineId])
  const scopeLabel = filterMachineId
    ? `${selectedFilterMachine?.name || machineName || `Máquina ${filterMachineId}`}${selectedFilterMachine?.code || machineCode ? ` (${selectedFilterMachine?.code || machineCode})` : ''}`
    : 'Todas as máquinas'
  const filteredPeriodLabel = filterFromDate || filterToDate
    ? `${filterFromDate ? formatDateInputLabel(filterFromDate) : 'início'} até ${filterToDate ? formatDateInputLabel(filterToDate) : 'agora'}`
    : 'período de guarda atual'

  function applyFilters() {
    const params = new URLSearchParams()
    if (filterMachineId) {
      params.set('machine_id', filterMachineId)
      const machine = machines.find((item) => String(item.id) === filterMachineId)
      if (machine?.name) params.set('machine_name', machine.name)
      if (machine?.code) params.set('machine_code', machine.code)
    }
    router.replace(params.size > 0 ? `/downtime-reasons?${params.toString()}` : '/downtime-reasons')
    void loadData({ machineId: filterMachineId, fromDate: filterFromDate, toDate: filterToDate })
  }

  function clearFilters() {
    setFilterMachineId('')
    setFilterFromDate('')
    setFilterToDate('')
    router.replace('/downtime-reasons')
    void loadData({ machineId: '', fromDate: '', toDate: '' })
  }

  async function saveRetention(days: number) {
    setRetentionDays(days)
    const response = await apiFetch(`${API_BASE_URL}/api/downtimes/retention`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ retention_days: days }),
    })
    if (response.ok) await loadData()
  }

  function openClassify(item: Downtime) {
    setSelected(item)
    setReasonId(item.reason_id ? String(item.reason_id) : '')
    setInformedReason(item.informed_reason || '')
    setObservation(item.observation || '')
  }

  async function classify() {
    if (!selected) return
    if (!selected.downtime_id) return
    const response = await apiFetch(`${API_BASE_URL}/api/downtimes/${selected.downtime_id}/classify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', },
      body: JSON.stringify({
        reason_id: reasonId ? Number(reasonId) : null,
        motivo_informado: informedReason || null,
        observacao: observation || null,
        reconhecida_por: 'admin',
      }),
    })
    if (response.ok) {
      setSelected(null)
      await loadData()
    }
  }

  return (
    <ProtectedLayout>
      <div className="space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <button onClick={() => router.back()} className="rounded-lg p-2 hover:bg-gray-100">
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Histórico de Paradas</h1>
              <p className="text-gray-600">
                {scopeLabel} · {filteredPeriodLabel} · {openCount} parada(s) aberta(s) aguardando classificação.
              </p>
              <p className="mt-1 text-xs text-gray-500">Horários no fuso configurado: {timeZoneLabel}.</p>
            </div>
          </div>
          <label className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-700">
            Guarda
            <select
              value={retentionDays}
              onChange={(event) => void saveRetention(Number(event.target.value))}
              className="rounded-md border border-gray-300 bg-white px-2 py-1 text-sm text-gray-900"
            >
              {[1, 2, 3, 4, 5, 6, 7].map((days) => (
                <option key={days} value={days}>{days} dia{days > 1 ? 's' : ''}</option>
              ))}
            </select>
          </label>
        </div>

        <section className="rounded-2xl border border-gray-200 bg-white p-4">
          <div className="grid gap-3 lg:grid-cols-[minmax(220px,1fr)_180px_180px_auto_auto] lg:items-end">
            <label className="space-y-1 text-sm">
              <span className="font-semibold text-gray-700">Máquina</span>
              <select
                value={filterMachineId}
                onChange={(event) => setFilterMachineId(event.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900"
              >
                <option value="">Todas as máquinas</option>
                {machines.map((machine) => (
                  <option key={machine.id} value={machine.id}>
                    {machine.name}{machine.code ? ` (${machine.code})` : ''}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-1 text-sm">
              <span className="font-semibold text-gray-700">Data inicial</span>
              <input
                type="date"
                value={filterFromDate}
                onChange={(event) => setFilterFromDate(event.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900"
              />
            </label>
            <label className="space-y-1 text-sm">
              <span className="font-semibold text-gray-700">Data final</span>
              <input
                type="date"
                value={filterToDate}
                onChange={(event) => setFilterToDate(event.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900"
              />
            </label>
            <button
              type="button"
              onClick={applyFilters}
              className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-bold text-white hover:bg-blue-800"
            >
              Filtrar
            </button>
            <button
              type="button"
              onClick={clearFilters}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-bold text-gray-700 hover:bg-gray-50"
            >
              Limpar
            </button>
          </div>
        </section>

        <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
          <div className="grid grid-cols-[80px_minmax(220px,1fr)_180px_180px_110px_160px_130px] gap-3 border-b bg-gray-50 px-5 py-3 text-xs font-bold uppercase tracking-wide text-gray-500">
            <span>ID</span>
            <span>Máquina</span>
            <span>Trigger</span>
            <span>Recovery</span>
            <span>Tempo</span>
            <span>Status / Classificação</span>
            <span>Botão</span>
          </div>
          <div className="max-h-[620px] divide-y divide-gray-100 overflow-y-auto">
            {downtimes.map((item) => (
              <div key={item.id} className="grid grid-cols-[80px_minmax(220px,1fr)_180px_180px_110px_160px_130px] gap-3 px-5 py-4 text-sm">
                <span className="font-mono text-gray-700">{item.id}</span>
                <div>
                  <p className="font-semibold text-gray-900">{item.machine_name || `Máquina ${item.machine_id}`}</p>
                  <p className="text-xs text-gray-500">{item.machine_code || item.machine_id}</p>
                </div>
                <span className="text-gray-600">{formatDateTime(item.start_time, timeZoneId)}</span>
                <span className="text-gray-600">{item.end_time ? formatDateTime(item.end_time, timeZoneId) : 'Em andamento'}</span>
                <span className="font-mono text-gray-700">{formatDuration(item.duration_seconds)}</span>
                <span className="text-gray-600">{item.reason || item.category || item.status_origin_description || 'Não classificada'}</span>
                {item.can_classify ? (
                  <button onClick={() => openClassify(item)} className="rounded-lg border px-3 py-2 text-sm font-semibold hover:bg-gray-50">
                    {item.reason_id || item.informed_reason ? 'Editar' : 'Classificar'}
                  </button>
                ) : (
                  <span className="rounded-lg bg-emerald-50 px-3 py-2 text-center text-sm font-semibold text-emerald-700">
                    Produção
                  </span>
                )}
              </div>
            ))}
            {downtimes.length === 0 && !loading && (
              <div className="px-5 py-10 text-center text-sm text-gray-500">
                <p>Nenhum evento de status encontrado para os filtros atuais.</p>
                <p className="mt-2">
                  Ajuste a máquina ou o período para ampliar a busca.
                </p>
              </div>
            )}
          </div>
        </section>
      </div>

      {selected && (
        <Modal title="Classificar parada" onClose={() => setSelected(null)}>
          <select value={reasonId} onChange={(event) => setReasonId(event.target.value)} className="w-full rounded-lg border px-3 py-2">
            <option value="">Motivo do catálogo</option>
            {reasons.map((reason) => <option key={reason.id} value={reason.id}>{reason.description}</option>)}
          </select>
          <input value={informedReason} onChange={(event) => setInformedReason(event.target.value)} placeholder="Motivo livre (opcional)" className="w-full rounded-lg border px-3 py-2" />
          <textarea value={observation} onChange={(event) => setObservation(event.target.value)} placeholder="Observação" className="w-full rounded-lg border px-3 py-2" />
          <button onClick={classify} className="flex items-center justify-center gap-2 rounded-lg bg-red-600 px-4 py-2 font-semibold text-white">
            <Check className="h-4 w-4" />
            Salvar classificação
          </button>
        </Modal>
      )}

    </ProtectedLayout>
  )
}

function formatDateTime(value: string, timeZoneId: string) {
  return parseApiDate(value).toLocaleString('pt-BR', { timeZone: timeZoneId })
}

function parseApiDate(value: string) {
  if (/[zZ]$|[+-]\d{2}:\d{2}$/.test(value)) return new Date(value)
  return new Date(`${value}Z`)
}

function toDateBoundaryIso(value: string, endOfDay: boolean) {
  const suffix = endOfDay ? 'T23:59:59.999' : 'T00:00:00.000'
  return new Date(`${value}${suffix}`).toISOString()
}

function formatDateInputLabel(value: string) {
  const [year, month, day] = value.split('-')
  return year && month && day ? `${day}/${month}/${year}` : value
}

function formatDuration(seconds: number | null) {
  if (seconds == null) return '--'
  const totalSeconds = Math.max(Math.floor(seconds), 0)
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const remainingSeconds = totalSeconds % 60
  if (hours > 0) return `${hours}h ${minutes}m`
  if (minutes > 0) return `${minutes}m ${remainingSeconds}s`
  return `${remainingSeconds}s`
}

function DowntimeReasonsLoading() {
  return (
    <ProtectedLayout>
      <div className="rounded-xl border border-gray-200 bg-white p-8 text-center text-gray-500">
        Carregando paradas...
      </div>
    </ProtectedLayout>
  )
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-lg space-y-4 rounded-2xl bg-white p-6 shadow-2xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-600" />
            <h2 className="text-xl font-bold">{title}</h2>
          </div>
          <button onClick={onClose}>Fechar</button>
        </div>
        {children}
      </div>
    </div>
  )
}
