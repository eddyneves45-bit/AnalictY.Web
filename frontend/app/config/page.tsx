'use client'



import React, { useEffect, useState } from 'react'

import { useRouter, useSearchParams } from 'next/navigation'

import { ProtectedLayout } from '@/components/layout/protected-layout'

import { Factory, Database, Server, Plug, Tags, Bell, Wifi, ArrowLeft, TerminalSquare, Clock3, FlaskConical, TestTube2, Send, LayoutDashboard, Users, ShieldCheck, Network, Copy, CheckCircle2, DownloadCloud, RefreshCw, X, AlertTriangle, PackageCheck, Rocket } from 'lucide-react'

import { useAuth } from '@/components/providers/auth-provider'

import { API_BASE_URL, apiFetch } from '@/lib/api'
import { usePageReady } from '@/components/providers/navigation-feedback-provider'



type ConnectionSection = 'overview' | 'saved' | 'opcua' | 'mqtt' | 'mysql'
type ConfigSector = 'all' | 'connections' | 'production' | 'alerts' | 'visualization' | 'system'
type LocalServerMode = 'current' | 'fixed-ip'

type TimeZoneOption = {
  id: string
  label: string
}

type SystemVersionInfo = {
  product: string
  version: string
  channel: string
  built_at?: string | null
  data_directory?: string | null
  source: string
}

type UpdateCheckInfo = {
  configured: boolean
  update_available: boolean
  current: SystemVersionInfo
  latest?: {
    product?: string | null
    version?: string | null
    channel?: string | null
    url?: string | null
    sha256?: string | null
    released_at?: string | null
    changelog?: string[]
  } | null
  message: string
}

type UpdateDownloadInfo = {
  success: boolean
  message: string
  version?: string
  package_file?: string
  sha256?: string
}

type UpdatePhase = 'idle' | 'checking' | 'available' | 'downloading' | 'downloaded' | 'applying' | 'restarting' | 'complete' | 'error'



type OpcConnectionForm = {

  id: number | null

  name: string

  serverUrl: string

  securityPolicy: string

  securityMode: string

  username: string

  password: string

  certificatePath: string

  privateKeyPath: string

  updateInterval: string

  isActive: boolean

}



type MqttConnectionForm = {

  id: number | null

  name: string

  clientId: string

  brokerHost: string

  brokerPort: string

  username: string

  password: string

  tlsEnabled: boolean

  caCertPath: string

  clientCertPath: string

  clientKeyPath: string

  topics: string

  qos: string

  isActive: boolean

}



type MysqlConnectionForm = {

  id: number | null

  name: string

  host: string

  port: string

  user: string

  password: string

  database: string

  poolSize: string

  isActive: boolean

}



const createEmptyOpcForm = (): OpcConnectionForm => ({

  id: null,

  name: 'opc',

  serverUrl: 'opc.tcp://DESKTOP-EDDY:4840/G01',

  securityPolicy: 'None',

  securityMode: 'None',

  username: '',

  password: '',

  certificatePath: '',

  privateKeyPath: '',

  updateInterval: '1000',

  isActive: true,

})



const createEmptyMqttForm = (): MqttConnectionForm => ({

  id: null,

  name: 'MQTT AWS IoT',

  clientId: 'scada-mes-client',

  brokerHost: 'a1b2c3d4wxyz-ats.iot.sa-east-1.amazonaws.com',

  brokerPort: '8883',

  username: '',

  password: '',

  tlsEnabled: true,

  caCertPath: './certificates/aws-root-ca.pem',

  clientCertPath: './certificates/mqtt_client.crt',

  clientKeyPath: './certificates/mqtt_client.key',

  topics: 'mes/production/+, mes/machines/+, mes/alerts/+',

  qos: '1',

  isActive: true,

})



const createEmptyMysqlForm = (): MysqlConnectionForm => ({

  id: null,

  name: 'MySQL Principal',

  host: 'localhost',

  port: '3306',

  user: 'root',

  password: '',

  database: 'mes_production',

  poolSize: '10',

  isActive: true,

})



// Funções de mapeamento de dados da API para formulários

const mapOpcDataToForm = (item: any): OpcConnectionForm => ({

  id: item.id ?? null,

  name: item.name,

  serverUrl: item.server_url,

  securityPolicy: item.security_policy,

  securityMode: item.security_mode,

  username: item.username,

  password: item.password,

  certificatePath: item.certificate_path,

  privateKeyPath: item.private_key_path,

  updateInterval: String(item.update_interval),

  isActive: item.is_active,

})



const mapMqttDataToForm = (item: any): MqttConnectionForm => ({

  id: item.id ?? item.Id ?? null,

  name: item.name ?? item.Name ?? 'MQTT',

  clientId: item.client_id ?? item.clientId ?? item.ClientId ?? '',

  brokerHost: item.broker_host ?? item.brokerHost ?? item.BrokerHost ?? '',

  brokerPort: String(item.broker_port ?? item.brokerPort ?? item.BrokerPort ?? 8883),

  username: item.username ?? item.Username ?? '',

  password: item.password ?? item.Password ?? '',

  tlsEnabled: item.tls_enabled ?? item.tlsEnabled ?? item.TlsEnabled ?? true,

  caCertPath: item.ca_cert_path ?? item.caCertPath ?? item.CaCertPath ?? '',

  clientCertPath: item.client_cert_path ?? item.clientCertPath ?? item.ClientCertPath ?? '',

  clientKeyPath: item.client_key_path ?? item.clientKeyPath ?? item.ClientKeyPath ?? '',

  topics: item.topics ?? item.Topics ?? '',

  qos: String(item.qos ?? item.Qos ?? 1),

  isActive: item.is_active ?? item.isActive ?? item.IsActive ?? true,

})



const mapMysqlDataToForm = (item: any): MysqlConnectionForm => ({

  id: item.id ?? null,

  name: item.name || 'MySQL Principal',

  host: item.host,

  port: String(item.port),

  user: item.user,

  password: item.password,

  database: item.database,

  poolSize: String(item.pool_size),

  isActive: item.is_active ?? true,

})

const configSectors: Array<{ id: ConfigSector; label: string; description: string }> = [
  { id: 'all', label: 'Todos', description: 'Tudo' },
  { id: 'connections', label: 'Conexões', description: 'OPC, MQTT e banco' },
  { id: 'production', label: 'Produção', description: 'Máquinas, tags e turnos' },
  { id: 'alerts', label: 'Alertas', description: 'Notificações' },
  { id: 'visualization', label: 'Visualização', description: 'Dashboards e BI' },
  { id: 'system', label: 'Sistema', description: 'Logs e administração' },
]

const normalizeConfigSector = (sector: string | null): ConfigSector =>
  configSectors.some((item) => item.id === sector) ? (sector as ConfigSector) : 'all'

const configCardBase = "group min-h-40 rounded-xl border bg-white p-5 text-left shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"

const configCardTone = {
  opc: "border-l-4 border-l-emerald-500 hover:bg-emerald-50/60",
  mqtt: "border-l-4 border-l-indigo-500 hover:bg-indigo-50/60",
  mysql: "border-l-4 border-l-sky-500 hover:bg-sky-50/60",
  connections: "border-l-4 border-l-purple-500 hover:bg-purple-50/60",
  tags: "border-l-4 border-l-amber-500 hover:bg-amber-50/60",
  alerts: "border-l-4 border-l-rose-500 hover:bg-rose-50/60",
  machines: "border-l-4 border-l-slate-500 hover:bg-slate-50/70",
  logs: "border-l-4 border-l-cyan-500 hover:bg-cyan-50/60",
  shifts: "border-l-4 border-l-green-500 hover:bg-green-50/60",
  simulator: "border-l-4 border-l-teal-500 hover:bg-teal-50/60",
  diagnostics: "border-l-4 border-l-blue-500 hover:bg-blue-50/60",
  telegram: "border-l-4 border-l-blue-500 hover:bg-blue-50/60",
  dashboards: "border-l-4 border-l-violet-500 hover:bg-violet-50/60",
  timezone: "border-l-4 border-l-amber-500 hover:bg-amber-50/60",
  users: "border-l-4 border-l-red-500 hover:bg-red-50/60",
  audit: "border-l-4 border-l-slate-700 hover:bg-slate-50/70",
  localServer: "border-l-4 border-l-cyan-600 hover:bg-cyan-50/60",
  weintek: "border-l-4 border-l-red-500 hover:bg-red-50/60",
  updates: "border-l-4 border-l-emerald-600 hover:bg-emerald-50/60",
}

const defaultLocalIp = '192.168.55.147'

const getRuntimeHost = () => {
  if (typeof window === 'undefined') return 'localhost'
  return window.location.hostname || 'localhost'
}

const getCurrentFrontendUrl = () => {
  if (typeof window === 'undefined') return 'http://localhost:3000'
  return window.location.origin
}

const buildLocalServerCommands = (ipAddress: string) => ({
  currentStart: '.\\start-system.ps1',
  fixedStart: `.\\start-system.ps1 -NetworkMode FixedIp -HostIp ${ipAddress}`,
  localFallback: 'http://localhost:3000/config?sector=system',
  networkUrl: `http://${ipAddress}:3000/config?sector=system`,
  firewall: `New-NetFirewallRule -DisplayName "SCADA MES Backend 5000" -Direction Inbound -Protocol TCP -LocalPort 5000 -Action Allow\nNew-NetFirewallRule -DisplayName "SCADA MES Frontend 3000" -Direction Inbound -Protocol TCP -LocalPort 3000 -Action Allow`,
})



export default function ConfigPage() {

  const router = useRouter()
  const searchParams = useSearchParams()

  const { user, token } = useAuth()
  const canManageUsers = user?.role === 'admin' || !!user?.permissions?.includes('users.manage')
  const canViewAudit = user?.role === 'admin' || !!user?.permissions?.includes('audit.view')
  const canOpenSettings = user?.role === 'admin' || canManageUsers || canViewAudit

  const [loading, setLoading] = useState(true)
  usePageReady(!loading)



  // Verifica se o usuário é admin

  useEffect(() => {

    if (user && !canOpenSettings) {

      router.push('/principal')

    }

  }, [user, canOpenSettings, router])



  // Estados das conexões

  const [opcConnections, setOpcConnections] = useState<OpcConnectionForm[]>([])

  const [mqttConnections, setMqttConnections] = useState<MqttConnectionForm[]>([])

  const [mysqlConnections, setMysqlConnections] = useState<MysqlConnectionForm[]>([])
  const [timeZoneId, setTimeZoneId] = useState('America/Sao_Paulo')
  const [timeZoneLabel, setTimeZoneLabel] = useState('Brasil - Brasília (GMT-3)')
  const [timeZoneOptions, setTimeZoneOptions] = useState<TimeZoneOption[]>([])
  const [timeZoneMessage, setTimeZoneMessage] = useState('')
  const [currentClock, setCurrentClock] = useState(new Date())
  const [systemVersion, setSystemVersion] = useState<SystemVersionInfo | null>(null)
  const [versionMessage, setVersionMessage] = useState('')
  const [updateCheck, setUpdateCheck] = useState<UpdateCheckInfo | null>(null)
  const [updateDownload, setUpdateDownload] = useState<UpdateDownloadInfo | null>(null)
  const [checkingUpdates, setCheckingUpdates] = useState(false)
  const [downloadingUpdate, setDownloadingUpdate] = useState(false)
  const [applyingUpdate, setApplyingUpdate] = useState(false)
  const [updateModalOpen, setUpdateModalOpen] = useState(false)
  const [updatePhase, setUpdatePhase] = useState<UpdatePhase>('idle')
  const [updateProgress, setUpdateProgress] = useState(0)
  const [localServerMode, setLocalServerMode] = useState<LocalServerMode>('current')
  const [localServerIp, setLocalServerIp] = useState(defaultLocalIp)
  const [copiedLocalServerBlock, setCopiedLocalServerBlock] = useState('')
  const [localServerMessage, setLocalServerMessage] = useState('')
  const [savingLocalServer, setSavingLocalServer] = useState(false)



  // Estados dos formulários

  const [opcForm, setOpcForm] = useState<OpcConnectionForm>(createEmptyOpcForm())

  const [mqttForm, setMqttForm] = useState<MqttConnectionForm>(createEmptyMqttForm())

  const [mysqlForm, setMysqlForm] = useState<MysqlConnectionForm>(createEmptyMysqlForm())



  // Navegação e UI

  const [activeSection, setActiveSection] = useState<ConnectionSection>('overview')
  const [configSector, setConfigSector] = useState<ConfigSector>(() => normalizeConfigSector(searchParams.get('sector')))
  const showConfigSector = (sector: ConfigSector) => configSector === 'all' || configSector === sector
  const localServerCommands = buildLocalServerCommands(localServerIp)
  const runtimeHost = getRuntimeHost()
  const currentFrontendUrl = getCurrentFrontendUrl()
  const currentBackendUrl = API_BASE_URL
  const canApplyDownloadedUpdate = updatePhase === 'downloaded' && !!updateDownload?.version && updateDownload.version === updateCheck?.latest?.version
  const selectConfigSector = (sector: ConfigSector) => {
    setConfigSector(sector)
    router.replace(sector === 'all' ? '/config' : `/config?sector=${sector}`, { scroll: false })
  }

  const checkForUpdates = async () => {
    setCheckingUpdates(true)
    setUpdatePhase('checking')
    setUpdateProgress(15)
    setVersionMessage('')
    setUpdateDownload(null)
    try {
      const response = await apiFetch(`${API_BASE_URL}/api/system/updates/check`)
      const data = await response.json().catch(() => null)
      if (!response.ok || !data) {
        setVersionMessage('Falha ao verificar atualizações.')
        setUpdatePhase('error')
        return
      }

      setUpdateCheck(data)
      setUpdatePhase(data.update_available ? 'available' : 'complete')
      setUpdateProgress(data.update_available ? 35 : 100)
      setVersionMessage(data.message ?? 'Verificação concluída.')
      return data as UpdateCheckInfo
    } catch {
      setVersionMessage('Falha ao verificar atualizações.')
      setUpdatePhase('error')
    } finally {
      setCheckingUpdates(false)
    }
  }

  const openUpdateModal = async () => {
    setUpdateModalOpen(true)
    if (!updateCheck && !checkingUpdates) {
      await checkForUpdates()
    }
  }

  const downloadUpdate = async () => {
    setDownloadingUpdate(true)
    setUpdatePhase('downloading')
    setUpdateProgress(50)
    setVersionMessage('')
    setUpdateDownload(null)
    try {
      const response = await apiFetch(`${API_BASE_URL}/api/system/updates/download`, { method: 'POST' })
      const data = await response.json().catch(() => null)
      if (!response.ok || !data) {
        setVersionMessage(data?.message ?? 'Falha ao baixar atualização.')
        setUpdatePhase('error')
        return
      }

      setUpdateDownload(data)
      setUpdatePhase('downloaded')
      setUpdateProgress(70)
      setVersionMessage(data.message ?? 'Pacote baixado e validado.')
    } catch {
      setVersionMessage('Falha ao baixar atualização.')
      setUpdatePhase('error')
    } finally {
      setDownloadingUpdate(false)
    }
  }

  const waitForUpdatedRuntime = async (expectedVersion: string) => {
    const deadline = Date.now() + 180000
    setUpdatePhase('restarting')
    setUpdateProgress(85)

    while (Date.now() < deadline) {
      try {
        const health = await fetch(`${API_BASE_URL}/api/system/health`, { cache: 'no-store' })
        if (health.ok) {
          const versionResponse = await fetch(`${API_BASE_URL}/api/system/version`, { cache: 'no-store' })
          const versionData = await versionResponse.json().catch(() => null)
          if (versionData?.version === expectedVersion) {
            setSystemVersion(versionData)
            setUpdatePhase('complete')
            setUpdateProgress(100)
            setVersionMessage(`Atualização ${expectedVersion} concluída. Faça login novamente se a sessão expirar.`)
            return
          }
        }
      } catch {
        // Runtime can be temporarily unavailable while Windows services restart.
      }

      await new Promise((resolve) => window.setTimeout(resolve, 4000))
    }

    setUpdatePhase('error')
    setVersionMessage('A atualização foi iniciada, mas o sistema não confirmou retorno dentro do tempo esperado. Verifique os logs do Runtime.')
  }

  const applyUpdate = async () => {
    if (!updateDownload?.version) return

    setApplyingUpdate(true)
    setUpdatePhase('applying')
    setUpdateProgress(80)
    setVersionMessage('')
    try {
      const response = await apiFetch(`${API_BASE_URL}/api/system/updates/apply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ version: updateDownload.version }),
      })
      const data = await response.json().catch(() => null)
      if (!response.ok || !data) {
        setVersionMessage(data?.message ?? 'Falha ao iniciar atualização.')
        setUpdatePhase('error')
        return
      }

      setVersionMessage(data.message ?? 'Atualização iniciada.')
      await waitForUpdatedRuntime(updateDownload.version)
    } catch {
      setVersionMessage('Falha ao iniciar atualização.')
      setUpdatePhase('error')
    } finally {
      setApplyingUpdate(false)
    }
  }

  useEffect(() => {
    setConfigSector(normalizeConfigSector(searchParams.get('sector')))
  }, [searchParams])

  useEffect(() => {
    const interval = setInterval(() => setCurrentClock(new Date()), 1000)
    return () => clearInterval(interval)
  }, [])



  // Dispara loadConfigs quando token existe

  useEffect(() => {

    if (!token || !user) return

    if (user.role !== 'admin') {
      setLoading(false)
      return
    }

    console.log("TOKEN OK â†’ carregando configs")

    loadConfigs()

  }, [token, user])



  async function loadConfigs() {

    try {

      const headers = {
      }



      // Busca todas as configurações

      const [opcRes, mqttRes, mysqlRes, timeZoneRes, localServerRes, versionRes] = await Promise.all([

        apiFetch(`${API_BASE_URL}/api/config/opcua/all`, { headers }),

        apiFetch(`${API_BASE_URL}/api/config/mqtt/all`, { headers }),

        apiFetch(`${API_BASE_URL}/api/config/mysql/all`, { headers }),
        apiFetch(`${API_BASE_URL}/api/config/system/timezone`, { headers }),
        apiFetch(`${API_BASE_URL}/api/config/system/local-server`, { headers }),
        apiFetch(`${API_BASE_URL}/api/system/version`, { headers }),

      ])



      const opcData = opcRes.ok ? await opcRes.json() : []

      const mqttData = mqttRes.ok ? await mqttRes.json() : []

      const mysqlData = mysqlRes.ok ? await mysqlRes.json() : []
      const timeZoneData = timeZoneRes.ok ? await timeZoneRes.json() : null
      const localServerData = localServerRes.ok ? await localServerRes.json() : null
      const versionData = versionRes.ok ? await versionRes.json() : null



      console.log("DATA LOADED:", { opcData, mqttData, mysqlData })

      if (timeZoneData) {
        setTimeZoneId(timeZoneData.timeZoneId ?? 'America/Sao_Paulo')
        setTimeZoneLabel(timeZoneData.label ?? timeZoneData.timeZoneId ?? 'Brasil - Brasília (GMT-3)')
        setTimeZoneOptions(timeZoneData.options ?? [])
      }

      if (localServerData) {
        setLocalServerMode(localServerData.mode === 'fixed-ip' ? 'fixed-ip' : 'current')
        setLocalServerIp(localServerData.hostIp ?? defaultLocalIp)
      }

      if (versionData) {
        setSystemVersion(versionData)
      }



      setOpcConnections(opcData.map((item: any) => ({

        id: item.id ?? null,

        name: item.name,

        serverUrl: item.server_url,

        securityPolicy: item.security_policy,

        securityMode: item.security_mode,

        username: item.username,

        password: item.password,

        certificatePath: item.certificate_path,

        privateKeyPath: item.private_key_path,

        updateInterval: String(item.update_interval),

        isActive: item.is_active,

      })))



      setMqttConnections(mqttData.map(mapMqttDataToForm))



      setMysqlConnections(mysqlData.map((item: any) => ({

        id: item.id ?? null,

        name: item.name || 'MySQL Principal',

        host: item.host,

        port: String(item.port),

        user: item.user,

        password: item.password,

        database: item.database,

        poolSize: String(item.pool_size),

        isActive: item.is_active ?? true,

      })))



      // Seleciona primeiro formulário se houver dados (usa os dados da API, não do state)

      if (opcData.length > 0) setOpcForm(mapOpcDataToForm(opcData[0]))

      if (mqttData.length > 0) setMqttForm(mapMqttDataToForm(mqttData[0]))

      if (mysqlData.length > 0) setMysqlForm(mapMysqlDataToForm(mysqlData[0]))



    } catch (err) {

      console.error(err)

    } finally {

      setLoading(false)

    }

  }



  const handleNewConnection = () => {

    if (activeSection === 'opcua') setOpcForm(createEmptyOpcForm())

    if (activeSection === 'mqtt') setMqttForm(createEmptyMqttForm())

    if (activeSection === 'mysql') setMysqlForm(createEmptyMysqlForm())

  }



  const handleEditConnection = (section: Exclude<ConnectionSection, 'overview' | 'saved'>) => {

    setActiveSection(section)

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

  async function copyLocalServerText(label: string, value: string) {
    if (typeof navigator === 'undefined' || !navigator.clipboard) return
    await navigator.clipboard.writeText(value)
    setCopiedLocalServerBlock(label)
    window.setTimeout(() => setCopiedLocalServerBlock(''), 1800)
  }

  async function saveLocalServerConfig(redirectAfterSave = false) {
    setLocalServerMessage('')
    const trimmedIp = localServerIp.trim()

    if (localServerMode === 'fixed-ip' && !/^(?:\d{1,3}\.){3}\d{1,3}$/.test(trimmedIp)) {
      setLocalServerMessage('Informe um IP valido, por exemplo 192.168.55.147.')
      return
    }

    setSavingLocalServer(true)
    try {
      const response = await apiFetch(`${API_BASE_URL}/api/config/system/local-server`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: localServerMode,
          hostIp: trimmedIp || defaultLocalIp,
          backendPort: 5000,
          frontendPort: 3000,
        }),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        setLocalServerMessage(data.message ?? 'Erro ao salvar configuração de rede.')
        return
      }

      setLocalServerIp(data.hostIp ?? trimmedIp)
      setLocalServerMessage(
        localServerMode === 'fixed-ip'
          ? 'Configuração salva. Se o sistema foi iniciado em modo de rede, voce ja pode acessar pelo IP.'
          : 'Configuração local salva. O acesso por localhost continua ativo.'
      )

      if (redirectAfterSave && localServerMode === 'fixed-ip' && typeof window !== 'undefined') {
        window.location.href = `http://${data.hostIp ?? trimmedIp}:3000/config?sector=system`
      }
    } finally {
      setSavingLocalServer(false)
    }
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

          <button

            onClick={() => router.back()}

            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"

          >

            <ArrowLeft className="h-5 w-5 text-gray-600" />

          </button>

          <div>

            <h1 className="text-3xl font-bold text-gray-900">Central de Configurações</h1>

            <p className="text-gray-600 mt-1">Gerenciamento de conexões e configurações do sistema</p>

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


        {/* Cards de Configuração */}

        <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-4 gap-4">

          {/* OPC UA */}

          <a

            href="/opc-browser"

            className={`${showConfigSector('connections') ? '' : 'hidden'} ${configCardBase} ${configCardTone.opc}`}

          >

            <div className="text-center">

              <Server className="h-12 w-12 mx-auto mb-2 text-green-600" />

              <h3 className="text-lg font-bold text-gray-900 mb-2">OPC UA</h3>

              <p className="text-sm text-gray-500 mb-3">Navegação de nós OPC UA</p>

              <div className="text-xl font-bold text-gray-900">{opcConnections.length}</div>

              <div className="text-xs text-gray-500">conexões</div>

            </div>

          </a>



          {/* MQTT */}

          <a

            href="/mqtt-monitor"

            className={`${showConfigSector('connections') ? '' : 'hidden'} ${configCardBase} ${configCardTone.mqtt}`}

          >

            <div className="text-center">

              <Wifi className="h-12 w-12 mx-auto mb-2 text-purple-600" />

              <h3 className="text-lg font-bold text-gray-900 mb-2">MQTT</h3>

              <p className="text-sm text-gray-500 mb-3">Comunicação MQTT/TLS</p>

              <div className="text-xl font-bold text-gray-900">{mqttConnections.length}</div>

              <div className="text-xs text-gray-500">conexões</div>

            </div>

          </a>



          {/* Banco de Dados */}

          <a

            href="/database-browser"

            className={`${showConfigSector('connections') ? '' : 'hidden'} ${configCardBase} ${configCardTone.mysql}`}

          >

            <div className="text-center">

              <Database className="h-12 w-12 mx-auto mb-2 text-blue-600" />

              <h3 className="text-lg font-bold text-gray-900 mb-2">Banco de Dados</h3>

              <p className="text-sm text-gray-500 mb-3">Conexões MySQL e SQL Server</p>

              <div className="text-xl font-bold text-gray-900">{mysqlConnections.length}</div>

              <div className="text-xs text-gray-500">conexões</div>

            </div>

          </a>



          {/* Conexões Salvas */}

          <a

            href="/connections"

            className={`${showConfigSector('connections') ? '' : 'hidden'} ${configCardBase} ${configCardTone.connections}`}

          >

            <div className="text-center">

              <Plug className="h-12 w-12 mx-auto mb-2 text-red-600" />

              <h3 className="text-lg font-bold text-gray-900 mb-2">Conexões</h3>

              <p className="text-sm text-gray-500 mb-3">Todas as conexões salvas</p>

              <div className="text-xl font-bold text-gray-900">{opcConnections.length + mqttConnections.length + mysqlConnections.length}</div>

              <div className="text-xs text-gray-500">total</div>

            </div>

          </a>



          {/* TAGs */}

          <a

            href="/tags"

            className={`${showConfigSector('production') ? '' : 'hidden'} ${configCardBase} ${configCardTone.tags}`}

          >

            <div className="text-center">

              <Tags className="h-12 w-12 mx-auto mb-2 text-orange-600" />

              <h3 className="text-lg font-bold text-gray-900 mb-2">TAGs</h3>

              <p className="text-sm text-gray-500 mb-3">Gestão de TAGs do sistema</p>

              <div className="text-xs text-gray-500">TAGs</div>

            </div>

          </a>

          <a
            href="/weintek-browser"
            className={`${showConfigSector('connections') ? '' : 'hidden'} ${configCardBase} ${configCardTone.weintek}`}
          >
            <div className="text-center">
              <Network className="h-12 w-12 mx-auto mb-2 text-red-600" />
              <h3 className="text-lg font-bold text-gray-900 mb-2">Weintek HTTP</h3>
              <p className="text-sm text-gray-500 mb-3">Gateway FHDX/cMT e browser de tags</p>

            </div>
          </a>

          <a
            href="/alerts"
            className={`${showConfigSector('alerts') ? '' : 'hidden'} ${configCardBase} ${configCardTone.alerts}`}
          >
            <div className="text-center">
              <Bell className="h-12 w-12 mx-auto mb-2 text-red-600" />
              <h3 className="text-lg font-bold text-gray-900 mb-2">Alertas</h3>
              <p className="text-sm text-gray-500 mb-3">Regras e reconhecimento</p>
              <div className="text-xs text-gray-500">alertas</div>
            </div>
          </a>



          {/* Máquinas */}

          <button

            onClick={() => router.push('/machines')}

            className={`${showConfigSector('production') ? '' : 'hidden'} ${configCardBase} ${configCardTone.machines}`}

          >

            <div className="text-center">

              <Factory className="h-12 w-12 mx-auto mb-2 text-gray-600" />

              <h3 className="text-lg font-bold text-gray-900 mb-2">Máquinas</h3>

              <p className="text-sm text-gray-500 mb-3">Gestão de máquinas do sistema</p>

              <div className="text-xs text-gray-500">Máquinas</div>

            </div>

          </button>

          {/* Logs */}
          <button
            onClick={() => router.push('/logs')}
            className={`${showConfigSector('system') ? '' : 'hidden'} ${configCardBase} ${configCardTone.logs}`}
          >
            <div className="text-center">
              <TerminalSquare className="h-12 w-12 mx-auto mb-2 text-slate-600" />
              <h3 className="text-lg font-bold text-gray-900 mb-2">Logs</h3>
              <p className="text-sm text-gray-500 mb-3">Console técnico do sistema</p>
              <div className="text-xs text-gray-500">console</div>
            </div>
          </button>

          {/* Servidor local */}
          <button
            type="button"
            onClick={() => router.push('/local-server')}
            className={`${showConfigSector('system') ? '' : 'hidden'} ${configCardBase} ${configCardTone.localServer}`}
          >
            <div className="text-center">
              <Network className="h-12 w-12 mx-auto mb-2 text-cyan-700" />
              <h3 className="text-lg font-bold text-gray-900 mb-2">Servidor local</h3>
              <p className="text-sm text-gray-500 mb-3">Acesso por localhost ou IP fixo</p>
              <div className="text-xs text-gray-500">rede local</div>
            </div>
          </button>

          {/* Usuários */}
          {canManageUsers && (
            <button
              onClick={() => router.push('/users')}
              className={`${showConfigSector('system') ? '' : 'hidden'} ${configCardBase} ${configCardTone.users}`}
            >
              <div className="text-center">
                <Users className="h-12 w-12 mx-auto mb-2 text-red-600" />
                <h3 className="text-lg font-bold text-gray-900 mb-2">Usuários</h3>
                <p className="text-sm text-gray-500 mb-3">Contas, perfis e permissões</p>
                <div className="text-xs text-gray-500">administração</div>
              </div>
            </button>
          )}

          {/* Auditoria */}
          {canViewAudit && (
            <button
              onClick={() => router.push('/audit')}
              className={`${showConfigSector('system') ? '' : 'hidden'} ${configCardBase} ${configCardTone.audit}`}
            >
              <div className="text-center">
                <ShieldCheck className="h-12 w-12 mx-auto mb-2 text-slate-700" />
                <h3 className="text-lg font-bold text-gray-900 mb-2">Auditoria</h3>
                <p className="text-sm text-gray-500 mb-3">Eventos administrativos recentes</p>
                <div className="text-xs text-gray-500">segurança</div>
              </div>
            </button>
          )}

          {/* Turnos */}
          <button
            onClick={() => router.push('/shifts')}
            className={`${showConfigSector('production') ? '' : 'hidden'} ${configCardBase} ${configCardTone.shifts}`}
          >
            <div className="text-center">
              <Clock3 className="h-12 w-12 mx-auto mb-2 text-emerald-600" />
              <h3 className="text-lg font-bold text-gray-900 mb-2">Turnos</h3>
              <p className="text-sm text-gray-500 mb-3">Janelas operacionais da fábrica</p>
              <div className="text-xs text-gray-500">turnos</div>
            </div>
          </button>

          {/* Simulador */}
          <button
            onClick={() => router.push('/simulator')}
            className={`${showConfigSector('production') ? '' : 'hidden'} ${configCardBase} ${configCardTone.simulator}`}
          >
            <div className="text-center">
              <FlaskConical className="h-12 w-12 mx-auto mb-2 text-cyan-600" />
              <h3 className="text-lg font-bold text-gray-900 mb-2">Simulador</h3>
              <p className="text-sm text-gray-500 mb-3">Console de máquina virtual</p>
              <div className="text-xs text-gray-500">bancada</div>
            </div>
          </button>

          {/* Diagnóstico */}
          <button
            onClick={() => router.push('/production-diagnostics')}
            className={`${showConfigSector('production') ? '' : 'hidden'} ${configCardBase} ${configCardTone.diagnostics}`}
          >
            <div className="text-center">
              <TestTube2 className="h-12 w-12 mx-auto mb-2 text-blue-700" />
              <h3 className="text-lg font-bold text-gray-900 mb-2">Diagnóstico</h3>
              <p className="text-sm text-gray-500 mb-3">Fluxo real de produção</p>
              <div className="text-xs text-gray-500">produção</div>
            </div>
          </button>

          {/* Telegram */}
          <button
            onClick={() => router.push('/telegram-notifications')}
            className={`${showConfigSector('alerts') ? '' : 'hidden'} ${configCardBase} ${configCardTone.telegram}`}
          >
            <div className="text-center">
              <Send className="h-12 w-12 mx-auto mb-2 text-blue-700" />
              <h3 className="text-lg font-bold text-gray-900 mb-2">Telegram</h3>
              <p className="text-sm text-gray-500 mb-3">Bot, chat_id e destinatários</p>
              <div className="text-xs text-gray-500">notificações</div>
            </div>
          </button>

          {/* Dashboards */}
          <button
            onClick={() => router.push('/dashboards')}
            className={`${showConfigSector('visualization') ? '' : 'hidden'} ${configCardBase} ${configCardTone.dashboards}`}
          >
            <div className="text-center">
              <LayoutDashboard className="h-12 w-12 mx-auto mb-2 text-red-700" />
              <h3 className="text-lg font-bold text-gray-900 mb-2">Dashboards</h3>
              <p className="text-sm text-gray-500 mb-3">Layouts de gráficos por máquina</p>
              <div className="text-xs text-gray-500">tela cheia</div>
            </div>
          </button>

          {/* Fuso horário */}
          <div className={`${showConfigSector('system') ? '' : 'hidden'} ${configCardBase} ${configCardTone.timezone}`}>
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

          {/* Atualizações */}
          <div className={`${showConfigSector('system') ? '' : 'hidden'} ${configCardBase} ${configCardTone.updates}`}>
            <button
              type="button"
              onClick={openUpdateModal}
              className="flex h-full w-full flex-col items-start text-left"
            >
              <div className="flex w-full items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
                    <DownloadCloud className="h-7 w-7" />
                  </span>
                  <div className="min-w-0">
                    <h3 className="text-lg font-bold text-gray-900">Atualizações</h3>
                    <p className="mt-1 text-sm text-gray-500">Gerenciar versão instalada</p>
                  </div>
                </div>
                {updateCheck?.update_available && (
                  <span className="flex h-3 w-3 rounded-full bg-blue-600 shadow-[0_0_0_4px_rgba(37,99,235,0.16)]" />
                )}
              </div>
              <div className="mt-5 flex w-full items-center justify-between gap-3">
                <span className="text-sm text-gray-500">Instalada</span>
                <span className="rounded-lg bg-slate-100 px-3 py-1 text-sm font-bold text-gray-900">{systemVersion?.version ?? '-'}</span>
              </div>
              {updateCheck?.latest?.version && (
                <div className="mt-3 flex w-full items-center justify-between gap-3">
                  <span className="text-sm text-gray-500">Remota</span>
                  <span className={`rounded-lg px-3 py-1 text-sm font-bold ${
                    updateCheck.update_available ? 'bg-blue-100 text-blue-800' : 'bg-emerald-100 text-emerald-800'
                  }`}>
                    {updateCheck.latest.version}
                  </span>
                </div>
              )}
              <span className="mt-auto pt-5 text-sm font-semibold text-emerald-800">
                Abrir detalhes
              </span>
            </button>
          </div>

        </div>

        {updateModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 px-4 py-6">
            <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-white shadow-2xl">
              <div className="flex items-start justify-between gap-4 border-b border-gray-200 px-6 py-5">
                <div className="flex items-start gap-3">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
                    <DownloadCloud className="h-6 w-6" />
                  </span>
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">Atualização do AnalictY</h2>
                    <p className="mt-1 text-sm text-gray-500">Verificação, download validado e aplicação controlada.</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setUpdateModalOpen(false)}
                  disabled={applyingUpdate}
                  className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
                  aria-label="Fechar"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-5 px-6 py-5">
                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="rounded-lg border border-gray-200 p-4">
                    <p className="text-xs font-semibold uppercase text-gray-500">Instalada</p>
                    <p className="mt-1 text-lg font-bold text-gray-900">{systemVersion?.version ?? '-'}</p>
                    <p className="text-xs text-gray-500">{systemVersion?.channel ?? 'dev'} · {systemVersion?.source ?? '-'}</p>
                  </div>
                  <div className="rounded-lg border border-gray-200 p-4">
                    <p className="text-xs font-semibold uppercase text-gray-500">Disponível</p>
                    <p className="mt-1 text-lg font-bold text-gray-900">{updateCheck?.latest?.version ?? '-'}</p>
                    <p className="text-xs text-gray-500">{updateCheck?.latest?.channel ?? systemVersion?.channel ?? 'stable'}</p>
                  </div>
                  <div className="rounded-lg border border-gray-200 p-4">
                    <p className="text-xs font-semibold uppercase text-gray-500">Estado</p>
                    <p className="mt-1 text-lg font-bold text-gray-900">
                      {updateCheck?.update_available ? 'Nova versão' : updateCheck ? 'Atualizado' : 'Não verificado'}
                    </p>
                    <p className="text-xs text-gray-500">{updateDownload?.version ? 'Pacote validado' : 'Aguardando ação'}</p>
                  </div>
                </div>

                <div>
                  <div className="mb-2 flex items-center justify-between text-xs font-semibold uppercase text-gray-500">
                    <span>Progresso</span>
                    <span>{updateProgress}%</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-gray-100">
                    <div
                      className="h-full rounded-full bg-emerald-600 transition-all duration-500"
                      style={{ width: `${updateProgress}%` }}
                    />
                  </div>
                  <div className="mt-4 grid gap-2 sm:grid-cols-4">
                    {[
                      ['checking', 'Verificar', RefreshCw],
                      ['downloading', 'Baixar', PackageCheck],
                      ['applying', 'Aplicar', Rocket],
                      ['complete', 'Concluir', CheckCircle2],
                    ].map(([phase, label, Icon]) => {
                      const active = updatePhase === phase || (phase === 'downloading' && updatePhase === 'downloaded') || (phase === 'applying' && updatePhase === 'restarting')
                      const done =
                        (phase === 'checking' && updateProgress >= 35) ||
                        (phase === 'downloading' && updateProgress >= 70) ||
                        (phase === 'applying' && updateProgress >= 85) ||
                        (phase === 'complete' && updateProgress >= 100)
                      return (
                        <div key={String(phase)} className={`rounded-lg border px-3 py-2 text-sm ${
                          done ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : active ? 'border-blue-200 bg-blue-50 text-blue-800' : 'border-gray-200 text-gray-500'
                        }`}>
                          <div className="flex items-center gap-2">
                            <Icon className={`h-4 w-4 ${active && (checkingUpdates || downloadingUpdate || applyingUpdate) ? 'animate-spin' : ''}`} />
                            <span className="font-semibold">{String(label)}</span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>

                {updateCheck?.latest?.changelog && updateCheck.latest.changelog.length > 0 && (
                  <div className="rounded-lg border border-gray-200 p-4">
                    <h3 className="font-bold text-gray-900">Novidades</h3>
                    <ul className="mt-3 space-y-2 text-sm text-gray-700">
                      {updateCheck.latest.changelog.map((item, index) => (
                        <li key={`${item}-${index}`} className="flex gap-2">
                          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {systemVersion?.data_directory && (
                  <div className="rounded-lg bg-slate-50 px-4 py-3">
                    <p className="text-xs font-semibold uppercase text-slate-500">Pasta de dados preservada</p>
                    <p className="mt-1 break-all font-mono text-xs text-slate-700">{systemVersion.data_directory}</p>
                  </div>
                )}

                {updatePhase === 'error' && (
                  <div className="flex gap-3 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
                    <AlertTriangle className="h-5 w-5 shrink-0" />
                    <p>{versionMessage || 'Falha no processo de atualização.'}</p>
                  </div>
                )}

                {updatePhase !== 'error' && versionMessage && (
                  <p className="rounded-lg bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-900">{versionMessage}</p>
                )}
              </div>

              <div className="flex flex-col gap-2 border-t border-gray-200 px-6 py-5 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={checkForUpdates}
                  disabled={checkingUpdates || downloadingUpdate || applyingUpdate}
                  className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-800 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <RefreshCw className={`h-4 w-4 ${checkingUpdates ? 'animate-spin' : ''}`} />
                  {checkingUpdates ? 'Verificando' : 'Verificar'}
                </button>
                <button
                  type="button"
                  onClick={downloadUpdate}
                  disabled={!updateCheck?.update_available || downloadingUpdate || applyingUpdate}
                  className="inline-flex items-center justify-center gap-2 rounded-lg border border-emerald-700 bg-white px-4 py-2 text-sm font-semibold text-emerald-800 hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <PackageCheck className="h-4 w-4" />
                  {downloadingUpdate ? 'Baixando' : 'Baixar e validar'}
                </button>
                <button
                  type="button"
                  onClick={applyUpdate}
                  disabled={!canApplyDownloadedUpdate || downloadingUpdate || applyingUpdate}
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Rocket className="h-4 w-4" />
                  {applyingUpdate ? 'Aplicando' : 'Aplicar atualização'}
                </button>
              </div>
            </div>
          </div>
        )}


        {/* Seção Ativa */}

        {activeSection === 'opcua' && (

          <div className="bg-white rounded-2xl border-l-4 border-green-500 border border-gray-200 p-6 shadow-sm">

            <div className="flex items-center gap-3 mb-6">

              <Server className="h-8 w-8 text-green-600" />

              <div>

                <h2 className="text-xl font-bold text-gray-900">Configuração OPC UA</h2>

                <p className="text-sm text-gray-500">Configure servidores OPC UA para coleta de dados industriais</p>

              </div>

            </div>

            <div className="space-y-4">
              <label className="block space-y-2">
                <span className="text-sm font-medium text-gray-600">Nome</span>
                <input
                  type="text"
                  value={opcForm.name}
                  onChange={(e) => setOpcForm({ ...opcForm, name: e.target.value })}
                  className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-gray-900 shadow-sm focus:border-red-500 focus:outline-none"
                />
              </label>

              <label className="block space-y-2">
                <span className="text-sm font-medium text-gray-600">Server URL</span>
                <input
                  type="text"
                  value={opcForm.serverUrl}
                  onChange={(e) => setOpcForm({ ...opcForm, serverUrl: e.target.value })}
                  className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-gray-900 shadow-sm focus:border-red-500 focus:outline-none"
                />
              </label>

              <div className="grid gap-4 md:grid-cols-2">
                <label className="block space-y-2">
                  <span className="text-sm font-medium text-gray-600">Security Policy</span>
                  <select
                    value={opcForm.securityPolicy}
                    onChange={(e) => setOpcForm({ ...opcForm, securityPolicy: e.target.value })}
                    className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-gray-900 shadow-sm focus:border-red-500 focus:outline-none"
                  >
                    <option value="None">None</option>
                    <option value="Basic128">Basic128</option>
                    <option value="Basic128Rsa15">Basic128Rsa15</option>
                    <option value="Basic256">Basic256</option>
                    <option value="Basic256Sha256">Basic256Sha256</option>
                  </select>
                </label>

                <label className="block space-y-2">
                  <span className="text-sm font-medium text-gray-600">Security Mode</span>
                  <select
                    value={opcForm.securityMode}
                    onChange={(e) => setOpcForm({ ...opcForm, securityMode: e.target.value })}
                    className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-gray-900 shadow-sm focus:border-red-500 focus:outline-none"
                  >
                    <option value="None">None</option>
                    <option value="Sign">Sign</option>
                    <option value="SignAndEncrypt">SignAndEncrypt</option>
                  </select>
                </label>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <label className="block space-y-2">
                  <span className="text-sm font-medium text-gray-600">Usuário (opcional)</span>
                  <input
                    type="text"
                    value={opcForm.username}
                    onChange={(e) => setOpcForm({ ...opcForm, username: e.target.value })}
                    className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-gray-900 shadow-sm focus:border-red-500 focus:outline-none"
                  />
                </label>

                <label className="block space-y-2">
                  <span className="text-sm font-medium text-gray-600">Senha (opcional)</span>
                  <input
                    type="password"
                    value={opcForm.password}
                    onChange={(e) => setOpcForm({ ...opcForm, password: e.target.value })}
                    className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-gray-900 shadow-sm focus:border-red-500 focus:outline-none"
                  />
                </label>
              </div>

              <label className="block space-y-2">
                <span className="text-sm font-medium text-gray-600">Intervalo de atualização (ms)</span>
                <input
                  type="number"
                  value={opcForm.updateInterval}
                  onChange={(e) => setOpcForm({ ...opcForm, updateInterval: e.target.value })}
                  className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-gray-900 shadow-sm focus:border-red-500 focus:outline-none"
                />
              </label>

              <label className="flex items-center gap-3 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
                <input
                  type="checkbox"
                  checked={opcForm.isActive}
                  onChange={(e) => setOpcForm({ ...opcForm, isActive: e.target.checked })}
                  className="h-4 w-4 rounded border-gray-300 text-red-600 focus:ring-red-500"
                />
                <span className="text-sm font-medium text-gray-700">Conexão ativa</span>
              </label>

              <div className="flex gap-3">
                <button
                  onClick={() => handleNewConnection()}
                  className="flex-1 px-4 py-3 bg-gray-200 hover:bg-gray-300 text-gray-900 rounded-xl font-semibold transition-colors"
                >
                  Limpar
                </button>
                <button
                  onClick={async () => {
                    const headers = {}
                    const body = {
                      name: opcForm.name,
                      server_url: opcForm.serverUrl,
                      security_policy: opcForm.securityPolicy,
                      security_mode: opcForm.securityMode,
                      username: opcForm.username,
                      password: opcForm.password,
                      certificate_path: opcForm.certificatePath,
                      private_key_path: opcForm.privateKeyPath,
                      update_interval: parseInt(opcForm.updateInterval),
                      is_active: opcForm.isActive,
                    }
                    const res = await apiFetch(`${API_BASE_URL}/api/config/opcua`, {
                      method: 'PUT',
                      headers: { ...headers, 'Content-Type': 'application/json' },
                      body: JSON.stringify(body),
                    })
                    if (res.ok) {
                      alert('Configuração OPC UA salva com sucesso!')
                      loadConfigs()
                    } else {
                      alert('Erro ao salvar configuração OPC UA')
                    }
                  }}
                  className="flex-1 px-4 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-semibold transition-colors"
                >
                  Salvar
                </button>
              </div>
            </div>
          </div>
        )}



        {activeSection === 'mqtt' && (

          <div className="bg-white rounded-2xl border-l-4 border-purple-500 border border-gray-200 p-6 shadow-sm">

            <div className="flex items-center gap-3 mb-6">

              <Wifi className="h-8 w-8 text-purple-600" />

              <div>

                <h2 className="text-xl font-bold text-gray-900">Configuração MQTT com TLS</h2>

                <p className="text-sm text-gray-500">Configure brokers MQTT com certificados TLS seguros</p>

              </div>

            </div>

            <div className="space-y-4">

              <label className="block space-y-2">

                <span className="text-sm font-medium text-gray-600">Nome</span>

                <input type="text" value={mqttForm.name} onChange={(e) => setMqttForm({ ...mqttForm, name: e.target.value })} className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-gray-900 shadow-sm focus:border-red-500 focus:outline-none" />

              </label>

              <label className="block space-y-2">

                <span className="text-sm font-medium text-gray-600">Broker Host</span>

                <input type="text" value={mqttForm.brokerHost} onChange={(e) => setMqttForm({ ...mqttForm, brokerHost: e.target.value })} className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-gray-900 shadow-sm focus:border-red-500 focus:outline-none" />

              </label>

              <label className="block space-y-2">

                <span className="text-sm font-medium text-gray-600">Client ID</span>

                <input type="text" value={mqttForm.clientId} onChange={(e) => setMqttForm({ ...mqttForm, clientId: e.target.value })} className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-gray-900 shadow-sm focus:border-red-500 focus:outline-none" />

              </label>

              <label className="block space-y-2">

                <span className="text-sm font-medium text-gray-600">Porta</span>

                <input type="number" value={mqttForm.brokerPort} onChange={(e) => setMqttForm({ ...mqttForm, brokerPort: e.target.value })} className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-gray-900 shadow-sm focus:border-red-500 focus:outline-none" />

              </label>

              <div className="grid gap-4 md:grid-cols-2">

                <label className="block space-y-2">

                  <span className="text-sm font-medium text-gray-600">Usuário</span>

                  <input type="text" value={mqttForm.username} onChange={(e) => setMqttForm({ ...mqttForm, username: e.target.value })} className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-gray-900 shadow-sm focus:border-red-500 focus:outline-none" />

                </label>

                <label className="block space-y-2">

                  <span className="text-sm font-medium text-gray-600">Senha</span>

                  <input type="password" value={mqttForm.password} onChange={(e) => setMqttForm({ ...mqttForm, password: e.target.value })} className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-gray-900 shadow-sm focus:border-red-500 focus:outline-none" />

                </label>

              </div>

              <label className="flex items-center gap-3 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">

                <input type="checkbox" checked={mqttForm.tlsEnabled} onChange={(e) => setMqttForm({ ...mqttForm, tlsEnabled: e.target.checked })} className="h-4 w-4 rounded border-gray-300 text-red-600 focus:ring-red-500" />

                <span className="text-sm font-medium text-gray-700">Usar TLS/SSL</span>

              </label>

              <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 space-y-4">

                <div>

                  <h3 className="text-sm font-bold text-gray-900">Certificados TLS opcionais</h3>

                  <p className="text-xs text-gray-500">Use caminhos absolutos do Windows ou caminhos relativos ao projeto.</p>

                </div>

                <label className="block space-y-2">

                  <span className="text-sm font-medium text-gray-600">CA / Root CA (.pem, .ca, .crt)</span>

                  <input type="text" value={mqttForm.caCertPath} onChange={(e) => setMqttForm({ ...mqttForm, caCertPath: e.target.value })} placeholder="C:\\Users\\...\\AmazonRootCA1.pem" className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-gray-900 shadow-sm focus:border-red-500 focus:outline-none" />

                </label>

                <label className="block space-y-2">

                  <span className="text-sm font-medium text-gray-600">Certificado cliente (.pem, .crt)</span>

                  <input type="text" value={mqttForm.clientCertPath} onChange={(e) => setMqttForm({ ...mqttForm, clientCertPath: e.target.value })} placeholder="C:\\Users\\...\\certificate.pem.crt" className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-gray-900 shadow-sm focus:border-red-500 focus:outline-none" />

                </label>

                <label className="block space-y-2">

                  <span className="text-sm font-medium text-gray-600">Chave privada cliente (.key, .pem)</span>

                  <input type="text" value={mqttForm.clientKeyPath} onChange={(e) => setMqttForm({ ...mqttForm, clientKeyPath: e.target.value })} placeholder="C:\\Users\\...\\private.pem.key" className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-gray-900 shadow-sm focus:border-red-500 focus:outline-none" />

                </label>

              </div>

              <label className="block space-y-2">

                <span className="text-sm font-medium text-gray-600">Tópicos</span>

                <textarea value={mqttForm.topics} onChange={(e) => setMqttForm({ ...mqttForm, topics: e.target.value })} rows={3} placeholder="ex: mes/production/+, scada/#" className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-gray-900 shadow-sm focus:border-red-500 focus:outline-none" />

              </label>

              <div className="grid gap-4 md:grid-cols-2">

                <label className="block space-y-2">

                  <span className="text-sm font-medium text-gray-600">QoS</span>

                  <select value={mqttForm.qos} onChange={(e) => setMqttForm({ ...mqttForm, qos: e.target.value })} className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-gray-900 shadow-sm focus:border-red-500 focus:outline-none">

                    <option value="0">0</option>

                    <option value="1">1</option>

                    <option value="2">2</option>

                  </select>

                </label>

                <label className="flex items-center gap-3 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 mt-7">

                  <input type="checkbox" checked={mqttForm.isActive} onChange={(e) => setMqttForm({ ...mqttForm, isActive: e.target.checked })} className="h-4 w-4 rounded border-gray-300 text-red-600 focus:ring-red-500" />

                  <span className="text-sm font-medium text-gray-700">Conexão ativa</span>

                </label>

              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => handleNewConnection()}
                  className="flex-1 px-4 py-3 bg-gray-200 hover:bg-gray-300 text-gray-900 rounded-xl font-semibold transition-colors"
                >
                  Limpar
                </button>
                <button
                  onClick={async () => {
                    const headers = {}
                    const body = {
                      id: mqttForm.id,
                      name: mqttForm.name,
                      client_id: mqttForm.clientId,
                      broker_host: mqttForm.brokerHost,
                      broker_port: parseInt(mqttForm.brokerPort),
                      username: mqttForm.username,
                      password: mqttForm.password,
                      tls_enabled: mqttForm.tlsEnabled,
                      ca_cert_path: mqttForm.caCertPath,
                      client_cert_path: mqttForm.clientCertPath,
                      client_key_path: mqttForm.clientKeyPath,
                      topics: mqttForm.topics,
                      qos: parseInt(mqttForm.qos),
                      is_active: mqttForm.isActive,
                    }
                    const res = await apiFetch(`${API_BASE_URL}/api/config/mqtt`, {
                      method: 'PUT',
                      headers: { ...headers, 'Content-Type': 'application/json' },
                      body: JSON.stringify(body),
                    })
                    if (res.ok) {
                      const saved = await res.json()
                      setMqttForm(mapMqttDataToForm(saved))
                      alert('Configuração MQTT salva com sucesso!')
                      loadConfigs()
                    } else {
                      const error = await res.json().catch(() => null)
                      alert(error?.error || 'Erro ao salvar configuração MQTT')
                    }
                  }}
                  className="flex-1 px-4 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-semibold transition-colors"
                >
                  Salvar
                </button>
                <button
                  onClick={async () => {
                    if (!mqttForm.id) {
                      alert('Salve a configuração MQTT antes de testar.')
                      return
                    }

                    const res = await apiFetch(`${API_BASE_URL}/api/config/mqtt/${mqttForm.id}/test`, {
                      method: 'POST',

                    })
                    const data = await res.json().catch(() => null)
                    if (res.ok) {
                      alert(`MQTT conectado: ${data?.broker || mqttForm.brokerHost}`)
                    } else {
                      alert(data?.error || 'Falha ao testar MQTT')
                    }
                  }}
                  className="flex-1 px-4 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-semibold transition-colors"
                >
                  Testar TLS
                </button>
              </div>

            </div>

          </div>

        )}



        {activeSection === 'mysql' && (

          <div className="bg-white rounded-2xl border-l-4 border-blue-500 border border-gray-200 p-6 shadow-sm">

            <div className="flex items-center gap-3 mb-6">

              <Database className="h-8 w-8 text-blue-600" />

              <div>

                <h2 className="text-xl font-bold text-gray-900">Configuração MySQL</h2>

                <p className="text-sm text-gray-500">Configure banco de dados MySQL para histórico de produção</p>

              </div>

            </div>

            <div className="space-y-4">

              <label className="block space-y-2">

                <span className="text-sm font-medium text-gray-600">Nome</span>

                <input

                  type="text"

                  value={mysqlForm.name}

                  onChange={(e) => setMysqlForm({ ...mysqlForm, name: e.target.value })}

                  className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-gray-900 shadow-sm focus:border-red-500 focus:outline-none"

                />

              </label>

              <label className="block space-y-2">

                <span className="text-sm font-medium text-gray-600">Host</span>

                <input

                  type="text"

                  value={mysqlForm.host}

                  onChange={(e) => setMysqlForm({ ...mysqlForm, host: e.target.value })}

                  className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-gray-900 shadow-sm focus:border-red-500 focus:outline-none"

                />

              </label>

            </div>

          </div>

        )}



        {activeSection === 'saved' && (

          <div className="space-y-6">

            <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">

              <h2 className="text-xl font-bold text-gray-900 mb-4">OPC UA Connections</h2>

              {opcConnections.length === 0 ? (

                <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-500">Nenhuma conexão OPC UA salva.</div>

              ) : (

                <div className="space-y-2">

                  {opcConnections.map((conn, index) => (

                    <button

                      key={conn.id || index}

                      onClick={() => handleEditConnection('opcua')}

                      className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-left hover:border-red-200 hover:bg-gray-50 transition-colors"

                    >

                      <p className="text-sm font-semibold text-gray-900">{conn.name}</p>

                      <p className="mt-1 text-sm text-gray-500 break-all">{conn.serverUrl}</p>

                      <div className="mt-2 flex items-center gap-2">

                        <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${conn.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>

                          {conn.isActive ? 'Ativo' : 'Inativo'}

                        </span>

                        <span className="text-xs text-gray-400">{conn.securityPolicy}</span>

                      </div>

                    </button>

                  ))}

                </div>

              )}

            </div>



            <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">

              <h2 className="text-xl font-bold text-gray-900 mb-4">MQTT Connections</h2>

              {mqttConnections.length === 0 ? (

                <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-500">Nenhuma conexão MQTT salva.</div>

              ) : (

                <div className="space-y-2">

                  {mqttConnections.map((conn, index) => (

                    <button

                      key={conn.id || index}

                      onClick={() => handleEditConnection('mqtt')}

                      className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-left hover:border-red-200 hover:bg-gray-50 transition-colors"

                    >

                      <p className="text-sm font-semibold text-gray-900">{conn.name}</p>

                      <p className="mt-1 text-sm text-gray-500 break-all">{conn.brokerHost}:{conn.brokerPort}</p>

                      <div className="mt-2 flex items-center gap-2">

                        <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${conn.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>

                          {conn.isActive ? 'Ativo' : 'Inativo'}

                        </span>

                        <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${conn.tlsEnabled ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'}`}>

                          {conn.tlsEnabled ? 'TLS' : 'No TLS'}

                        </span>

                      </div>

                    </button>

                  ))}

                </div>

              )}

            </div>



            <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">

              <h2 className="text-xl font-bold text-gray-900 mb-4">MySQL Connections</h2>

              {mysqlConnections.length === 0 ? (

                <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-500">Nenhuma conexão MySQL salva.</div>

              ) : (

                <div className="space-y-2">

                  {mysqlConnections.map((conn, index) => (

                    <button

                      key={conn.id || index}

                      onClick={() => handleEditConnection('mysql')}

                      className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-left hover:border-red-200 hover:bg-gray-50 transition-colors"

                    >

                      <p className="text-sm font-semibold text-gray-900">{conn.name}</p>

                      <p className="mt-1 text-sm text-gray-500 break-all">{conn.user}@{conn.host}:{conn.port}/{conn.database}</p>

                      <div className="mt-2 flex items-center gap-2">

                        <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${conn.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>

                          {conn.isActive ? 'Ativo' : 'Inativo'}

                        </span>

                        <span className="text-xs text-gray-400">Pool: {conn.poolSize}</span>

                      </div>

                    </button>

                  ))}

                </div>

              )}

            </div>

          </div>

        )}

      </div>

    </ProtectedLayout>

  )

}




