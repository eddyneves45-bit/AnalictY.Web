'use client'

import React, { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ProtectedLayout } from '@/components/layout/protected-layout'
import { useSelectedMachine } from '@/components/providers/selected-machine-provider'
import { API_BASE_URL, apiFetch } from '@/lib/api'
import { useAuth } from '@/components/providers/auth-provider'
import { usePageReady } from '@/components/providers/navigation-feedback-provider'
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle,
  ChevronRight,
  Clock3,
  Download,
  Factory,
  FileText,
  Folder,
  Mail,
  Plus,
  Repeat,
  Send,
  Trash2,
  Upload,
  X,
} from 'lucide-react'

type ReportType = 'production' | 'status' | 'downtime'
type ReportStatus = 'ready' | 'scheduled' | 'generating'
type ExportFormat = 'xlsx' | 'csv' | 'pdf'
type ScheduleFrequency = 'window' | 'daily' | 'weekly' | 'monthly'

interface ProductionShiftColumn {
  key: string
  name: string
  code: string
  startTime: string
  endTime: string
}

interface ProductionMatrixRow {
  hour: string
  values: Record<string, number>
  outsideShift: number
  total: number
}

interface ProductionMatrix {
  success: boolean
  reportType: string
  machine: string
  startAt: string
  endAt: string
  shifts: ProductionShiftColumn[]
  rows: ProductionMatrixRow[]
  totals: Record<string, number>
  outsideShiftTotal: number
  grandTotal: number
}

interface StatusMatrixRow {
  hour: string
  values: {
    productionMinutes: number
    idleMinutes: number
    maintenanceMinutes: number
    inactiveMinutes: number
    totalMinutes: number
  }
}

interface StatusMatrix {
  success: boolean
  reportType: string
  machine: string
  startAt: string
  endAt: string
  rows: StatusMatrixRow[]
  totals: {
    productionHours: number
    idleHours: number
    maintenanceHours: number
    inactiveHours: number
    totalHours: number
  }
}

interface DowntimeEventRow {
  machineId: string
  triggerAt: string
  recoveryAt: string
  reason: string
  category: string
  totalSeconds: number
  totalMinutes: number
}

interface DowntimeEventsReport {
  success: boolean
  reportType: string
  machine: string
  startAt: string
  endAt: string
  items: DowntimeEventRow[]
  count: number
  totalMinutes: number
}

interface Report {
  id: number
  name: string
  type: ReportType
  period: string
  machine: string
  machineId: string | null
  startAt: string
  endAt: string
  status: ReportStatus
  format: ExportFormat
}

interface ReportSchedule {
  id: number
  name: string
  type: ReportType
  machineId: string | null
  startAt: string
  endAt: string
  format: 'csv' | 'xml' | 'pdf'
  periodicity: ScheduleFrequency
  time: string
  destination: string
  active: boolean
  nextRunAt?: string | null
  lastRunAt?: string | null
}

interface Machine {
  id: number
  name: string
  code: string
  cost_center?: string
  folder_id?: number | null
}

interface MachineFolder {
  id: number
  name: string
  parent_folder_id: number | null
  is_sector?: boolean
}

interface FtpExportForm {
  type: ReportType
  startDate: string
  startTime: string
  endDate: string
  endTime: string
  format: 'csv' | 'xml' | 'pdf'
  destinationPath: string
  scheduleTimes: string[]
}

interface ReportForm {
  type: ReportType
  machineId: string
  startDate: string
  startTime: string
  endDate: string
  endTime: string
  format: ExportFormat
  includeDowntimeReasons: boolean
}

interface ScheduleForm {
  name: string
  frequency: ScheduleFrequency
  windowDate: string
  windowStartTime: string
  windowEndTime: string
  time: string
  dayOfWeek: string
  dayOfMonth: string
  recipient: string
}

const today = new Date().toISOString().slice(0, 10)

const reportMeta: Record<ReportType, { label: string; color: string; description: string }> = {
  production: {
    label: 'Produção',
    color: 'bg-blue-100 text-blue-700',
    description: 'Produção por turno e acumulado diário.',
  },
  status: {
    label: 'Status',
    color: 'bg-emerald-100 text-emerald-700',
    description: 'Horas trabalhando, ociosa, manutenção e inativa.',
  },
  downtime: {
    label: 'Paradas',
    color: 'bg-amber-100 text-amber-700',
    description: 'Ocorrências, duração e motivos de parada.',
  },
}

const createReportForm = (type: ReportType, machineId = 'all'): ReportForm => ({
  type,
  machineId,
  startDate: today,
  startTime: '00:00',
  endDate: today,
  endTime: '23:59',
  format: 'pdf',
  includeDowntimeReasons: type === 'downtime',
})

const createScheduleForm = (type: ReportType): ScheduleForm => ({
  name: `Relatório de ${reportMeta[type].label}`,
  frequency: 'window',
  windowDate: today,
  windowStartTime: '01:00',
  windowEndTime: '05:00',
  time: '06:00',
  dayOfWeek: '1',
  dayOfMonth: '1',
  recipient: '',
})

const normalizeMachine = (item: any): Machine => ({
  id: item.id,
  name: item.name ?? '',
  code: item.code ?? '',
  cost_center: item.cost_center ?? item.costCenter ?? item.CostCenter ?? '',
  folder_id: item.folder_id ?? item.folderId ?? item.FolderId ?? null,
})

const normalizeFolder = (item: any): MachineFolder => ({
  id: item.id,
  name: item.name,
  parent_folder_id: item.parent_folder_id ?? item.parentFolderId ?? item.ParentFolderId ?? null,
  is_sector: item.is_sector ?? item.isSector ?? item.IsSector ?? false,
})

export default function ReportPage() {
  const { selectedMachine } = useSelectedMachine()
  const { token } = useAuth()
  const router = useRouter()
  const [machines, setMachines] = useState<Machine[]>([])
  const [folders, setFolders] = useState<MachineFolder[]>([])
  const [expandedFolderIds, setExpandedFolderIds] = useState<number[]>([])
  const [selectedExportMachineId, setSelectedExportMachineId] = useState<number | null>(null)
  const [reports, setReports] = useState<Report[]>([])
  const [isLoading, setIsLoading] = useState(true)
  usePageReady(!isLoading)
  const [reportForm, setReportForm] = useState<ReportForm | null>(null)
  const [scheduleForm, setScheduleForm] = useState<ScheduleForm | null>(null)
  const [ftpForm, setFtpForm] = useState<FtpExportForm | null>(null)
  const [ftpSchedules, setFtpSchedules] = useState<ReportSchedule[]>([])
  const [editingFtpScheduleId, setEditingFtpScheduleId] = useState<number | null>(null)
  const [ftpBusy, setFtpBusy] = useState(false)
  const [productionPreview, setProductionPreview] = useState<ProductionMatrix | null>(null)
  const [statusPreview, setStatusPreview] = useState<StatusMatrix | null>(null)
  const [downtimePreview, setDowntimePreview] = useState<DowntimeEventsReport | null>(null)
  const [previewReport, setPreviewReport] = useState<Report | null>(null)
  const [notification, setNotification] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (!token) {
      setIsLoading(false)
      return
    }

    async function loadInitialData() {
      try {
        const [machinesResponse, foldersResponse, executionsResponse, schedulesResponse] = await Promise.all([
          apiFetch(`${API_BASE_URL}/api/machines`, {  }),
          apiFetch(`${API_BASE_URL}/api/machine-folders`, {  }),
          apiFetch(`${API_BASE_URL}/api/reports/executions`, {  }),
          apiFetch(`${API_BASE_URL}/api/reports/schedules`, {  }),
        ])
        if (!machinesResponse.ok) throw new Error('Falha ao carregar máquinas')
        const machineData = await machinesResponse.json()
        const folderData = foldersResponse.ok ? await foldersResponse.json() : []
        const normalizedFolders = (folderData || []).map(normalizeFolder)
        setMachines(machineData.map(normalizeMachine))
        setFolders(normalizedFolders)
        setExpandedFolderIds([])
        if (executionsResponse.ok) {
          const executionData = await executionsResponse.json()
          setReports(executionData.map(mapExecutionToReport))
        }
        if (schedulesResponse.ok) {
          const scheduleData = await schedulesResponse.json()
          setFtpSchedules((scheduleData || []).map(mapReportSchedule).filter((item: ReportSchedule) => item.destination.startsWith('ftp:')))
        }
      } catch (error) {
        console.error(error)
      } finally {
        setIsLoading(false)
      }
    }

    loadInitialData()
  }, [token])

  const defaultMachineId = selectedMachine?.id ? String(selectedMachine.id) : 'all'
  const selectedExportMachine = useMemo(
    () => machines.find((machine) => machine.id === selectedExportMachineId) ?? null,
    [machines, selectedExportMachineId],
  )
  const scheduledMachineIds = useMemo(
    () => new Set(ftpSchedules.filter((schedule) => schedule.active && schedule.machineId).map((schedule) => String(schedule.machineId))),
    [ftpSchedules],
  )
  const selectedMachineFtpSchedules = useMemo(
    () => selectedExportMachine
      ? ftpSchedules.filter((schedule) => schedule.machineId === String(selectedExportMachine.id) && schedule.active)
      : [],
    [ftpSchedules, selectedExportMachine],
  )
  const scheduledFolderIds = useMemo(() => {
    const result = new Set<number>()
    const folderById = new Map(folders.map((folder) => [folder.id, folder]))
    const markFolderAndParents = (folderId: number | null | undefined) => {
      let currentId = folderId
      while (currentId != null) {
        result.add(currentId)
        currentId = folderById.get(currentId)?.parent_folder_id ?? null
      }
    }

    machines.forEach((machine) => {
      if (scheduledMachineIds.has(String(machine.id))) {
        markFolderAndParents(machine.folder_id)
      }
    })

    return result
  }, [folders, machines, scheduledMachineIds])

  const counts = useMemo(
    () => ({
      production: reports.filter((report) => report.type === 'production').length,
      status: reports.filter((report) => report.type === 'status').length,
      downtime: reports.filter((report) => report.type === 'downtime').length,
    }),
    [reports],
  )

  function openGenerateModal(type: ReportType) {
    const machineId = type === 'status'
      ? (defaultMachineId === 'all' ? '' : defaultMachineId)
      : defaultMachineId
    setReportForm(createReportForm(type, machineId))
    setScheduleForm(null)
    setProductionPreview(null)
    setStatusPreview(null)
    setDowntimePreview(null)
    setPreviewReport(null)
  }

  function closeModal() {
    setReportForm(null)
    setScheduleForm(null)
    setProductionPreview(null)
    setStatusPreview(null)
    setDowntimePreview(null)
    setPreviewReport(null)
  }

  function getMachineLabel(machineId: string) {
    if (!machineId) return 'Selecione máquina'
    if (machineId === 'all') return 'Todas as máquinas'
    const machine = machines.find((item) => String(item.id) === machineId)
    return machine ? `${machine.name} (${machine.code})` : 'Máquina selecionada'
  }

  function getPeriodLabel(form: ReportForm) {
    return form.startDate === form.endDate
      ? `${formatDate(form.startDate)} ${form.startTime} às ${form.endTime}`
      : `${formatDate(form.startDate)} ${form.startTime} a ${formatDate(form.endDate)} ${form.endTime}`
  }

  function buildReportPayload(form: ReportForm) {
    return {
      report_type: form.type,
      machine_id: form.machineId === 'all' ? null : form.machineId,
      inicio_em: `${form.startDate}T${form.startTime}:00`,
      fim_em: `${form.endDate}T${form.endTime}:00`,
      formato: form.format,
      incluir_motivos_parada: form.includeDowntimeReasons,
    }
  }

  async function handleGenerateReport() {
    if (!reportForm) return
    if (reportForm.type === 'status' && (!reportForm.machineId || reportForm.machineId === 'all')) {
      setNotification('Selecione uma máquina para gerar a prévia de status por hora.')
      return
    }
    const nextReport: Report = {
      id: Date.now(),
      name: `Relatório de ${reportMeta[reportForm.type].label}`,
      type: reportForm.type,
      period: getPeriodLabel(reportForm),
      machine: getMachineLabel(reportForm.machineId),
      machineId: reportForm.machineId === 'all' ? null : reportForm.machineId,
      startAt: `${reportForm.startDate}T${reportForm.startTime}:00`,
      endAt: `${reportForm.endDate}T${reportForm.endTime}:00`,
      status: 'generating',
      format: reportForm.format,
    }
    setReports((current) => [nextReport, ...current])
    setIsSubmitting(true)
    try {
      const response = await apiFetch(`${API_BASE_URL}/api/reports/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(buildReportPayload(reportForm)),
      })
      if (!response.ok) throw new Error('Falha ao gerar relatório')
      const generated = await response.json()
      setReports((current) =>
        current.map((report) =>
          report.id === nextReport.id ? { ...report, status: 'ready' } : report,
        ),
      )
      if (reportForm.type === 'production') {
        setProductionPreview(normalizeProductionMatrix(generated.matrix ?? generated))
        setPreviewReport({ ...nextReport, status: 'ready' })
        setNotification('Prévia de produção gerada com dados reais.')
      } else if (reportForm.type === 'status') {
        setStatusPreview(normalizeStatusMatrix(generated.matrix ?? generated))
        setPreviewReport({ ...nextReport, status: 'ready' })
        setNotification('Prévia de status gerada com dados reais.')
      } else if (reportForm.type === 'downtime') {
        setDowntimePreview(normalizeDowntimeEvents(generated.events ?? generated))
        setPreviewReport({ ...nextReport, status: 'ready' })
        setNotification('Prévia de eventos de parada gerada com dados reais.')
      }
    } catch (error) {
      console.error(error)
      setNotification('Não foi possível gerar o relatório.')
      setReports((current) => current.filter((report) => report.id !== nextReport.id))
    } finally {
      setIsSubmitting(false)
    }
  }

  function handleOpenSchedule() {
    if (!reportForm) return
    setScheduleForm(createScheduleForm(reportForm.type))
  }

  async function handleSaveSchedule() {
    if (!reportForm || !scheduleForm) return
    if (reportForm.type === 'status' && (!reportForm.machineId || reportForm.machineId === 'all')) {
      setNotification('Selecione uma máquina para agendar o relatório de status.')
      return
    }
    const nextReport: Report = {
      id: Date.now(),
      name: scheduleForm.name.trim() || `Relatório de ${reportMeta[reportForm.type].label}`,
      type: reportForm.type,
      period: describeSchedule(scheduleForm),
      machine: getMachineLabel(reportForm.machineId),
      machineId: reportForm.machineId === 'all' ? null : reportForm.machineId,
      startAt: `${reportForm.startDate}T${reportForm.startTime}:00`,
      endAt: `${reportForm.endDate}T${reportForm.endTime}:00`,
      status: 'scheduled',
      format: reportForm.format,
    }
    setIsSubmitting(true)
    try {
      const scheduledWindow = scheduleForm.frequency === 'window'
        ? {
            inicio_em: `${scheduleForm.windowDate}T${scheduleForm.windowStartTime}:00`,
            fim_em: `${scheduleForm.windowDate}T${scheduleForm.windowEndTime}:00`,
          }
        : {}
      const response = await apiFetch(`${API_BASE_URL}/api/reports/schedule`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          nome: scheduleForm.name,
          ...buildReportPayload(reportForm),
          ...scheduledWindow,
          periodicidade: scheduleForm.frequency,
          horario: scheduleForm.frequency === 'window' ? null : scheduleForm.time,
          dia_semana: scheduleForm.frequency === 'weekly' ? Number(scheduleForm.dayOfWeek) : null,
          dia_mes: scheduleForm.frequency === 'monthly' ? Number(scheduleForm.dayOfMonth) : null,
          destino: scheduleForm.recipient || null,
        }),
      })
      if (!response.ok) throw new Error('Falha ao agendar exportação')
      setReports((current) => [nextReport, ...current])
      setNotification('Exportação agendada com sucesso.')
      closeModal()
    } catch (error) {
      console.error(error)
      setNotification('Não foi possível salvar o agendamento.')
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleDownload(report: Report) {
    if (report.format === 'pdf') {
      await handleDownloadPdf(report)
      return
    }

    const exportEndpoint = report.type === 'production'
      ? `${API_BASE_URL}/api/reports/production/export/csv`
      : `${API_BASE_URL}/api/reports/export/csv`

    const response = await apiFetch(exportEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        report_type: report.type,
        machine_id: report.machineId,
        inicio_em: report.startAt,
        fim_em: report.endAt,
        formato: 'csv',
        incluir_motivos_parada: report.type === 'downtime',
      }),
    })
    if (!response.ok) {
      setNotification('Não foi possível baixar a exportação.')
      return
    }
    const blob = await response.blob()
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `relatorio-${report.type}.csv`
    anchor.style.display = 'none'
    document.body.appendChild(anchor)
    anchor.click()
    anchor.remove()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

  async function handleDownloadPdf(report: Report) {
    if (report.type !== 'production' && report.type !== 'status' && report.type !== 'downtime') {
      window.print()
      return
    }

    if (report.type === 'downtime') {
      let events = downtimePreview
      if (!events || previewReport?.id !== report.id) {
        const response = await apiFetch(`${API_BASE_URL}/api/reports/downtime/events`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            report_type: report.type,
            machine_id: report.machineId,
            inicio_em: report.startAt,
            fim_em: report.endAt,
            formato: report.format,
            incluir_motivos_parada: true,
          }),
        })
        if (!response.ok) {
          setNotification('Não foi possível preparar o PDF.')
          return
        }
        events = normalizeDowntimeEvents(await response.json())
      }

      openDowntimePdf(events, report)
      return
    }

    if (report.type === 'status') {
      let matrix = statusPreview
      if (!matrix || previewReport?.id !== report.id) {
        const response = await apiFetch(`${API_BASE_URL}/api/reports/status/matrix`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            report_type: report.type,
            machine_id: report.machineId,
            inicio_em: report.startAt,
            fim_em: report.endAt,
            formato: report.format,
            incluir_motivos_parada: false,
          }),
        })
        if (!response.ok) {
          setNotification('Não foi possível preparar o PDF.')
          return
        }
        matrix = normalizeStatusMatrix(await response.json())
      }

      openStatusPdf(matrix, report)
      return
    }

    let matrix = productionPreview
    if (!matrix || previewReport?.id !== report.id) {
      const response = await apiFetch(`${API_BASE_URL}/api/reports/production/matrix`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          report_type: report.type,
          machine_id: report.machineId,
          inicio_em: report.startAt,
          fim_em: report.endAt,
          formato: report.format,
          incluir_motivos_parada: false,
        }),
      })
      if (!response.ok) {
        setNotification('Não foi possível preparar o PDF.')
        return
      }
      matrix = normalizeProductionMatrix(await response.json())
    }

    openProductionPdf(matrix, report)
  }

  function openFtpExportModal(machine: Machine) {
    setSelectedExportMachineId(machine.id)
    setFtpForm({
      type: 'production',
      startDate: today,
      startTime: '00:00',
      endDate: today,
      endTime: '23:59',
      format: 'csv',
      destinationPath: `/${machine.cost_center || 'sem-centro-custo'}/${machine.code}`,
      scheduleTimes: ['06:00'],
    })
  }

  async function testFtpConnection() {
    setFtpBusy(true)
    try {
      const response = await apiFetch(`${API_BASE_URL}/api/config/ftp-export/test`, { method: 'POST' })
      const data = await response.json()
      setNotification(data.message || (response.ok ? 'Conexão FTP testada.' : 'Falha no teste FTP.'))
    } catch (error) {
      console.error(error)
      setNotification('Não foi possível testar a conexão FTP.')
    } finally {
      setFtpBusy(false)
    }
  }

  async function sendFtpReportNow() {
    if (!ftpForm || !selectedExportMachine) return

    setFtpBusy(true)
    try {
      const response = await apiFetch(`${API_BASE_URL}/api/config/ftp-export/send-report`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          report_type: ftpForm.type,
          machine_id: String(selectedExportMachine.id),
          machine_code: selectedExportMachine.code,
          inicio_em: `${ftpForm.startDate}T${ftpForm.startTime}:00`,
          fim_em: `${ftpForm.endDate}T${ftpForm.endTime}:00`,
          formato: ftpForm.format,
          destination_path: ftpForm.destinationPath,
          incluir_motivos_parada: ftpForm.type === 'downtime',
        }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.message || 'Falha ao enviar relatório por FTP.')
      setNotification(`${data.message} Destino: ${data.destination_path}/${data.file_name}`)
      setFtpForm(null)
      setEditingFtpScheduleId(null)
    } catch (error) {
      console.error(error)
      setNotification(error instanceof Error ? error.message : 'Não foi possível enviar o relatório por FTP.')
    } finally {
      setFtpBusy(false)
    }
  }

  function editFtpSchedule(schedule: ReportSchedule) {
    const machine = machines.find((item) => String(item.id) === schedule.machineId)
    if (machine) setSelectedExportMachineId(machine.id)
    setEditingFtpScheduleId(schedule.id)
    setFtpForm({
      type: schedule.type,
      startDate: schedule.startAt.slice(0, 10),
      startTime: schedule.startAt.slice(11, 16) || '00:00',
      endDate: schedule.endAt.slice(0, 10),
      endTime: schedule.endAt.slice(11, 16) || '23:59',
      format: schedule.format,
      destinationPath: schedule.destination.replace(/^ftp:/i, '') || `/${machine?.cost_center || 'sem-centro-custo'}/${machine?.code || 'maquina'}`,
      scheduleTimes: [schedule.time || '06:00'],
    })
  }

  async function scheduleFtpExport() {
    if (!ftpForm || !selectedExportMachine) return
    const times = Array.from(new Set(ftpForm.scheduleTimes.filter(Boolean))).slice(0, 24)
    if (times.length === 0) {
      setNotification('Informe pelo menos um horário para o agendamento FTP.')
      return
    }

    setFtpBusy(true)
    try {
      if (editingFtpScheduleId) {
        const time = times[0]
        const response = await apiFetch(`${API_BASE_URL}/api/reports/schedules/${editingFtpScheduleId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            report_type: ftpForm.type,
            nome: `FTP ${reportMeta[ftpForm.type].label} - ${selectedExportMachine.code} - ${time}`,
            machine_id: String(selectedExportMachine.id),
            inicio_em: `${ftpForm.startDate}T${ftpForm.startTime}:00`,
            fim_em: `${ftpForm.endDate}T${ftpForm.endTime}:00`,
            formato: ftpForm.format,
            incluir_motivos_parada: ftpForm.type === 'downtime',
            periodicidade: 'daily',
            horario: `${time}:00`,
            dia_semana: null,
            dia_mes: null,
            destino: `ftp:${ftpForm.destinationPath}`,
            ativo: true,
          }),
        })
        const data = await response.json()
        if (!response.ok || data.success === false) throw new Error(data.message || 'Falha ao atualizar agendamento FTP.')
        setFtpSchedules((current) => current.map((schedule) => schedule.id === editingFtpScheduleId
          ? {
              ...schedule,
              name: `FTP ${reportMeta[ftpForm.type].label} - ${selectedExportMachine.code} - ${time}`,
              type: ftpForm.type,
              machineId: String(selectedExportMachine.id),
              startAt: `${ftpForm.startDate}T${ftpForm.startTime}:00`,
              endAt: `${ftpForm.endDate}T${ftpForm.endTime}:00`,
              format: ftpForm.format,
              time,
              destination: `ftp:${ftpForm.destinationPath}`,
              active: true,
            }
          : schedule))
        setNotification(`Agendamento FTP atualizado para ${selectedExportMachine.code}.`)
        setFtpForm(null)
        setEditingFtpScheduleId(null)
        return
      }

      const createdIds: number[] = []
      for (const time of times) {
        const response = await apiFetch(`${API_BASE_URL}/api/reports/schedule`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            report_type: ftpForm.type,
            nome: `FTP ${reportMeta[ftpForm.type].label} - ${selectedExportMachine.code} - ${time}`,
            machine_id: String(selectedExportMachine.id),
            inicio_em: `${ftpForm.startDate}T${ftpForm.startTime}:00`,
            fim_em: `${ftpForm.endDate}T${ftpForm.endTime}:00`,
            formato: ftpForm.format,
            incluir_motivos_parada: ftpForm.type === 'downtime',
            periodicidade: 'daily',
            horario: `${time}:00`,
            dia_semana: null,
            dia_mes: null,
            destino: `ftp:${ftpForm.destinationPath}`,
          }),
        })
        const data = await response.json()
        if (!response.ok || data.success === false) {
          throw new Error(data.message || `Falha ao salvar agendamento das ${time}.`)
        }
        createdIds.push(Number(data.id || Date.now()))
      }

      const nextReports = times.map((time, index) => ({
        id: Date.now() + index,
        name: `FTP ${reportMeta[ftpForm.type].label} - ${selectedExportMachine.code}`,
        type: ftpForm.type,
        period: `Diário às ${time}`,
        machine: `${selectedExportMachine.name} (${selectedExportMachine.code})`,
        machineId: String(selectedExportMachine.id),
        startAt: `${ftpForm.startDate}T${ftpForm.startTime}:00`,
        endAt: `${ftpForm.endDate}T${ftpForm.endTime}:00`,
        status: 'scheduled' as ReportStatus,
        format: ftpForm.format === 'xml' ? 'csv' : ftpForm.format,
      }))
      const nextSchedules = times.map((time, index) => ({
        id: createdIds[index] || Date.now() + index,
        name: `FTP ${reportMeta[ftpForm.type].label} - ${selectedExportMachine.code} - ${time}`,
        type: ftpForm.type,
        machineId: String(selectedExportMachine.id),
        startAt: `${ftpForm.startDate}T${ftpForm.startTime}:00`,
        endAt: `${ftpForm.endDate}T${ftpForm.endTime}:00`,
        format: ftpForm.format,
        periodicity: 'daily' as ScheduleFrequency,
        time,
        destination: `ftp:${ftpForm.destinationPath}`,
        active: true,
      }))
      setReports((current) => [...nextReports, ...current])
      setFtpSchedules((current) => [...nextSchedules, ...current])
      setNotification(`${times.length} agendamento(s) FTP salvo(s) para ${selectedExportMachine.code}.`)
      setFtpForm(null)
      setEditingFtpScheduleId(null)
    } catch (error) {
      console.error(error)
      setNotification(error instanceof Error ? error.message : 'Não foi possível salvar os agendamentos FTP.')
    } finally {
      setFtpBusy(false)
    }
  }

  async function handleDeleteReport(reportId: number) {
    const previousReports = reports
    setReports((current) => current.filter((report) => report.id !== reportId))
    if (previewReport?.id === reportId) {
      setPreviewReport(null)
      setProductionPreview(null)
      setStatusPreview(null)
      setDowntimePreview(null)
    }

    try {
      const response = await apiFetch(`${API_BASE_URL}/api/reports/executions/${reportId}`, {
        method: 'DELETE',
      })
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      setNotification('Relatório excluído.')
    } catch (error) {
      console.error(error)
      setReports(previousReports)
      setNotification('Não foi possível excluir o relatório.')
    }
  }

  return (
    <ProtectedLayout allowedPermissions={['reports.download']}>
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <button onClick={() => router.back()} className="rounded-lg p-2 transition-colors hover:bg-gray-100">
            <ArrowLeft className="h-5 w-5 text-gray-600" />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Relatórios do Sistema</h1>
            <p className="mt-1 text-gray-600">
              Produção, status operacional, paradas e exportações programadas.
            </p>
          </div>
        </div>

        {notification && (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            {notification}
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <SummaryCard label="Produção" count={counts.production} tone="blue" />
          <SummaryCard label="Status" count={counts.status} tone="green" />
          <SummaryCard label="Paradas" count={counts.downtime} tone="amber" />
        </div>

        <section className="grid grid-cols-1 gap-6 xl:grid-cols-[280px_minmax(0,1fr)]">
          <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold uppercase text-gray-500">Exportação por máquina</h2>
                <p className="mt-1 text-xs text-gray-500">Use a estrutura de pastas para escolher a origem.</p>
              </div>

            </div>
            <div className="max-h-[360px] overflow-auto rounded-xl border border-gray-100">
              <button
                onClick={() => setSelectedExportMachineId(null)}
                className={`flex w-full items-center gap-2 border-b border-gray-100 px-3 py-2 text-left text-sm hover:bg-orange-50 ${selectedExportMachineId === null ? 'bg-orange-50 font-semibold text-orange-700' : 'text-gray-700'}`}
              >
                <Factory className="h-4 w-4" />
                Todas
              </button>
              {folders.filter((folder) => folder.parent_folder_id === null).map((folder) => (
                <ReportMachineFolderNode
                  key={folder.id}
                  folder={folder}
                  folders={folders}
                  machines={machines}
                  selectedMachineId={selectedExportMachineId}
                  scheduledMachineIds={scheduledMachineIds}
                  scheduledFolderIds={scheduledFolderIds}
                  expandedFolderIds={expandedFolderIds}
                  onToggle={(folderId) =>
                    setExpandedFolderIds((current) =>
                      current.includes(folderId)
                        ? current.filter((id) => id !== folderId)
                        : [...current, folderId],
                    )
                  }
                  onSelectMachine={(machine) => setSelectedExportMachineId(machine.id)}
                  level={0}
                />
              ))}
              {machines.filter((machine) => machine.folder_id === null).map((machine) => (
                <button
                  key={machine.id}
                  onClick={() => setSelectedExportMachineId(machine.id)}
                  className={`flex w-full items-center gap-2 border-b border-gray-100 px-3 py-2 text-left text-sm hover:bg-orange-50 ${selectedExportMachineId === machine.id ? 'bg-orange-50 font-semibold text-orange-700' : 'text-gray-700'}`}
                >
                  <Factory className="h-4 w-4" />
                  <span className="min-w-0 truncate">{machine.code} · {machine.name}</span>
                  {scheduledMachineIds.has(String(machine.id)) && (
                    <span className="ml-auto rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-bold uppercase text-blue-700">
                      Agend.
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <div className="flex items-center gap-2">

                  <h2 className="text-lg font-bold text-gray-900">Agendamento de relatórios FTP</h2>
                </div>
                <p className="mt-1 text-sm text-gray-500">
                  Clique em uma máquina para preparar CSV, XML ou PDF para o servidor FTP da rede.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={testFtpConnection}
                  disabled={ftpBusy}
                  className="flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-60"
                >
                  <CheckCircle className="h-4 w-4" />
                  Testar FTP
                </button>
                <button
                  onClick={() => selectedExportMachine ? openFtpExportModal(selectedExportMachine) : setNotification('Selecione uma máquina para exportar por FTP.')}
                  className="flex items-center gap-2 rounded-lg bg-orange-600 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-700"
                >
                  <Send className="h-4 w-4" />
                  Exportar máquina
                </button>
              </div>
            </div>
            <div className="mt-6 grid gap-4 lg:grid-cols-3">
              {selectedExportMachine ? (
                <>
                  <div className="rounded-xl border border-orange-100 bg-orange-50 p-4">
                    <p className="text-xs font-semibold uppercase text-orange-700">Máquina selecionada</p>
                    <h3 className="mt-2 text-lg font-bold text-gray-900">{selectedExportMachine.name}</h3>
                    <p className="mt-1 text-sm text-gray-600">
                      {selectedExportMachine.cost_center || 'sem centro de custo'} · {selectedExportMachine.code}
                    </p>
                  </div>
                  <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                    <p className="text-xs font-semibold uppercase text-gray-500">Destino sugerido</p>
                    <p className="mt-2 font-mono text-sm text-gray-900">
                      /{selectedExportMachine.cost_center || 'sem-centro-custo'}/{selectedExportMachine.code}
                    </p>
                    <p className="mt-1 text-xs text-gray-500">A pasta pode ser alterada no modal antes do envio.</p>
                  </div>
                  <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                    <p className="text-xs font-semibold uppercase text-gray-500">Agendamento</p>
                    {scheduledMachineIds.has(String(selectedExportMachine.id)) ? (
                      <p className="mt-2 inline-flex rounded-full bg-blue-100 px-3 py-1 text-sm font-semibold text-blue-700">
                        {selectedMachineFtpSchedules.length} agendamento(s)
                      </p>
                    ) : (
                      <p className="mt-2 inline-flex rounded-full bg-gray-200 px-3 py-1 text-sm font-semibold text-gray-600">
                        Sem agendamento
                      </p>
                    )}
                  </div>
                  <div className="lg:col-span-3 rounded-xl border border-gray-200 bg-white">
                    <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
                      <div>
                        <p className="text-sm font-bold text-gray-900">Agendamentos FTP da máquina</p>
                        <p className="text-xs text-gray-500">Horários, formato, destino e edição.</p>
                      </div>
                      <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-600">
                        {selectedMachineFtpSchedules.length}/24 por dia
                      </span>
                    </div>
                    <div className="max-h-44 overflow-auto">
                      {selectedMachineFtpSchedules.length === 0 ? (
                        <p className="px-4 py-6 text-sm text-gray-500">Nenhum agendamento FTP para esta máquina.</p>
                      ) : selectedMachineFtpSchedules.map((schedule) => (
                        <div key={schedule.id} className="grid gap-3 border-b border-gray-100 px-4 py-3 text-sm md:grid-cols-[120px_130px_minmax(0,1fr)_auto] md:items-center">
                          <div>
                            <p className="font-bold text-gray-900">{schedule.time || '--:--'}</p>
                            <p className="text-xs text-gray-500">Diário</p>
                          </div>
                          <div>
                            <p className="font-semibold text-gray-800">{reportMeta[schedule.type]?.label || schedule.type}</p>
                            <p className="text-xs uppercase text-gray-500">{schedule.format}</p>
                          </div>
                          <div className="min-w-0">
                            <p className="truncate font-mono text-xs text-gray-700">{schedule.destination.replace(/^ftp:/i, '')}</p>
                            <p className="text-xs text-gray-500">
                              Próxima: {schedule.nextRunAt ? formatDateTime(schedule.nextRunAt) : 'calculando'}
                            </p>
                          </div>
                          <button
                            onClick={() => editFtpSchedule(schedule)}
                            className="rounded-lg border border-gray-300 px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                          >
                            Ver / editar
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-4">
                    <p className="text-xs font-semibold uppercase text-gray-500">Passo 1</p>
                    <p className="mt-2 font-semibold text-gray-900">Escolha uma máquina na árvore</p>
                    <p className="mt-1 text-sm text-gray-500">As pastas iniciam recolhidas para facilitar a navegação.</p>
                  </div>
                  <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-4">
                    <p className="text-xs font-semibold uppercase text-gray-500">Passo 2</p>
                    <p className="mt-2 font-semibold text-gray-900">Defina formato e pasta</p>
                    <p className="mt-1 text-sm text-gray-500">CSV, XML ou PDF direto no servidor FTP da rede.</p>
                  </div>
                  <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-4">
                    <p className="text-xs font-semibold uppercase text-gray-500">Passo 3</p>
                    <p className="mt-2 font-semibold text-gray-900">Envie agora ou agende</p>
                    <p className="mt-1 text-sm text-gray-500">Máquinas agendadas aparecem marcadas na árvore.</p>
                  </div>
                </>
              )}
            </div>
          </div>
        </section>

        <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-200 px-6 py-4">
            <h2 className="text-lg font-bold text-gray-900">Gerar relatório para destino local</h2>
          </div>
          <div className="grid gap-4 p-6 md:grid-cols-3">
            {(Object.keys(reportMeta) as ReportType[]).map((type) => (
              <button
                key={type}
                onClick={() => openGenerateModal(type)}
                className="rounded-xl border border-gray-200 p-4 text-left transition-colors hover:border-gray-300 hover:bg-gray-50"
              >
                <div className="mb-3 flex items-center justify-between">
                  <span className={`rounded-full px-3 py-1 text-xs font-semibold ${reportMeta[type].color}`}>
                    {reportMeta[type].label}
                  </span>
                  <Plus className="h-4 w-4 text-gray-400" />
                </div>
                <p className="font-semibold text-gray-900">Novo relatório</p>
                <p className="mt-1 text-sm text-gray-500">{reportMeta[type].description}</p>
              </button>
            ))}
          </div>
        </section>

        <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
            <h2 className="text-lg font-bold text-gray-900">Relatórios disponíveis</h2>
            <span className="text-sm text-gray-500">{reports.length} itens</span>
          </div>
          <div className="divide-y divide-gray-100">
            {reports.map((report) => (
              <div key={report.id} className="flex flex-col gap-3 px-6 py-4 transition-colors hover:bg-gray-50 md:flex-row md:items-center md:justify-between">
                <div className="flex items-center gap-4">
                  <span className={`rounded-full px-3 py-1 text-xs font-semibold ${reportMeta[report.type].color}`}>
                    {reportMeta[report.type].label}
                  </span>
                  <div>
                    <p className="font-semibold text-gray-900">{report.name}</p>
                    <p className="text-sm text-gray-500">
                      {report.machine} · {report.period} · {report.format.toUpperCase()}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <StatusBadge status={report.status} />
                  {report.status === 'ready' && (
                    <button
                      onClick={() => handleDownload(report)}
                      className="flex items-center gap-2 rounded-lg bg-gray-100 px-3 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-200"
                    >
                      <Download className="h-4 w-4" />
                      Baixar
                    </button>
                  )}
                  <button
                    onClick={() => handleDeleteReport(report.id)}
                    className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700 transition-colors hover:bg-red-100"
                    title="Remover relatório da lista"
                  >
                    <Trash2 className="h-4 w-4" />
                    Excluir
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

        {isLoading && <p className="text-sm text-gray-500">Carregando máquinas...</p>}
      </div>

      {ftpForm && selectedExportMachine && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4">
          <div className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl">
            <div className="flex items-start justify-between border-b border-gray-200 px-6 py-5">
              <div>
                <h2 className="text-xl font-bold text-gray-900">{editingFtpScheduleId ? 'Editar agendamento FTP' : 'Exportação FTP'}</h2>
                <p className="mt-1 text-sm text-gray-500">
                  {selectedExportMachine.name} · {selectedExportMachine.cost_center || 'sem centro de custo'} · {selectedExportMachine.code}
                </p>
              </div>
              <button onClick={() => setFtpForm(null)} className="rounded-lg p-2 hover:bg-gray-100">
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>

            <div className="grid gap-5 px-6 py-5 md:grid-cols-2">
              <Field label="Tipo de relatório">
                <select
                  value={ftpForm.type}
                  onChange={(event) => setFtpForm({ ...ftpForm, type: event.target.value as ReportType })}
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2"
                >
                  <option value="production">Produção</option>
                  <option value="status">Status</option>
                  <option value="downtime">Paradas</option>
                </select>
              </Field>
              <Field label="Formato">
                <select
                  value={ftpForm.format}
                  onChange={(event) => setFtpForm({ ...ftpForm, format: event.target.value as 'csv' | 'xml' | 'pdf' })}
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2"
                >
                  <option value="csv">CSV</option>
                  <option value="xml">XML</option>
                  <option value="pdf">PDF</option>
                </select>
              </Field>
              <div className="md:col-span-2">
                <Field label="Pasta destino no servidor FTP">
                  <input
                    type="text"
                    value={ftpForm.destinationPath}
                    onChange={(event) => setFtpForm({ ...ftpForm, destinationPath: event.target.value })}
                    placeholder="/producao/CC166/PJ08"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2"
                  />
                </Field>
              </div>
              <Field label="Data inicial">
                <input
                  type="date"
                  value={ftpForm.startDate}
                  onChange={(event) => setFtpForm({ ...ftpForm, startDate: event.target.value })}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2"
                />
              </Field>
              <Field label="Hora inicial">
                <input
                  type="time"
                  value={ftpForm.startTime}
                  onChange={(event) => setFtpForm({ ...ftpForm, startTime: event.target.value })}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2"
                />
              </Field>
              <Field label="Data final">
                <input
                  type="date"
                  value={ftpForm.endDate}
                  onChange={(event) => setFtpForm({ ...ftpForm, endDate: event.target.value })}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2"
                />
              </Field>
              <Field label="Hora final">
                <input
                  type="time"
                  value={ftpForm.endTime}
                  onChange={(event) => setFtpForm({ ...ftpForm, endTime: event.target.value })}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2"
                />
              </Field>
              <div className="md:col-span-2">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-gray-700">Horários diários FTP</p>
                    <p className="text-xs text-gray-500">
                      {editingFtpScheduleId ? 'Edite o horário diário deste agendamento.' : 'Até 24 relatórios por dia para esta máquina.'}
                    </p>
                  </div>
                  {!editingFtpScheduleId && (
                    <button
                      type="button"
                      onClick={() => {
                        if (ftpForm.scheduleTimes.length >= 24) {
                          setNotification('Limite de 24 relatórios por dia atingido.')
                          return
                        }
                        setFtpForm({ ...ftpForm, scheduleTimes: [...ftpForm.scheduleTimes, '12:00'] })
                      }}
                      className="rounded-lg border border-gray-300 px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                    >
                      + Horário
                    </button>
                  )}
                </div>
                <div className="grid max-h-40 grid-cols-2 gap-2 overflow-auto rounded-lg border border-gray-200 bg-gray-50 p-3 md:grid-cols-4">
                  {(editingFtpScheduleId ? ftpForm.scheduleTimes.slice(0, 1) : ftpForm.scheduleTimes).map((time, index) => (
                    <div key={`${time}-${index}`} className="flex items-center gap-2">
                      <input
                        type="time"
                        value={time}
                        onChange={(event) => {
                          const nextTimes = [...ftpForm.scheduleTimes]
                          nextTimes[index] = event.target.value
                          setFtpForm({ ...ftpForm, scheduleTimes: nextTimes })
                        }}
                        className="min-w-0 flex-1 rounded-lg border border-gray-300 px-2 py-2 text-sm"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const nextTimes = ftpForm.scheduleTimes.filter((_, currentIndex) => currentIndex !== index)
                          setFtpForm({ ...ftpForm, scheduleTimes: nextTimes.length ? nextTimes : ['06:00'] })
                        }}
                        className="rounded-lg px-2 py-2 text-gray-400 hover:bg-white hover:text-red-600"
                        title="Remover horário"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="border-t border-gray-200 bg-gray-50 px-6 py-4 text-sm text-gray-600">
              O arquivo será enviado para o computador/servidor FTP configurado na rede, dentro da pasta informada acima.
            </div>

            <div className="flex flex-wrap justify-end gap-3 px-6 py-4">
              <button
                onClick={() => {
                  setFtpForm(null)
                  setEditingFtpScheduleId(null)
                }}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={testFtpConnection}
                disabled={ftpBusy}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-60"
              >
                Testar destino
              </button>
              <button
                onClick={scheduleFtpExport}
                disabled={ftpBusy}
                className="rounded-lg border border-orange-300 px-4 py-2 text-sm font-semibold text-orange-700 hover:bg-orange-50 disabled:opacity-60"
              >
                {editingFtpScheduleId ? 'Salvar edição' : 'Agendar até 24/dia'}
              </button>
              <button
                onClick={sendFtpReportNow}
                disabled={ftpBusy}
                className="rounded-lg bg-orange-600 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-700 disabled:opacity-60"
              >
                {ftpBusy ? 'Enviando...' : 'Enviar agora'}
              </button>
            </div>
          </div>
        </div>
      )}

      {reportForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4">
          <div className="flex max-h-[calc(100vh-2rem)] w-full max-w-3xl flex-col rounded-2xl bg-white shadow-2xl">
            <div className="flex shrink-0 items-start justify-between border-b border-gray-200 px-6 py-5">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Gerar relatório de {reportMeta[reportForm.type].label}</h2>
                <p className="mt-1 text-sm text-gray-500">{reportMeta[reportForm.type].description}</p>
              </div>
              <button onClick={closeModal} className="rounded-lg p-2 hover:bg-gray-100">
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto">
              <div className="grid gap-5 p-6 md:grid-cols-2">
                <Field label="Máquina">
                  <select
                    value={reportForm.machineId}
                    onChange={(event) => setReportForm({ ...reportForm, machineId: event.target.value })}
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2"
                  >
                    {reportForm.type === 'status' ? (
                      <option value="">Selecione máquina</option>
                    ) : (
                      <option value="all">Todas as máquinas</option>
                    )}
                    {machines.map((machine) => (
                      <option key={machine.id} value={machine.id}>
                        {machine.name} ({machine.code})
                      </option>
                    ))}
                  </select>
                </Field>

              <Field label="Data inicial">
                <input
                  type="date"
                  value={reportForm.startDate}
                  onChange={(event) => setReportForm({ ...reportForm, startDate: event.target.value })}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2"
                />
              </Field>

              <Field label="Hora inicial">
                <input
                  type="time"
                  value={reportForm.startTime}
                  onChange={(event) => setReportForm({ ...reportForm, startTime: event.target.value })}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2"
                />
              </Field>

              <Field label="Data final">
                <input
                  type="date"
                  value={reportForm.endDate}
                  onChange={(event) => setReportForm({ ...reportForm, endDate: event.target.value })}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2"
                />
              </Field>

              <Field label="Hora final">
                <input
                  type="time"
                  value={reportForm.endTime}
                  onChange={(event) => setReportForm({ ...reportForm, endTime: event.target.value })}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2"
                />
              </Field>

              <Field label="Formato">
                <select
                  value={reportForm.format}
                  onChange={(event) => setReportForm({ ...reportForm, format: event.target.value as ExportFormat })}
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2"
                >
                  <option value="csv">CSV</option>
                  <option value="pdf">PDF</option>
                </select>
              </Field>

              {reportForm.type === 'downtime' && (
                <label className="flex items-center gap-3 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={reportForm.includeDowntimeReasons}
                    onChange={(event) => setReportForm({ ...reportForm, includeDowntimeReasons: event.target.checked })}
                  />
                  Incluir motivo das paradas
                </label>
              )}
              </div>

              {reportForm.type === 'production' && productionPreview && (
                <ProductionMatrixPreview matrix={productionPreview} />
              )}
              {reportForm.type === 'status' && statusPreview && (
                <StatusMatrixPreview matrix={statusPreview} />
              )}
              {reportForm.type === 'downtime' && downtimePreview && (
                <DowntimeEventsPreview report={downtimePreview} />
              )}

              {scheduleForm && (
                <div className="border-t border-gray-200 bg-gray-50 px-6 py-5">
                <div className="mb-4 flex items-center gap-2">
                  <Repeat className="h-4 w-4 text-gray-600" />
                  <h3 className="font-semibold text-gray-900">Agendar exportação</h3>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <Field label="Nome do agendamento">
                    <input
                      value={scheduleForm.name}
                      onChange={(event) => setScheduleForm({ ...scheduleForm, name: event.target.value })}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2"
                    />
                  </Field>
                  <Field label="Periodicidade">
                    <select
                      value={scheduleForm.frequency}
                      onChange={(event) => setScheduleForm({ ...scheduleForm, frequency: event.target.value as ScheduleFrequency })}
                      className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2"
                    >
                      <option value="window">Janela única</option>
                      <option value="daily">Diária</option>
                      <option value="weekly">Semanal</option>
                      <option value="monthly">Mensal</option>
                    </select>
                  </Field>
                  {scheduleForm.frequency === 'window' && (
                    <>
                      <Field label="Data da janela">
                        <input
                          type="date"
                          value={scheduleForm.windowDate}
                          onChange={(event) => setScheduleForm({ ...scheduleForm, windowDate: event.target.value })}
                          className="w-full rounded-lg border border-gray-300 px-3 py-2"
                        />
                      </Field>
                      <Field label="Início da janela">
                        <input
                          type="time"
                          value={scheduleForm.windowStartTime}
                          onChange={(event) => setScheduleForm({ ...scheduleForm, windowStartTime: event.target.value })}
                          className="w-full rounded-lg border border-gray-300 px-3 py-2"
                        />
                      </Field>
                      <Field label="Fim da janela">
                        <input
                          type="time"
                          value={scheduleForm.windowEndTime}
                          onChange={(event) => setScheduleForm({ ...scheduleForm, windowEndTime: event.target.value })}
                          className="w-full rounded-lg border border-gray-300 px-3 py-2"
                        />
                      </Field>
                    </>
                  )}
                  {scheduleForm.frequency !== 'window' && (
                    <Field label="Horário">
                      <input
                        type="time"
                        value={scheduleForm.time}
                        onChange={(event) => setScheduleForm({ ...scheduleForm, time: event.target.value })}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2"
                      />
                    </Field>
                  )}
                  {scheduleForm.frequency === 'weekly' && (
                    <Field label="Dia da semana">
                      <select
                        value={scheduleForm.dayOfWeek}
                        onChange={(event) => setScheduleForm({ ...scheduleForm, dayOfWeek: event.target.value })}
                        className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2"
                      >
                        <option value="1">Segunda-feira</option>
                        <option value="2">Terça-feira</option>
                        <option value="3">Quarta-feira</option>
                        <option value="4">Quinta-feira</option>
                        <option value="5">Sexta-feira</option>
                        <option value="6">Sábado</option>
                        <option value="0">Domingo</option>
                      </select>
                    </Field>
                  )}
                  {scheduleForm.frequency === 'monthly' && (
                    <Field label="Dia do mês">
                      <input
                        type="number"
                        min="1"
                        max="31"
                        value={scheduleForm.dayOfMonth}
                        onChange={(event) => setScheduleForm({ ...scheduleForm, dayOfMonth: event.target.value })}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2"
                      />
                    </Field>
                  )}
                  <Field label="E-mail de destino">
                    <input
                      type="email"
                      value={scheduleForm.recipient}
                      onChange={(event) => setScheduleForm({ ...scheduleForm, recipient: event.target.value })}
                      placeholder="engenharia@empresa.com"
                      className="w-full rounded-lg border border-gray-300 px-3 py-2"
                    />
                  </Field>
                </div>
                </div>
              )}
            </div>

            <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 rounded-b-2xl border-t border-gray-200 bg-white px-6 py-4">
              <div className="flex items-center gap-4 text-sm text-gray-500">
                <span className="flex items-center gap-2">
                  <CalendarDays className="h-4 w-4" />
                  {getPeriodLabel(reportForm)}
                </span>
                <span className="flex items-center gap-2">
                  <Clock3 className="h-4 w-4" />
                  Período personalizado
                </span>
              </div>
              <div className="flex flex-wrap gap-3">
                {!scheduleForm ? (
                  <>
                    <button onClick={closeModal} className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700">
                      Cancelar
                    </button>
                    <button onClick={handleOpenSchedule} className="flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700">
                      <Mail className="h-4 w-4" />
                      Agendar exportação
                    </button>
                    <button disabled={isSubmitting} onClick={handleGenerateReport} className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60">
                      {isSubmitting ? 'Gerando...' : 'Gerar prévia'}
                    </button>
                    {((reportForm.type === 'production' && productionPreview) || (reportForm.type === 'status' && statusPreview) || (reportForm.type === 'downtime' && downtimePreview)) && previewReport && (
                      <button disabled={isSubmitting} onClick={() => handleDownload(previewReport)} className="flex items-center gap-2 rounded-lg bg-gray-900 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-800 disabled:opacity-60">
                        <Download className="h-4 w-4" />
                        Baixar {reportForm.format.toUpperCase()}
                      </button>
                    )}
                    {((reportForm.type === 'production' && productionPreview) || (reportForm.type === 'status' && statusPreview) || (reportForm.type === 'downtime' && downtimePreview)) && (
                      <button
                        disabled={isSubmitting}
                        onClick={() => {
                          setProductionPreview(null)
                          setStatusPreview(null)
                          setDowntimePreview(null)
                        }}
                        className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700"
                      >
                        Refazer
                    </button>
                    )}
                  </>
                ) : (
                  <>
                    <button onClick={() => setScheduleForm(null)} className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700">
                      Voltar
                    </button>
                    <button disabled={isSubmitting} onClick={handleSaveSchedule} className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60">
                      {isSubmitting ? 'Salvando...' : 'Salvar agendamento'}
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </ProtectedLayout>
  )
}

function mapExecutionToReport(item: any): Report {
  const parameters = typeof item.parameters === 'string' ? JSON.parse(item.parameters || '{}') : {}
  const startAt = parameters.inicio_em || item.started_at
  const endAt = parameters.fim_em || item.finished_at || item.started_at
  return {
    id: item.id,
    name: `Relatório de ${reportMeta[item.report_type as ReportType]?.label || item.report_type}`,
    type: item.report_type,
    period: `${new Date(startAt).toLocaleString('pt-BR')} a ${new Date(endAt).toLocaleString('pt-BR')}`,
    machine: parameters.machine_id || 'Todas as máquinas',
    machineId: parameters.machine_id || null,
    startAt,
    endAt,
    status: item.status === 'concluido' ? 'ready' : item.status === 'executando' ? 'generating' : 'scheduled',
    format: item.format,
  }
}

function mapReportSchedule(item: any): ReportSchedule {
  const parameters = typeof item.parameters === 'string' ? JSON.parse(item.parameters || '{}') : (item.parameters || {})
  return {
    id: Number(item.id),
    name: item.name || item.nome || 'Agendamento FTP',
    type: item.report_type as ReportType,
    machineId: parameters.machine_id ? String(parameters.machine_id) : null,
    startAt: parameters.inicio_em || new Date().toISOString(),
    endAt: parameters.fim_em || new Date().toISOString(),
    format: (String(item.format || 'csv').toLowerCase() as 'csv' | 'xml' | 'pdf'),
    periodicity: (item.periodicity || item.periodicidade || 'daily') as ScheduleFrequency,
    time: String(item.time || item.horario || '').slice(0, 5),
    destination: item.destination || item.destino || parameters.destino || '',
    active: item.active ?? item.ativo ?? true,
    nextRunAt: item.next_run_at || item.proxima_execucao_em || null,
    lastRunAt: item.last_run_at || item.ultima_execucao_em || null,
  }
}

function normalizeProductionMatrix(raw: any): ProductionMatrix {
  const shifts = raw?.shifts ?? raw?.Shifts ?? []
  const rows = raw?.rows ?? raw?.Rows ?? []
  const visibleShifts = shifts
    .map((shift: any) => ({
      key: shift.key ?? shift.Key,
      name: shift.name ?? shift.Name,
      code: shift.code ?? shift.Code,
      startTime: shift.startTime ?? shift.StartTime,
      endTime: shift.endTime ?? shift.EndTime,
    }))
  return {
    success: Boolean(raw?.success ?? raw?.Success),
    reportType: raw?.reportType ?? raw?.report_type ?? raw?.ReportType ?? 'production',
    machine: raw?.machine ?? raw?.Machine ?? 'Todas as máquinas',
    startAt: raw?.startAt ?? raw?.StartAt,
    endAt: raw?.endAt ?? raw?.EndAt,
    shifts: visibleShifts,
    rows: rows.map((row: any) => ({
      hour: row.hour ?? row.Hour,
      values: row.values ?? row.Values ?? {},
      outsideShift: Number(row.outsideShift ?? row.OutsideShift ?? 0),
      total: Number(row.total ?? row.Total ?? 0),
    })),
    totals: raw?.totals ?? raw?.Totals ?? {},
    outsideShiftTotal: Number(raw?.outsideShiftTotal ?? raw?.OutsideShiftTotal ?? 0),
    grandTotal: Number(raw?.grandTotal ?? raw?.GrandTotal ?? 0),
  }
}

function normalizeStatusMatrix(raw: any): StatusMatrix {
  const rows = raw?.rows ?? raw?.Rows ?? []
  const totals = raw?.totals ?? raw?.Totals ?? {}
  return {
    success: Boolean(raw?.success ?? raw?.Success),
    reportType: raw?.reportType ?? raw?.ReportType ?? 'status',
    machine: raw?.machine ?? raw?.Machine ?? 'Todas as máquinas',
    startAt: raw?.startAt ?? raw?.StartAt,
    endAt: raw?.endAt ?? raw?.EndAt,
    rows: rows.map((row: any) => {
      const values = row.values ?? row.Values ?? {}
      return {
        hour: row.hour ?? row.Hour,
        values: {
          productionMinutes: Number(values.productionMinutes ?? values.ProductionMinutes ?? 0),
          idleMinutes: Number(values.idleMinutes ?? values.IdleMinutes ?? 0),
          maintenanceMinutes: Number(values.maintenanceMinutes ?? values.MaintenanceMinutes ?? 0),
          inactiveMinutes: Number(values.inactiveMinutes ?? values.InactiveMinutes ?? 0),
          totalMinutes: Number(values.totalMinutes ?? values.TotalMinutes ?? 0),
        },
      }
    }),
    totals: {
      productionHours: Number(totals.productionHours ?? totals.ProductionHours ?? 0),
      idleHours: Number(totals.idleHours ?? totals.IdleHours ?? 0),
      maintenanceHours: Number(totals.maintenanceHours ?? totals.MaintenanceHours ?? 0),
      inactiveHours: Number(totals.inactiveHours ?? totals.InactiveHours ?? 0),
      totalHours: Number(totals.totalHours ?? totals.TotalHours ?? 0),
    },
  }
}

function normalizeDowntimeEvents(raw: any): DowntimeEventsReport {
  const items = raw?.items ?? raw?.Items ?? []
  return {
    success: Boolean(raw?.success ?? raw?.Success),
    reportType: raw?.reportType ?? raw?.ReportType ?? 'downtime',
    machine: raw?.machine ?? raw?.Machine ?? 'Todas as máquinas',
    startAt: raw?.startAt ?? raw?.StartAt,
    endAt: raw?.endAt ?? raw?.EndAt,
    items: items.map((item: any) => ({
      machineId: String(item.machineId ?? item.MachineId ?? ''),
      triggerAt: item.triggerAt ?? item.TriggerAt,
      recoveryAt: item.recoveryAt ?? item.RecoveryAt,
      reason: item.reason ?? item.Reason ?? 'Sem motivo',
      category: item.category ?? item.Category ?? '',
      totalSeconds: Number(item.totalSeconds ?? item.TotalSeconds ?? 0),
      totalMinutes: Number(item.totalMinutes ?? item.TotalMinutes ?? 0),
    })),
    count: Number(raw?.count ?? raw?.Count ?? items.length),
    totalMinutes: Number(raw?.totalMinutes ?? raw?.TotalMinutes ?? 0),
  }
}

function ProductionMatrixPreview({ matrix }: { matrix: ProductionMatrix }) {
  return (
    <div className="border-t border-gray-200 bg-gray-50 px-6 py-5">
      <div className="mb-4 flex flex-col gap-1 md:flex-row md:items-end md:justify-between">
        <div>
          <h3 className="text-lg font-bold text-gray-900">Prévia da produção por turno</h3>
          <p className="text-sm text-gray-500">
            {matrix.machine} · {new Date(matrix.startAt).toLocaleString('pt-BR')} até {new Date(matrix.endAt).toLocaleString('pt-BR')}
          </p>
        </div>
        <div className="text-sm font-semibold text-gray-700">
          Total: {formatNumber(matrix.grandTotal)}
        </div>
      </div>

      <div className="max-h-[420px] overflow-auto rounded-xl border border-gray-300 bg-white">
        <table className="min-w-full border-collapse text-sm">
          <thead>
            <tr className="bg-gray-100 text-left text-xs uppercase tracking-wide text-gray-600">
              <th className="sticky top-0 z-10 border border-gray-300 bg-gray-100 px-3 py-2">Hora</th>
              {matrix.shifts.map((shift) => (
                <th key={shift.key} className="sticky top-0 z-10 border border-gray-300 bg-gray-100 px-3 py-2">
                  <span className="block font-bold">{shift.name}</span>
                  <span className="block text-[11px] font-normal normal-case text-gray-500">
                    {formatShiftWindow(matrix.startAt, shift)}
                  </span>
                </th>
              ))}
              <th className="sticky top-0 z-10 border border-gray-300 bg-gray-100 px-3 py-2">Total</th>
            </tr>
          </thead>
          <tbody>
            {matrix.rows.map((row) => (
              <tr key={row.hour} className="odd:bg-white even:bg-gray-50">
                <td className="border border-gray-300 px-3 py-2 font-medium text-gray-900">{row.hour}</td>
                {matrix.shifts.map((shift) => (
                  <td key={shift.key} className="border border-gray-300 px-3 py-2 text-right">
                    {formatMatrixValue(row.values[shift.key] ?? 0)}
                  </td>
                ))}
                <td className="border border-gray-300 px-3 py-2 text-right font-semibold">{formatMatrixValue(row.total)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-gray-900 text-white">
              <td className="border border-gray-700 px-3 py-2 font-semibold">Total</td>
              {matrix.shifts.map((shift) => (
                <td key={shift.key} className="border border-gray-700 px-3 py-2 text-right font-semibold">
                  {formatNumber(matrix.totals[shift.key] ?? 0)}
                </td>
              ))}
              <td className="border border-gray-700 px-3 py-2 text-right font-semibold">{formatNumber(matrix.grandTotal)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  )
}

function openProductionPdf(matrix: ProductionMatrix, report: Report) {
  const shiftHeaders = matrix.shifts
    .map((shift) => `<th>${escapeHtml(shift.name)}<br><small>${escapeHtml(formatShiftWindow(matrix.startAt, shift))}</small></th>`)
    .join('')
  const rows = matrix.rows.map((row) => `
    <tr>
      <td>${escapeHtml(row.hour)}</td>
      ${matrix.shifts.map((shift) => `<td class="number">${formatMatrixValue(row.values[shift.key] ?? 0)}</td>`).join('')}
      <td class="number">${formatMatrixValue(row.total)}</td>
    </tr>
  `).join('')
  const totals = matrix.shifts
    .map((shift) => `<td class="number">${formatNumber(matrix.totals[shift.key] ?? 0)}</td>`)
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
        <title>${escapeHtml(report.name)}</title>
        <style>
          body { font-family: Arial, sans-serif; color: #111827; margin: 32px; }
          h1 { margin: 0 0 6px; font-size: 24px; }
          p { margin: 0 0 18px; color: #4b5563; }
          table { border-collapse: collapse; width: 100%; font-size: 12px; }
          th, td { border: 1px solid #111827; padding: 7px 9px; }
          th { background: #f3f4f6; text-align: left; }
          tfoot td { background: #111827; color: #fff; font-weight: 700; }
          .number { text-align: right; }
          .strong { font-weight: 700; }
          @media print { body { margin: 16mm; } }
        </style>
      </head>
      <body>
        <h1>${escapeHtml(report.name)}</h1>
        <p>${escapeHtml(matrix.machine)} · ${new Date(matrix.startAt).toLocaleString('pt-BR')} até ${new Date(matrix.endAt).toLocaleString('pt-BR')}</p>
        <table>
          <thead>
            <tr><th>Hora</th>${shiftHeaders}<th>Total</th></tr>
          </thead>
          <tbody>${rows}</tbody>
          <tfoot>
            <tr><td>Total</td>${totals}<td class="number">${formatNumber(matrix.grandTotal)}</td></tr>
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

function StatusMatrixPreview({ matrix }: { matrix: StatusMatrix }) {
  return (
    <div className="border-t border-gray-200 bg-gray-50 px-6 py-5">
      <div className="mb-4 flex flex-col gap-1 md:flex-row md:items-end md:justify-between">
        <div>
          <h3 className="text-lg font-bold text-gray-900">Prévia do status por hora</h3>
          <p className="text-sm text-gray-500">
            {matrix.machine} · {new Date(matrix.startAt).toLocaleString('pt-BR')} até {new Date(matrix.endAt).toLocaleString('pt-BR')}
          </p>
        </div>
        <div className="text-sm font-semibold text-gray-700">
          Total: {formatNumber(matrix.totals.totalHours)} h
        </div>
      </div>

      <div className="max-h-[420px] overflow-auto rounded-xl border border-gray-300 bg-white">
        <table className="min-w-full border-collapse text-sm">
          <thead>
            <tr className="bg-gray-100 text-left text-xs uppercase tracking-wide text-gray-600">
              <th className="sticky top-0 z-10 border border-gray-300 bg-gray-100 px-3 py-2">Hora</th>
              <th className="sticky top-0 z-10 border border-gray-300 bg-gray-100 px-3 py-2">Produzindo (min)</th>
              <th className="sticky top-0 z-10 border border-gray-300 bg-gray-100 px-3 py-2">Ociosa (min)</th>
              <th className="sticky top-0 z-10 border border-gray-300 bg-gray-100 px-3 py-2">Manutenção (min)</th>
              <th className="sticky top-0 z-10 border border-gray-300 bg-gray-100 px-3 py-2">Inativa (min)</th>
              <th className="sticky top-0 z-10 border border-gray-300 bg-gray-100 px-3 py-2">Total (min)</th>
            </tr>
          </thead>
          <tbody>
            {matrix.rows.map((row) => (
              <tr key={row.hour} className={row.values.totalMinutes > 0 ? 'bg-emerald-50' : 'odd:bg-white even:bg-gray-50'}>
                <td className="border border-gray-300 px-3 py-2 font-medium text-gray-900">{row.hour}</td>
                <td className="border border-gray-300 px-3 py-2 text-right">{formatMatrixValue(row.values.productionMinutes)}</td>
                <td className="border border-gray-300 px-3 py-2 text-right">{formatMatrixValue(row.values.idleMinutes)}</td>
                <td className="border border-gray-300 px-3 py-2 text-right">{formatMatrixValue(row.values.maintenanceMinutes)}</td>
                <td className="border border-gray-300 px-3 py-2 text-right">{formatMatrixValue(row.values.inactiveMinutes)}</td>
                <td className="border border-gray-300 px-3 py-2 text-right font-semibold">{formatMatrixValue(row.values.totalMinutes)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-gray-900 text-white">
              <td className="border border-gray-700 px-3 py-2 font-semibold">Total (horas)</td>
              <td className="border border-gray-700 px-3 py-2 text-right font-semibold">{formatNumber(matrix.totals.productionHours)}</td>
              <td className="border border-gray-700 px-3 py-2 text-right font-semibold">{formatNumber(matrix.totals.idleHours)}</td>
              <td className="border border-gray-700 px-3 py-2 text-right font-semibold">{formatNumber(matrix.totals.maintenanceHours)}</td>
              <td className="border border-gray-700 px-3 py-2 text-right font-semibold">{formatNumber(matrix.totals.inactiveHours)}</td>
              <td className="border border-gray-700 px-3 py-2 text-right font-semibold">{formatNumber(matrix.totals.totalHours)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  )
}

function openStatusPdf(matrix: StatusMatrix, report: Report) {
  const rows = matrix.rows.map((row) => `
    <tr>
      <td>${escapeHtml(row.hour)}</td>
      <td class="number">${formatMatrixValue(row.values.productionMinutes)}</td>
      <td class="number">${formatMatrixValue(row.values.idleMinutes)}</td>
      <td class="number">${formatMatrixValue(row.values.maintenanceMinutes)}</td>
      <td class="number">${formatMatrixValue(row.values.inactiveMinutes)}</td>
      <td class="number strong">${formatMatrixValue(row.values.totalMinutes)}</td>
    </tr>
  `).join('')

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
        <title>${escapeHtml(report.name)}</title>
        <style>
          body { font-family: Arial, sans-serif; color: #111827; margin: 32px; }
          h1 { margin: 0 0 6px; font-size: 24px; }
          p { margin: 0 0 18px; color: #4b5563; }
          table { border-collapse: collapse; width: 100%; font-size: 12px; }
          th, td { border: 1px solid #111827; padding: 7px 9px; }
          th { background: #f3f4f6; text-align: left; }
          tfoot td { background: #111827; color: #fff; font-weight: 700; }
          .number { text-align: right; }
          .strong { font-weight: 700; }
          @media print { body { margin: 16mm; } }
        </style>
      </head>
      <body>
        <h1>${escapeHtml(report.name)}</h1>
        <p>${escapeHtml(matrix.machine)} · ${new Date(matrix.startAt).toLocaleString('pt-BR')} até ${new Date(matrix.endAt).toLocaleString('pt-BR')}</p>
        <table>
          <thead>
            <tr>
              <th>Hora</th>
              <th>Produzindo (min)</th>
              <th>Ociosa (min)</th>
              <th>Manutenção (min)</th>
              <th>Inativa (min)</th>
              <th>Total (min)</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
          <tfoot>
            <tr>
              <td>Total (horas)</td>
              <td class="number">${formatNumber(matrix.totals.productionHours)}</td>
              <td class="number">${formatNumber(matrix.totals.idleHours)}</td>
              <td class="number">${formatNumber(matrix.totals.maintenanceHours)}</td>
              <td class="number">${formatNumber(matrix.totals.inactiveHours)}</td>
              <td class="number">${formatNumber(matrix.totals.totalHours)}</td>
            </tr>
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

function DowntimeEventsPreview({ report }: { report: DowntimeEventsReport }) {
  return (
    <div className="border-t border-gray-200 bg-gray-50 px-6 py-5">
      <div className="mb-4 flex flex-col gap-1 md:flex-row md:items-end md:justify-between">
        <div>
          <h3 className="text-lg font-bold text-gray-900">Prévia dos eventos de parada</h3>
          <p className="text-sm text-gray-500">
            {report.machine} · {new Date(report.startAt).toLocaleString('pt-BR')} até {new Date(report.endAt).toLocaleString('pt-BR')}
          </p>
        </div>
        <div className="text-sm font-semibold text-gray-700">
          Total: {formatNumber(report.totalMinutes)} min
        </div>
      </div>

      <div className="max-h-[420px] overflow-auto rounded-xl border border-gray-300 bg-white">
        <table className="min-w-full border-collapse text-sm">
          <thead>
            <tr className="bg-gray-100 text-left text-xs uppercase tracking-wide text-gray-600">
              <th className="sticky top-0 z-10 border border-gray-300 bg-gray-100 px-3 py-2">Máquina</th>
              <th className="sticky top-0 z-10 border border-gray-300 bg-gray-100 px-3 py-2">Trigger</th>
              <th className="sticky top-0 z-10 border border-gray-300 bg-gray-100 px-3 py-2">Recovery</th>
              <th className="sticky top-0 z-10 border border-gray-300 bg-gray-100 px-3 py-2">Motivo</th>
              <th className="sticky top-0 z-10 border border-gray-300 bg-gray-100 px-3 py-2">Total (min)</th>
            </tr>
          </thead>
          <tbody>
            {report.items.length === 0 ? (
              <tr>
                <td className="border border-gray-300 px-3 py-6 text-center text-gray-500" colSpan={5}>
                  Nenhum evento de parada no período.
                </td>
              </tr>
            ) : report.items.map((item, index) => (
              <tr key={`${item.machineId}-${item.triggerAt}-${index}`} className="odd:bg-white even:bg-gray-50">
                <td className="border border-gray-300 px-3 py-2 font-medium text-gray-900">{item.machineId}</td>
                <td className="border border-gray-300 px-3 py-2">{formatDateTime(item.triggerAt)}</td>
                <td className="border border-gray-300 px-3 py-2">{formatDateTime(item.recoveryAt)}</td>
                <td className="border border-gray-300 px-3 py-2">{item.reason}</td>
                <td className="border border-gray-300 px-3 py-2 text-right font-semibold">{formatNumber(item.totalMinutes)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-gray-900 text-white">
              <td className="border border-gray-700 px-3 py-2 font-semibold" colSpan={4}>Total</td>
              <td className="border border-gray-700 px-3 py-2 text-right font-semibold">{formatNumber(report.totalMinutes)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  )
}

function openDowntimePdf(events: DowntimeEventsReport, report: Report) {
  const rows = events.items.map((item) => `
    <tr>
      <td>${escapeHtml(item.machineId)}</td>
      <td>${escapeHtml(formatDateTime(item.triggerAt))}</td>
      <td>${escapeHtml(formatDateTime(item.recoveryAt))}</td>
      <td>${escapeHtml(item.reason)}</td>
      <td class="number">${formatNumber(item.totalMinutes)}</td>
    </tr>
  `).join('')

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
        <title>${escapeHtml(report.name)}</title>
        <style>
          body { font-family: Arial, sans-serif; color: #111827; margin: 32px; }
          h1 { margin: 0 0 6px; font-size: 24px; }
          p { margin: 0 0 18px; color: #4b5563; }
          table { border-collapse: collapse; width: 100%; font-size: 12px; }
          th, td { border: 1px solid #111827; padding: 7px 9px; }
          th { background: #f3f4f6; text-align: left; }
          tfoot td { background: #111827; color: #fff; font-weight: 700; }
          .number { text-align: right; }
          @media print { body { margin: 16mm; } }
        </style>
      </head>
      <body>
        <h1>${escapeHtml(report.name)}</h1>
        <p>${escapeHtml(events.machine)} · ${new Date(events.startAt).toLocaleString('pt-BR')} até ${new Date(events.endAt).toLocaleString('pt-BR')}</p>
        <table>
          <thead>
            <tr><th>Máquina</th><th>Trigger</th><th>Recovery</th><th>Motivo</th><th>Total (min)</th></tr>
          </thead>
          <tbody>${rows || '<tr><td colspan="5">Nenhum evento de parada no período.</td></tr>'}</tbody>
          <tfoot>
            <tr><td colspan="4">Total</td><td class="number">${formatNumber(events.totalMinutes)}</td></tr>
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

function formatNumber(value: number) {
  return new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 }).format(Number(value || 0))
}

function formatDateTime(value?: string) {
  if (!value) return '-'
  return new Date(value).toLocaleString('pt-BR')
}

function formatMatrixValue(value: number) {
  return Number(value || 0) > 0 ? formatNumber(value) : '--'
}

function formatShiftWindow(startAt: string, shift: { startTime: string; endTime: string }) {
  const base = new Date(startAt)
  const start = withTime(base, shift.startTime)
  const end = withTime(base, shift.endTime)
  if (end <= start) end.setDate(end.getDate() + 1)
  return `${formatShortDate(start)} ${shift.startTime} - ${formatShortDate(end)} ${shift.endTime}`
}

function withTime(base: Date, value: string) {
  const [hours, minutes] = value.split(':').map(Number)
  const next = new Date(base)
  next.setHours(hours || 0, minutes || 0, 0, 0)
  return next
}

function formatShortDate(value: Date) {
  return value.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
}

function escapeHtml(value: string) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

function SummaryCard({ label, count, tone }: { label: string; count: number; tone: 'blue' | 'green' | 'amber' }) {
  const tones = {
    blue: 'bg-gradient-to-br from-blue-400 via-blue-500 to-indigo-600',
    green: 'bg-gradient-to-br from-emerald-400 via-green-500 to-teal-600',
    amber: 'bg-gradient-to-br from-amber-400 via-orange-500 to-orange-700',
  }

  return (
    <div className="overflow-hidden rounded-2xl shadow-sm">
      <div className={`px-6 py-4 ${tones[tone]}`}>
        <div className="mb-2 flex items-center gap-2">
          <FileText className="h-4 w-4" />
          <p className="text-xs font-semibold uppercase text-white">{label}</p>
        </div>
        <p className="text-3xl font-bold text-white">{count}</p>
      </div>
    </div>
  )
}

function ReportMachineFolderNode({
  folder,
  folders,
  machines,
  selectedMachineId,
  scheduledMachineIds,
  scheduledFolderIds,
  expandedFolderIds,
  onToggle,
  onSelectMachine,
  level,
}: {
  folder: MachineFolder
  folders: MachineFolder[]
  machines: Machine[]
  selectedMachineId: number | null
  scheduledMachineIds: Set<string>
  scheduledFolderIds: Set<number>
  expandedFolderIds: number[]
  onToggle: (folderId: number) => void
  onSelectMachine: (machine: Machine) => void
  level: number
}) {
  const childFolders = folders.filter((item) => item.parent_folder_id === folder.id)
  const childMachines = machines.filter((machine) => machine.folder_id === folder.id)
  const isExpanded = expandedFolderIds.includes(folder.id)

  return (
    <div>
      <div className="flex items-center border-b border-gray-100 text-sm" style={{ paddingLeft: 8 + level * 16 }}>
        <button
          onClick={() => onToggle(folder.id)}
          className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
          aria-label={isExpanded ? `Recolher ${folder.name}` : `Expandir ${folder.name}`}
        >
          <ChevronRight className={`h-4 w-4 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
        </button>
        <Folder className="h-4 w-4 text-orange-500" />
        <span className="min-w-0 truncate px-2 py-2 text-gray-700">{folder.name}</span>
        {scheduledFolderIds.has(folder.id) && (
          <span className="ml-auto mr-2 h-2 w-2 rounded-full bg-blue-500" title="Esta pasta tem máquina com agendamento" />
        )}
      </div>
      {isExpanded && (
        <div>
          {childFolders.map((child) => (
            <ReportMachineFolderNode
              key={child.id}
              folder={child}
              folders={folders}
              machines={machines}
              selectedMachineId={selectedMachineId}
              scheduledMachineIds={scheduledMachineIds}
              scheduledFolderIds={scheduledFolderIds}
              expandedFolderIds={expandedFolderIds}
              onToggle={onToggle}
              onSelectMachine={onSelectMachine}
              level={level + 1}
            />
          ))}
          {childMachines.map((machine) => (
            <button
              key={machine.id}
              onClick={() => onSelectMachine(machine)}
              className={`flex w-full items-center gap-2 border-b border-gray-100 px-3 py-2 text-left text-sm hover:bg-orange-50 ${
                selectedMachineId === machine.id ? 'bg-orange-50 font-semibold text-orange-700' : 'text-gray-700'
              }`}
              style={{ paddingLeft: 34 + (level + 1) * 16 }}
            >
              <Factory className="h-4 w-4" />
              <span className="min-w-0 truncate">{machine.code} · {machine.name}</span>
              {scheduledMachineIds.has(String(machine.id)) && (
                <span className="ml-auto rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-bold uppercase text-blue-700">
                  Agend.
                </span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function StatusBadge({ status }: { status: ReportStatus }) {
  const styles = {
    ready: 'bg-emerald-100 text-emerald-700',
    scheduled: 'bg-blue-100 text-blue-700',
    generating: 'bg-amber-100 text-amber-700',
  }
  const labels = {
    ready: 'Pronto',
    scheduled: 'Agendado',
    generating: 'Gerando',
  }

  return <span className={`rounded-full px-3 py-1 text-xs font-semibold ${styles[status]}`}>{labels[status]}</span>
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-semibold text-gray-700">{label}</span>
      {children}
    </label>
  )
}

function formatDate(value: string) {
  if (!value) return '-'
  const [year, month, day] = value.split('-')
  return `${day}/${month}/${year}`
}

function describeSchedule(form: ScheduleForm) {
  if (form.frequency === 'window') {
    return `Janela única em ${formatDate(form.windowDate)}, ${form.windowStartTime} às ${form.windowEndTime}`
  }
  if (form.frequency === 'daily') return `Diário às ${form.time}`
  if (form.frequency === 'weekly') {
    const days = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado']
    return `Semanal, ${days[Number(form.dayOfWeek)]} às ${form.time}`
  }
  return `Mensal, dia ${form.dayOfMonth} às ${form.time}`
}
