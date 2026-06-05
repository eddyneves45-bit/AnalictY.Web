'use client'

import React, { useEffect, useMemo, useState } from 'react'
import { AlertTriangle, ArrowLeft, BellRing, Check, Pencil, Plus, Search, Send, Trash2 } from 'lucide-react'
import { ProtectedLayout } from '@/components/layout/protected-layout'
import { API_BASE_URL, apiFetch } from '@/lib/api'
import { useAuth } from '@/components/providers/auth-provider'
import { useMesSignalR } from '@/lib/useMesSignalR'
import { usePageReady } from '@/components/providers/navigation-feedback-provider'
import { useRouter } from 'next/navigation'

type AlertItem = {
  id: number
  alertType: string
  severity: string
  title: string
  message: string
  machineId: string | null
  metadata: string | null
  isAcknowledged: boolean
  acknowledgedBy: string | null
  acknowledgedAt: string | null
  createdAt: string
}

type AlertRule = {
  id: number
  name: string
  tagConfigId: number
  tagName: string | null
  operator: string
  limitValue: number
  severity: string
  message: string
  telegramConnectionId: number | null
  telegramRecipientIds: number[]
  isActive: boolean
}

type TagOption = {
  id: number
  tagName: string
}

type TelegramStatus = {
  enabled: boolean
  botTokenConfigured: boolean
  chatIdConfigured: boolean
  chatId: string | null
  cooldownMinutes: number
}

type TelegramConnectionOption = {
  id: number
  name: string
  is_active: boolean
  active_recipients: number
}

type TelegramRecipientOption = {
  id: number
  connection_id: number
  name: string
  chat_id: string
  destination_type: string
  is_active: boolean
}

const emptyForm = {
  id: null as number | null,
  name: '',
  tag_config_id: '',
  operator: '>',
  limit_value: '',
  severity: 'medium',
  message: '',
  telegram_connection_id: '',
  telegram_recipient_ids: [] as number[],
  is_active: true,
}

const ALERT_LIMIT = 20

export default function AlertsPage() {
  const { token } = useAuth()
  const router = useRouter()
  const [alerts, setAlerts] = useState<AlertItem[]>([])
  const [rules, setRules] = useState<AlertRule[]>([])
  const [tags, setTags] = useState<TagOption[]>([])
  const [form, setForm] = useState(emptyForm)
  const [modalOpen, setModalOpen] = useState(false)
  const [formFeedback, setFormFeedback] = useState<{ type: 'error' | 'success'; message: string } | null>(null)
  const [loading, setLoading] = useState(true)
  const [telegramStatus, setTelegramStatus] = useState<TelegramStatus | null>(null)
  const [telegramConnections, setTelegramConnections] = useState<TelegramConnectionOption[]>([])
  const [telegramRecipients, setTelegramRecipients] = useState<TelegramRecipientOption[]>([])
  const [telegramMessage, setTelegramMessage] = useState<string | null>(null)
  const [testingTelegram, setTestingTelegram] = useState(false)
  const [telegramRecipientSearch, setTelegramRecipientSearch] = useState('')
  const [alertSearch, setAlertSearch] = useState('')
  const [retentionDays, setRetentionDays] = useState(1)
  const [timeZoneId, setTimeZoneId] = useState('America/Sao_Paulo')
  const [timeZoneLabel, setTimeZoneLabel] = useState('Brasil - Brasília (GMT-3)')
  usePageReady(!loading)

  async function loadData() {
    const headers: HeadersInit = {}
    const [alertsRes, rulesRes, tagsRes, retentionRes, timezoneRes] = await Promise.all([
      apiFetch(`${API_BASE_URL}/api/alerts?limit=${ALERT_LIMIT}`, { headers }),
      apiFetch(`${API_BASE_URL}/api/alert-rules`, { headers }),
      apiFetch(`${API_BASE_URL}/api/config/tags`, { headers }),
      apiFetch(`${API_BASE_URL}/api/alerts/retention`, { headers }),
      apiFetch(`${API_BASE_URL}/api/config/system/timezone`, { headers }),
    ])

    if (alertsRes.ok) setAlerts(((await alertsRes.json()).alerts ?? []).slice(0, ALERT_LIMIT))
    if (rulesRes.ok) setRules((await rulesRes.json()).rules ?? [])
    if (tagsRes.ok) {
      const data = await tagsRes.json()
      setTags(data.map((tag: any) => ({ id: tag.id, tagName: tag.tagName })))
    }
    if (retentionRes.ok) {
      const data = await retentionRes.json()
      setRetentionDays(data.retention_days ?? 1)
    }
    if (timezoneRes.ok) {
      const data = await timezoneRes.json()
      setTimeZoneId(data.timeZoneId ?? 'America/Sao_Paulo')
      setTimeZoneLabel(data.label ?? data.timeZoneId ?? 'Fuso configurado')
    }
    setLoading(false)
  }

  async function loadTelegramStatus() {
    const [response, connectionsResponse, recipientsResponse] = await Promise.all([
      apiFetch(`${API_BASE_URL}/api/notifications/telegram/status`),
      apiFetch(`${API_BASE_URL}/api/notifications/telegram/connections`),
      apiFetch(`${API_BASE_URL}/api/notifications/telegram/recipients`),
    ])
    if (response.ok) setTelegramStatus(await response.json())
    if (connectionsResponse.ok) setTelegramConnections(await connectionsResponse.json())
    if (recipientsResponse.ok) setTelegramRecipients(await recipientsResponse.json())
  }

  useEffect(() => {
    loadData()
    loadTelegramStatus()
  }, [token])

  useMesSignalR({
    onAlertSnapshot: (snapshot) => setAlerts((snapshot as AlertItem[]).slice(0, ALERT_LIMIT)),
    onAlertCreated: (alert) => setAlerts((previous) => [alert as AlertItem, ...previous.filter((item) => item.id !== alert.id)].slice(0, ALERT_LIMIT)),
    onAlertUpdated: (alert) => setAlerts((previous) => previous.map((item) => item.id === alert.id ? alert as AlertItem : item)),
    onAlertDeleted: (alertId) => setAlerts((previous) => previous.filter((item) => item.id !== alertId)),
    enabled: !!token,
  })

  const pendingAlerts = useMemo(() => alerts.filter((alert) => !alert.isAcknowledged), [alerts])
  const filteredAlerts = useMemo(() => {
    const term = alertSearch.trim().toLowerCase()
    if (!term) return alerts

    return alerts.filter((alert) => [
      alert.title,
      alert.message,
      alert.severity,
      alert.alertType,
      alert.machineId,
      alert.metadata,
      alert.isAcknowledged ? 'reconhecido' : 'pendente',
    ].some((value) => String(value ?? '').toLowerCase().includes(term)))
  }, [alerts, alertSearch])

  function openCreate() {
    setForm(emptyForm)
    setFormFeedback(null)
    setModalOpen(true)
  }

  function openEdit(rule: AlertRule) {
    setFormFeedback(null)
    setForm({
      id: rule.id,
      name: rule.name,
      tag_config_id: String(rule.tagConfigId),
      operator: rule.operator,
      limit_value: String(rule.limitValue),
      severity: rule.severity,
      message: rule.message,
      telegram_connection_id: rule.telegramConnectionId ? String(rule.telegramConnectionId) : '',
      telegram_recipient_ids: rule.telegramRecipientIds ?? [],
      is_active: rule.isActive,
    })
    setModalOpen(true)
  }

  async function saveRule() {
    setFormFeedback(null)
    const missingFields = []
    if (!form.name.trim()) missingFields.push('nome da regra')
    if (!form.tag_config_id) missingFields.push('TAG')
    if (form.limit_value === '' || Number.isNaN(Number(form.limit_value))) missingFields.push('limite')
    if (!form.message.trim()) missingFields.push('mensagem ao operador')

    if (missingFields.length > 0) {
      setFormFeedback({
        type: 'error',
        message: `Preencha ${missingFields.join(', ')} para salvar a regra.`,
      })
      return
    }

    const response = await apiFetch(
      form.id ? `${API_BASE_URL}/api/alert-rules/${form.id}` : `${API_BASE_URL}/api/alert-rules`,
      {
        method: form.id ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json', },
        body: JSON.stringify({
          name: form.name,
          tag_config_id: Number(form.tag_config_id),
          operator: form.operator,
          limit_value: Number(form.limit_value),
          severity: form.severity,
          message: form.message,
          telegram_connection_id: form.telegram_connection_id ? Number(form.telegram_connection_id) : null,
          telegram_recipient_ids: form.telegram_recipient_ids,
          is_active: form.is_active,
        }),
      },
    )

    const data = await response.json().catch(() => null)
    if (response.ok) {
      setFormFeedback({ type: 'success', message: 'Regra salva com sucesso.' })
      setModalOpen(false)
      await loadData()
      return
    }

    setFormFeedback({
      type: 'error',
      message: typeof data === 'string' ? data : data?.message || 'Não foi possível salvar a regra. Verifique os campos e tente novamente.',
    })
  }

  async function deleteRule(id: number) {
    if (!window.confirm('Excluir esta regra de alerta?')) return
    const response = await apiFetch(`${API_BASE_URL}/api/alert-rules/${id}`, {
      method: 'DELETE',
    })
    if (response.ok) await loadData()
  }

  async function acknowledge(id: number) {
    const response = await apiFetch(`${API_BASE_URL}/api/alerts/${id}/acknowledge?acknowledged_by=admin`, {
      method: 'POST',
    })
    if (response.ok) await loadData()
  }

  async function changeRetention(days: number) {
    setRetentionDays(days)
    const response = await apiFetch(`${API_BASE_URL}/api/alerts/retention`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ retention_days: days }),
    })
    if (response.ok) await loadData()
  }

  async function testTelegram() {
    setTestingTelegram(true)
    setTelegramMessage(null)
    try {
      const response = await apiFetch(`${API_BASE_URL}/api/notifications/telegram/test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
      const data = await response.json().catch(() => null)
      setTelegramMessage(data?.message || (response.ok ? 'Mensagem enviada pelo Telegram.' : 'Falha ao testar Telegram.'))
      await loadTelegramStatus()
    } finally {
      setTestingTelegram(false)
    }
  }

  const selectedTelegramRecipients = telegramRecipients.filter((recipient) =>
    recipient.is_active
    && (!form.telegram_connection_id || recipient.connection_id === Number(form.telegram_connection_id))
    && (
      telegramRecipientSearch.trim() === ''
      || recipient.name.toLowerCase().includes(telegramRecipientSearch.trim().toLowerCase())
      || recipient.chat_id.toLowerCase().includes(telegramRecipientSearch.trim().toLowerCase())
      || recipient.destination_type.toLowerCase().includes(telegramRecipientSearch.trim().toLowerCase())
    )
  )

  const allAvailableTelegramRecipients = telegramRecipients.filter((recipient) =>
    recipient.is_active
    && (!form.telegram_connection_id || recipient.connection_id === Number(form.telegram_connection_id))
  )

  const selectedTelegramRecipientCount = form.telegram_recipient_ids.length

  function toggleTelegramRecipient(id: number) {
    setForm((current) => ({
      ...current,
      telegram_recipient_ids: current.telegram_recipient_ids.includes(id)
        ? current.telegram_recipient_ids.filter((item) => item !== id)
        : [...current.telegram_recipient_ids, id],
    }))
  }

  function selectAllTelegramRecipients() {
    setForm((current) => ({
      ...current,
      telegram_recipient_ids: allAvailableTelegramRecipients.map((recipient) => recipient.id),
    }))
  }

  function clearTelegramRecipients() {
    setForm((current) => ({ ...current, telegram_recipient_ids: [] }))
  }

  return (
    <ProtectedLayout allowedPermissions={['alert-rules.manage']}>
      <div className="space-y-6">
        <header className="flex items-center justify-between">
          <div className="flex items-start gap-4">
            <button onClick={() => router.back()} className="rounded-lg p-2 transition-colors hover:bg-gray-100">
              <ArrowLeft className="h-5 w-5 text-gray-600" />
            </button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Alertas</h1>
              <p className="text-gray-600">{pendingAlerts.length} alerta(s) aguardando reconhecimento.</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-700">
              Guarda
              <select
                value={retentionDays}
                onChange={(event) => changeRetention(Number(event.target.value))}
                className="bg-white font-bold text-gray-900 outline-none"
              >
                {[1, 2, 3, 4, 5, 6, 7].map((day) => (
                  <option key={day} value={day}>{day} dia{day > 1 ? 's' : ''}</option>
                ))}
              </select>
            </label>
            <button onClick={openCreate} className="flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 font-semibold text-white">
              <Plus className="h-4 w-4" />
              Nova regra
            </button>
          </div>
        </header>

        <section className="grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-gray-200 bg-white p-5">
            <p className="text-sm text-gray-500">Pendentes</p>
            <p className="mt-1 text-3xl font-bold text-gray-900">{pendingAlerts.length}</p>
          </div>
          <div className="rounded-2xl border border-gray-200 bg-white p-5">
            <p className="text-sm text-gray-500">Regras ativas</p>
            <p className="mt-1 text-3xl font-bold text-gray-900">{rules.filter((rule) => rule.isActive).length}</p>
          </div>
          <div className="rounded-2xl border border-gray-200 bg-white p-5">
            <p className="text-sm text-gray-500">Últimas notificações</p>
            <p className="mt-1 text-3xl font-bold text-gray-900">{alerts.length}</p>
          </div>
        </section>

        <section className="rounded-2xl border border-gray-200 bg-white p-5">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-start gap-3">
              <Send className="mt-1 h-5 w-5 text-blue-600" />
              <div>
                <h2 className="font-semibold text-gray-900">Notificação Telegram</h2>
                <p className="text-sm text-gray-600">
                  {telegramStatus?.enabled
                    ? `Ativo para o chat ${telegramStatus.chatId}. Cooldown: ${telegramStatus.cooldownMinutes} min.`
                    : 'Configure o Telegram na Central de Configurações para enviar alertas.'}
                </p>
                {telegramMessage && <p className="mt-2 text-sm font-medium text-gray-700">{telegramMessage}</p>}
              </div>
            </div>
            <button
              onClick={testTelegram}
              disabled={testingTelegram || !telegramStatus?.enabled}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-gray-300"
            >
              <Send className="h-4 w-4" />
              {testingTelegram ? 'Enviando...' : 'Testar Telegram'}
            </button>
          </div>
        </section>

        <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
          <div className="flex flex-col gap-3 border-b border-gray-100 px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="font-semibold text-gray-900">Últimas 20 notificações</h2>
              <p className="text-sm text-gray-500">Horários no fuso configurado: {timeZoneLabel}</p>
            </div>
            <div className="relative w-full lg:w-80">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                value={alertSearch}
                onChange={(event) => setAlertSearch(event.target.value)}
                placeholder="Pesquisar ocorrências..."
                className="w-full rounded-lg border border-gray-300 py-2 pl-9 pr-3 text-sm text-gray-900 outline-none focus:border-red-500"
              />
            </div>
          </div>
          <div className="max-h-[560px] divide-y divide-gray-100 overflow-y-auto">
            {loading ? (
              <p className="px-5 py-6 text-gray-500">Carregando...</p>
            ) : alerts.length === 0 ? (
              <p className="px-5 py-6 text-gray-500">Nenhum alerta registrado.</p>
            ) : filteredAlerts.length === 0 ? (
              <p className="px-5 py-6 text-gray-500">Nenhuma ocorrência encontrada para a pesquisa.</p>
            ) : filteredAlerts.map((alert) => (
              <div key={alert.id} className="grid gap-3 px-5 py-4 md:grid-cols-[1fr_130px_180px_150px] md:items-center">
                <div className="flex items-start gap-3">
                  <AlertTriangle className={`mt-1 h-5 w-5 ${severityColor(alert.severity)}`} />
                  <div>
                    <p className="font-semibold text-gray-900">{alert.title}</p>
                    <p className="text-sm text-gray-600">{alert.message}</p>
                  </div>
                </div>
                <span className="text-sm uppercase text-gray-600">{alert.severity}</span>
                <span className="text-sm text-gray-600">{formatAlertDate(alert.createdAt, timeZoneId)}</span>
                {alert.isAcknowledged ? (
                  <span className="text-sm text-green-700">Reconhecido</span>
                ) : (
                  <button onClick={() => acknowledge(alert.id)} className="inline-flex items-center justify-center gap-2 rounded-lg border border-green-600 px-3 py-2 text-sm font-semibold text-green-700">
                    <Check className="h-4 w-4" />
                    Reconhecer
                  </button>
                )}
              </div>
            ))}
          </div>
        </section>

        <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
          <div className="border-b border-gray-100 px-5 py-4">
            <h2 className="font-semibold text-gray-900">Regras configuradas</h2>
          </div>
          <div className="divide-y divide-gray-100">
            {rules.length === 0 ? (
              <p className="px-5 py-6 text-gray-500">Nenhuma regra configurada.</p>
            ) : rules.map((rule) => (
              <div key={rule.id} className="grid gap-3 px-5 py-4 md:grid-cols-[1fr_180px_130px_110px] md:items-center">
                <div className="flex items-start gap-3">
                  <BellRing className="mt-1 h-5 w-5 text-red-600" />
                  <div>
                    <p className="font-semibold text-gray-900">{rule.name}</p>
                    <p className="text-sm text-gray-600">{rule.tagName} {rule.operator} {rule.limitValue}</p>
                  </div>
                </div>
                <span className="text-sm text-gray-600">{rule.message}</span>
                <span className={`text-sm ${rule.isActive ? 'text-green-700' : 'text-gray-500'}`}>{rule.isActive ? 'Ativa' : 'Inativa'}</span>
                <div className="flex justify-end gap-2">
                  <button onClick={() => openEdit(rule)} className="rounded-lg p-2 text-blue-600 hover:bg-blue-50" title="Editar regra">
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button onClick={() => deleteRule(rule.id)} className="rounded-lg p-2 text-red-600 hover:bg-red-50" title="Excluir regra">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-xl">
            <div className="border-b border-gray-100 px-6 py-5">
              <h2 className="text-xl font-bold text-gray-900">{form.id ? 'Editar regra' : 'Nova regra'}</h2>
              {formFeedback && (
                <div className={`mt-4 rounded-lg border px-4 py-3 text-sm font-semibold ${
                  formFeedback.type === 'error'
                    ? 'border-red-200 bg-red-50 text-red-700'
                    : 'border-emerald-200 bg-emerald-50 text-emerald-700'
                }`}>
                  {formFeedback.message}
                </div>
              )}
            </div>
            <div className="flex-1 space-y-4 overflow-y-auto px-6 py-5">
              <input className="w-full rounded-lg border border-gray-300 px-3 py-2" placeholder="Nome da regra *" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
              <select className="w-full rounded-lg border border-gray-300 px-3 py-2" value={form.tag_config_id} onChange={(event) => setForm({ ...form, tag_config_id: event.target.value })}>
                <option value="">Selecione a TAG</option>
                {tags.map((tag) => <option key={tag.id} value={tag.id}>{tag.tagName}</option>)}
              </select>
              <div className="grid grid-cols-[120px_1fr] gap-3">
                <select className="rounded-lg border border-gray-300 px-3 py-2" value={form.operator} onChange={(event) => setForm({ ...form, operator: event.target.value })}>
                  {['>', '>=', '<', '<=', '=', '!='].map((operator) => <option key={operator}>{operator}</option>)}
                </select>
                <input className="rounded-lg border border-gray-300 px-3 py-2" type="number" placeholder="Limite *" value={form.limit_value} onChange={(event) => setForm({ ...form, limit_value: event.target.value })} />
              </div>
              <select className="w-full rounded-lg border border-gray-300 px-3 py-2" value={form.severity} onChange={(event) => setForm({ ...form, severity: event.target.value })}>
                <option value="low">Baixa</option>
                <option value="medium">Média</option>
                <option value="high">Alta</option>
                <option value="critical">Crítica</option>
              </select>
              <textarea className="min-h-24 w-full rounded-lg border border-gray-300 px-3 py-2" placeholder="Mensagem ao operador *" value={form.message} onChange={(event) => setForm({ ...form, message: event.target.value })} />
              <section className="rounded-xl border border-blue-100 bg-blue-50/60 p-4">
                <h3 className="font-semibold text-gray-900">Notificação Telegram</h3>
                <p className="mt-1 text-sm text-gray-600">
                  Sem seleção, a regra usa todos os destinatários ativos. Se escolher uma conexão ou usuários, envia só para eles.
                </p>
                <label className="mt-4 block space-y-1 text-sm">
                  <span className="font-semibold text-gray-600">Conexão</span>
                  <select
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2"
                    value={form.telegram_connection_id}
                    onChange={(event) => setForm({ ...form, telegram_connection_id: event.target.value, telegram_recipient_ids: [] })}
                  >
                    <option value="">Todas as conexões ativas</option>
                    {telegramConnections.filter((connection) => connection.is_active).map((connection) => (
                      <option key={connection.id} value={connection.id}>
                        {connection.name} ({connection.active_recipients} ativo(s))
                      </option>
                    ))}
                  </select>
                </label>
                <div className="mt-4 space-y-2">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm font-semibold text-gray-600">Destinatários</p>
                      <p className="text-xs text-gray-500">
                        {selectedTelegramRecipientCount === 0
                          ? 'Nenhum selecionado: envia para todos os ativos.'
                          : `${selectedTelegramRecipientCount} selecionado(s).`}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button type="button" onClick={selectAllTelegramRecipients} className="rounded-lg bg-white px-3 py-2 text-xs font-bold text-blue-700 ring-1 ring-blue-100">
                        Selecionar todos
                      </button>
                      <button type="button" onClick={clearTelegramRecipients} className="rounded-lg bg-white px-3 py-2 text-xs font-bold text-gray-600 ring-1 ring-gray-200">
                        Limpar
                      </button>
                    </div>
                  </div>
                  <input
                    className="w-full rounded-lg border border-blue-100 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none"
                    placeholder="Buscar destinatário, chat ou tipo..."
                    value={telegramRecipientSearch}
                    onChange={(event) => setTelegramRecipientSearch(event.target.value)}
                  />
                  {selectedTelegramRecipients.length === 0 ? (
                    <p className="rounded-lg border border-dashed border-blue-200 bg-white px-3 py-3 text-sm text-gray-500">
                      Nenhum destinatário ativo encontrado para esta seleção.
                    </p>
                  ) : (
                    <div className="max-h-56 overflow-y-auto rounded-xl border border-blue-100 bg-white p-2">
                      {selectedTelegramRecipients.map((recipient) => (
                        <label key={recipient.id} className="flex items-start gap-3 rounded-lg px-3 py-2 text-sm text-gray-700 hover:bg-blue-50">
                          <input
                            type="checkbox"
                            checked={form.telegram_recipient_ids.includes(recipient.id)}
                            onChange={() => toggleTelegramRecipient(recipient.id)}
                            className="mt-1"
                          />
                          <span>
                            <span className="block font-semibold text-gray-900">{recipient.name}</span>
                            <span className="text-xs text-gray-500">{recipient.destination_type} · chat {recipient.chat_id}</span>
                          </span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              </section>
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input type="checkbox" checked={form.is_active} onChange={(event) => setForm({ ...form, is_active: event.target.checked })} />
                Regra ativa
              </label>
            </div>
            <div className="flex justify-end gap-3 border-t border-gray-100 bg-white px-6 py-4">
              <button onClick={() => setModalOpen(false)} className="rounded-lg border border-gray-300 px-4 py-2">Cancelar</button>
              <button onClick={saveRule} className="rounded-lg bg-red-600 px-4 py-2 font-semibold text-white">Salvar</button>
            </div>
          </div>
        </div>
      )}
    </ProtectedLayout>
  )
}

function severityColor(severity: string) {
  if (severity === 'critical' || severity === 'high') return 'text-red-600'
  if (severity === 'medium') return 'text-orange-500'
  return 'text-blue-600'
}

function parseApiDate(value: string) {
  if (!value) return new Date(Number.NaN)
  return new Date(/[zZ]|[+-]\d{2}:\d{2}$/.test(value) ? value : `${value}Z`)
}

function formatAlertDate(value: string, timeZone: string) {
  const date = parseApiDate(value)
  if (Number.isNaN(date.getTime())) return '--'
  return new Intl.DateTimeFormat('pt-BR', {
    timeZone,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).format(date)
}
