'use client'

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ProtectedLayout } from '@/components/layout/protected-layout'
import {
  ArrowLeft,
  ChevronRight,
  Edit,
  Factory,
  Folder,
  FolderPlus,
  Home,
  Plus,
  Search,
  Settings,
  Trash2,
  X,
} from 'lucide-react'
import { API_BASE_URL, apiFetch } from '@/lib/api'
import { useAuth } from '@/components/providers/auth-provider'

type MachineForm = {
  id: number | null
  folder_id: number | null
  name: string
  code: string
  cost_center: string
  location: string
  opcua_node_id: string
  mqtt_topic: string
  is_active: boolean
}

type MachineFolder = {
  id: number
  name: string
  parent_folder_id: number | null
  is_sector: boolean
}

const normalizeMachine = (item: any): MachineForm => ({
  id: item.id ?? null,
  folder_id: item.folder_id ?? item.folderId ?? item.FolderId ?? null,
  name: item.name ?? '',
  code: item.code ?? '',
  cost_center: item.cost_center ?? item.costCenter ?? item.CostCenter ?? '',
  location: item.location ?? '',
  opcua_node_id: item.opcua_node_id ?? item.opcuaNodeId ?? item.OpcuaNodeId ?? '',
  mqtt_topic: item.mqtt_topic ?? item.mqttTopic ?? item.MqttTopic ?? '',
  is_active: item.is_active ?? item.isActive ?? item.IsActive ?? true,
})

const normalizeFolder = (item: any): MachineFolder => ({
  id: item.id,
  name: item.name,
  parent_folder_id: item.parent_folder_id ?? item.parentFolderId ?? item.ParentFolderId ?? null,
  is_sector: item.is_sector ?? item.isSector ?? item.IsSector ?? false,
})

const createEmptyForm = (): MachineForm => ({
  id: null,
  folder_id: null,
  name: '',
  code: '',
  cost_center: '',
  location: '',
  opcua_node_id: '',
  mqtt_topic: '',
  is_active: true,
})

const DEFAULT_FOLDER_CARD_SIZE = { width: 360, height: 118 }
const MIN_FOLDER_CARD_SIZE = { width: 260, height: 96 }
const MAX_FOLDER_CARD_SIZE = { width: 720, height: 280 }
const FOLDER_CARD_SIZE_STORAGE_KEY = 'iiot-folder-card-size'

function getFolderPath(folder: MachineFolder, folders: MachineFolder[]) {
  const names = [folder.name]
  let cursor = folders.find((item) => item.id === folder.parent_folder_id) ?? null
  while (cursor) {
    names.unshift(cursor.name)
    cursor = folders.find((item) => item.id === cursor?.parent_folder_id) ?? null
  }
  return names.join(' / ')
}

function clampNumber(value: number, min: number, max: number) {
  if (!Number.isFinite(value)) return min
  return Math.min(Math.max(value, min), max)
}

export default function MachinesPage() {
  const router = useRouter()
  const { token } = useAuth()
  const [loading, setLoading] = useState(true)
  const [machines, setMachines] = useState<MachineForm[]>([])
  const [folders, setFolders] = useState<MachineFolder[]>([])
  const [expandedFolderIds, setExpandedFolderIds] = useState<number[]>([])
  const [currentFolderId, setCurrentFolderId] = useState<number | null | 'all'>('all')
  const [draggedMachineId, setDraggedMachineId] = useState<number | null>(null)
  const [dragOverFolderId, setDragOverFolderId] = useState<number | null | 'root'>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [folderCardSize, setFolderCardSize] = useState(DEFAULT_FOLDER_CARD_SIZE)

  const [showMachineModal, setShowMachineModal] = useState(false)
  const [showFolderModal, setShowFolderModal] = useState(false)
  const [editingFolder, setEditingFolder] = useState<MachineFolder | null>(null)
  const [newFolderName, setNewFolderName] = useState('')
  const [newFolderIsSector, setNewFolderIsSector] = useState(false)
  const [form, setForm] = useState<MachineForm>(createEmptyForm())
  const [notification, setNotification] = useState<{ show: boolean; message: string; type: 'success' | 'error' }>({
    show: false,
    message: '',
    type: 'success',
  })

  useEffect(() => {
    if (!token) return
    loadWorkspace()
  }, [token])

  useEffect(() => {
    const savedSize = window.localStorage.getItem(FOLDER_CARD_SIZE_STORAGE_KEY)
    if (!savedSize) return

    try {
      const parsed = JSON.parse(savedSize)
      setFolderCardSize({
        width: clampNumber(Number(parsed.width), MIN_FOLDER_CARD_SIZE.width, MAX_FOLDER_CARD_SIZE.width),
        height: clampNumber(Number(parsed.height), MIN_FOLDER_CARD_SIZE.height, MAX_FOLDER_CARD_SIZE.height),
      })
    } catch {
      window.localStorage.removeItem(FOLDER_CARD_SIZE_STORAGE_KEY)
    }
  }, [])

  async function loadWorkspace() {
    try {
      const headers = {}
      const [machinesResponse, foldersResponse] = await Promise.all([
        apiFetch(`${API_BASE_URL}/api/machines`, { headers }),
        apiFetch(`${API_BASE_URL}/api/machine-folders`, { headers }),
      ])
      const [machinesData, foldersData] = await Promise.all([machinesResponse.json(), foldersResponse.json()])
      const normalizedFolders = foldersData.map(normalizeFolder)
      setMachines(machinesData.map(normalizeMachine))
      setFolders(normalizedFolders)
      setExpandedFolderIds((previous) =>
        previous.length === 0
          ? normalizedFolders.map((folder: MachineFolder) => folder.id)
          : Array.from(new Set([...previous, ...normalizedFolders.map((folder: MachineFolder) => folder.id)])),
      )
    } catch (err) {
      console.error(err)
      showNotification('Erro ao carregar máquinas', 'error')
    } finally {
      setLoading(false)
    }
  }

  function handleNewMachine() {
    setForm({ ...createEmptyForm(), folder_id: currentFolderId === 'all' ? null : currentFolderId })
    setShowMachineModal(true)
  }

  function handleEditMachine(machine: MachineForm) {
    setForm(normalizeMachine(machine))
    setShowMachineModal(true)
  }

  async function handleSaveMachine() {
    try {
      if (!form.name.trim() || !form.code.trim() || !form.cost_center.trim()) {
        showNotification('Preencha nome, código e centro de custo', 'error')
        return
      }

      const headers = {        'Content-Type': 'application/json',
      }
      const payload = {
        name: form.name.trim(),
        code: form.code.trim(),
        cost_center: form.cost_center.trim(),
        location: form.location.trim(),
        is_active: form.is_active === true,
        folder_id: form.folder_id,
      }

      const response = await apiFetch(
        form.id ? `${API_BASE_URL}/api/machines/${form.id}` : `${API_BASE_URL}/api/machines`,
        {
          method: form.id ? 'PUT' : 'POST',
          headers,
          body: JSON.stringify(payload),
        },
      )

      if (!response.ok) {
        throw new Error(await getResponseErrorMessage(response, form.id ? 'Erro ao atualizar máquina' : 'Erro ao cadastrar máquina'))
      }

      showNotification(form.id ? 'Máquina atualizada com sucesso' : 'Máquina cadastrada com sucesso', 'success')
      setShowMachineModal(false)
      await loadWorkspace()
    } catch (err: any) {
      console.error(err)
      showNotification(err.message || 'Erro ao salvar máquina', 'error')
    }
  }

  async function handleCreateFolder() {
    try {
      if (!newFolderName.trim()) {
        showNotification('Informe o nome da pasta', 'error')
        return
      }

      const response = await apiFetch(`${API_BASE_URL}/api/machine-folders`, {
        method: 'POST',
        headers: {          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: newFolderName.trim(),
          parent_folder_id: currentFolderId,
          is_sector: newFolderIsSector,
        }),
      })

      if (!response.ok) {
        throw new Error(await getResponseErrorMessage(response, 'Erro ao criar pasta'))
      }

      setShowFolderModal(false)
      setNewFolderName('')
      setNewFolderIsSector(false)
      await loadWorkspace()
      showNotification('Pasta criada com sucesso', 'success')
    } catch (err: any) {
      console.error(err)
      showNotification(err.message || 'Erro ao criar pasta', 'error')
    }
  }

  function handleEditFolder(folder: MachineFolder) {
    setEditingFolder(folder)
    setNewFolderName(folder.name)
    setNewFolderIsSector(folder.is_sector)
    setShowFolderModal(true)
  }

  async function handleSaveFolder() {
    if (editingFolder) {
      await handleUpdateFolder()
      return
    }

    await handleCreateFolder()
  }

  async function handleUpdateFolder() {
    try {
      if (!editingFolder || !newFolderName.trim()) {
        showNotification('Informe o nome da pasta', 'error')
        return
      }

      const response = await apiFetch(`${API_BASE_URL}/api/machine-folders/${editingFolder.id}`, {
        method: 'PUT',
        headers: {          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: newFolderName.trim(),
          parent_folder_id: editingFolder.parent_folder_id,
          is_sector: newFolderIsSector,
        }),
      })

      if (!response.ok) {
        throw new Error(await getResponseErrorMessage(response, 'Erro ao atualizar pasta'))
      }

      setShowFolderModal(false)
      setEditingFolder(null)
      setNewFolderName('')
      setNewFolderIsSector(false)
      await loadWorkspace()
      showNotification('Pasta atualizada com sucesso', 'success')
    } catch (err: any) {
      console.error(err)
      showNotification(err.message || 'Erro ao atualizar pasta', 'error')
    }
  }

  async function handleDeleteFolder(folder: MachineFolder) {
    if (!confirm(`Excluir a pasta "${folder.name}"? A pasta precisa estar vazia.`)) return

    try {
      const response = await apiFetch(`${API_BASE_URL}/api/machine-folders/${folder.id}`, {
        method: 'DELETE',
        
      })
      if (!response.ok) {
        throw new Error(await getResponseErrorMessage(response, 'Erro ao excluir pasta'))
      }

      if (currentFolderId === folder.id) {
        setCurrentFolderId(folder.parent_folder_id)
      }
      await loadWorkspace()
      showNotification('Pasta excluída com sucesso', 'success')
    } catch (err: any) {
      console.error(err)
      showNotification(err.message || 'Erro ao excluir pasta', 'error')
    }
  }

  async function handleDeleteMachine(id: number) {
    if (!confirm('Tem certeza que deseja desativar esta máquina?')) return

    try {
      const response = await apiFetch(`${API_BASE_URL}/api/machines/${id}`, {
        method: 'DELETE',
        
      })
      if (!response.ok) {
        throw new Error(await getResponseErrorMessage(response, 'Erro ao desativar máquina'))
      }
      showNotification('Máquina desativada com sucesso', 'success')
      await loadWorkspace()
    } catch (err: any) {
      console.error(err)
      showNotification(err.message || 'Erro ao desativar máquina', 'error')
    }
  }

  async function moveMachineToFolder(machine: MachineForm, folderId: number | null) {
    if (!machine.id) return

    const previousMachines = machines
    const updatedMachine = { ...machine, folder_id: folderId }
    setMachines((currentMachines) => currentMachines.map((item) => item.id === machine.id ? updatedMachine : item))

    try {
      const response = await apiFetch(`${API_BASE_URL}/api/machines/${machine.id}`, {
        method: 'PUT',
        headers: {          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: machine.name.trim(),
          code: machine.code.trim(),
          cost_center: machine.cost_center.trim(),
          location: machine.location.trim(),
          is_active: machine.is_active === true,
          folder_id: folderId,
        }),
      })

      if (!response.ok) {
        throw new Error(await getResponseErrorMessage(response, 'Erro ao mover máquina'))
      }

      await loadWorkspace()
      showNotification('Máquina movida com sucesso', 'success')
    } catch (err: any) {
      setMachines(previousMachines)
      showNotification(err.message || 'Erro ao mover máquina', 'error')
    }
  }

  function handleMachineDragStart(event: React.DragEvent<HTMLDivElement>, machine: MachineForm) {
    if (!machine.id) return
    setDraggedMachineId(machine.id)
    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.setData('text/plain', String(machine.id))
  }

  function handleMachineDragEnd() {
    setDraggedMachineId(null)
    setDragOverFolderId(null)
  }

  function handleDropMachineOnFolder(event: React.DragEvent, folderId: number | null) {
    event.preventDefault()
    const machineId = Number(event.dataTransfer.getData('text/plain') || draggedMachineId)
    const machine = machines.find((item) => item.id === machineId)
    setDraggedMachineId(null)
    setDragOverFolderId(null)

    if (!machine || machine.folder_id === folderId) return

    void moveMachineToFolder(machine, folderId)
  }

  function handleFolderCardResizeStart(event: React.PointerEvent<HTMLButtonElement>) {
    event.preventDefault()
    event.stopPropagation()

    const startX = event.clientX
    const startY = event.clientY
    const startSize = folderCardSize

    const handleMove = (moveEvent: PointerEvent) => {
      const nextSize = {
        width: clampNumber(startSize.width + moveEvent.clientX - startX, MIN_FOLDER_CARD_SIZE.width, MAX_FOLDER_CARD_SIZE.width),
        height: clampNumber(startSize.height + moveEvent.clientY - startY, MIN_FOLDER_CARD_SIZE.height, MAX_FOLDER_CARD_SIZE.height),
      }
      setFolderCardSize(nextSize)
      window.localStorage.setItem(FOLDER_CARD_SIZE_STORAGE_KEY, JSON.stringify(nextSize))
    }

    const handleUp = () => {
      window.removeEventListener('pointermove', handleMove)
      window.removeEventListener('pointerup', handleUp)
    }

    window.addEventListener('pointermove', handleMove)
    window.addEventListener('pointerup', handleUp)
  }

  async function getResponseErrorMessage(response: Response, fallback: string) {
    const body = await response.json().catch(() => null)
    return body?.message || body?.detail || body || fallback
  }

  function showNotification(message: string, type: 'success' | 'error') {
    setNotification({ show: true, message, type })
    setTimeout(() => setNotification({ show: false, message: '', type: 'success' }), 3000)
  }

  const currentFolder = folders.find((folder) => folder.id === currentFolderId) ?? null
  const breadcrumbs = (() => {
    const path: MachineFolder[] = []
    let cursor = currentFolder
    while (cursor) {
      path.unshift(cursor)
      cursor = folders.find((folder) => folder.id === cursor?.parent_folder_id) ?? null
    }
    return path
  })()
  const search = searchTerm.toLowerCase()
  const visibleFolders = currentFolderId === 'all'
    ? []
    : folders.filter(
      (folder) => folder.parent_folder_id === currentFolderId && folder.name.toLowerCase().includes(search),
    )
  const visibleMachines = machines.filter(
    (machine) =>
      (currentFolderId === 'all' || machine.folder_id === currentFolderId) &&
      (machine.name.toLowerCase().includes(search) ||
        machine.code.toLowerCase().includes(search) ||
        machine.cost_center.toLowerCase().includes(search)),
  )
  const rootFolders = folders.filter((folder) => folder.parent_folder_id === null)
  const structurePanelWidth = Math.min(
    Math.max(280, Math.max(...folders.map((folder) => folder.name.length), 0) * 9 + 240),
    760,
  )

  if (loading) {
    return (
      <ProtectedLayout>
        <div className="rounded-2xl border border-gray-200 bg-white p-8 text-gray-600 shadow-sm">Carregando máquinas...</div>
      </ProtectedLayout>
    )
  }

  return (
    <ProtectedLayout>
      <div className="space-y-6">
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <button onClick={() => router.back()} className="rounded-lg p-2 transition-colors hover:bg-gray-100">
                <ArrowLeft className="h-5 w-5 text-gray-600" />
              </button>
              <Factory className="h-8 w-8 text-gray-600" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Gestão de Máquinas</h1>
                <p className="text-sm text-gray-500">Organize máquinas por pastas e subpastas</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowFolderModal(true)}
                className="flex items-center gap-2 rounded-xl border border-gray-300 px-4 py-2 text-gray-700 transition-colors hover:border-red-500 hover:text-red-600"
              >
                <FolderPlus className="h-5 w-5" />
                Nova Pasta
              </button>
              <button
                onClick={handleNewMachine}
                className="flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2 text-white transition-colors hover:bg-red-700"
              >
                <Plus className="h-5 w-5" />
                Adicionar Máquina
              </button>
            </div>
          </div>
        </div>

        <div
          className="grid gap-6"
          style={{ gridTemplateColumns: `minmax(280px, ${structurePanelWidth}px) minmax(0, 1fr)` }}
        >
          <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
            <h2 className="mb-3 text-sm font-semibold uppercase text-gray-500">Estrutura</h2>
            <div className="max-h-[620px] space-y-1 overflow-y-auto pr-1">
              <button
                onClick={() => setCurrentFolderId('all')}
                className={`flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm hover:bg-gray-100 ${currentFolderId === 'all' ? 'bg-red-50 font-semibold text-red-600' : 'text-gray-700'}`}
              >
                <Factory className="h-4 w-4" />
                Todas
              </button>
              <button
                onClick={() => setCurrentFolderId(null)}
                onDragOver={(event) => {
                  event.preventDefault()
                  event.dataTransfer.dropEffect = 'move'
                  setDragOverFolderId('root')
                }}
                onDragLeave={() => setDragOverFolderId(null)}
                onDrop={(event) => handleDropMachineOnFolder(event, null)}
                className={`flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm hover:bg-gray-100 ${
                  dragOverFolderId === 'root'
                    ? 'bg-green-50 ring-2 ring-green-300'
                    : currentFolderId === null
                      ? 'bg-red-50 font-semibold text-red-600'
                      : 'text-gray-700'
                }`}
              >
                <Home className="h-4 w-4" />
                Raiz
              </button>
              {rootFolders.map((folder) => (
                <FolderTreeNode
                  key={folder.id}
                  folder={folder}
                  folders={folders}
                  currentFolderId={currentFolderId}
                  onSelect={setCurrentFolderId}
                  expandedFolderIds={expandedFolderIds}
                  onToggle={(folderId) =>
                    setExpandedFolderIds((previous) =>
                      previous.includes(folderId)
                        ? previous.filter((id) => id !== folderId)
                        : [...previous, folderId],
                    )
                  }
                  onEdit={handleEditFolder}
                  onDelete={handleDeleteFolder}
                  dragOverFolderId={dragOverFolderId}
                  onDragOverFolder={setDragOverFolderId}
                  onDropMachine={handleDropMachineOnFolder}
                />
              ))}
            </div>
          </div>

          <div className="space-y-6">
            <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
              <div className="mb-4 flex flex-wrap items-center gap-2 text-sm text-gray-600">
                <button
                  onClick={() => setCurrentFolderId(null)}
                  className={`flex items-center gap-2 rounded-lg px-2 py-1 hover:bg-gray-100 ${currentFolderId === null ? 'font-semibold text-red-600' : ''}`}
                >
                  <Home className="h-4 w-4" />
                  Raiz
                </button>
                {breadcrumbs.map((folder) => (
                  <React.Fragment key={folder.id}>
                    <ChevronRight className="h-4 w-4 text-gray-400" />
                    <button
                      onClick={() => setCurrentFolderId(folder.id)}
                      className={`rounded-lg px-2 py-1 hover:bg-gray-100 ${folder.id === currentFolderId ? 'font-semibold text-red-600' : ''}`}
                    >
                      {folder.name}
                    </button>
                  </React.Fragment>
                ))}
              </div>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Buscar nesta pasta..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full rounded-xl border border-gray-300 bg-white py-2 pl-10 pr-10 text-gray-900 shadow-sm focus:border-red-500 focus:outline-none"
                />
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <X className="h-5 w-5" />
                  </button>
                )}
              </div>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-white shadow-sm">
              {visibleFolders.length === 0 && visibleMachines.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  <Factory className="mx-auto mb-4 h-16 w-16 text-gray-300" />
                  <p>Nenhuma pasta ou máquina encontrada</p>
                </div>
              ) : (
                <div>
                  {visibleFolders.length > 0 && (
                    <div
                      className="grid gap-4 p-6"
                      style={{ gridTemplateColumns: `repeat(auto-fill, minmax(${folderCardSize.width}px, 1fr))` }}
                    >
                      {visibleFolders.map((folder) => (
                    <div
                      key={folder.id}
                      className="relative flex w-full items-center justify-between rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition-colors hover:border-amber-300 hover:bg-amber-50/40"
                      style={{ minHeight: folderCardSize.height }}
                    >
                      <button onClick={() => setCurrentFolderId(folder.id)} className="flex items-center gap-3 text-left">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-amber-100">
                          <Folder className="h-7 w-7 text-amber-500" />
                        </div>
                        <div className="min-w-0">
                          <h3 className="truncate text-lg font-bold text-gray-900">{folder.name}</h3>
                          <p className="text-sm text-gray-500">Pasta</p>
                        </div>
                      </button>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleEditFolder(folder)}
                          className="rounded-lg border border-gray-300 p-2 text-gray-600 transition-colors hover:border-red-500 hover:text-red-600"
                          title="Editar pasta"
                        >
                          <Edit className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => handleDeleteFolder(folder)}
                          className="rounded-lg border border-gray-300 p-2 text-gray-600 transition-colors hover:border-red-500 hover:text-red-600"
                          title="Excluir pasta"
                        >
                          <Trash2 className="h-5 w-5" />
                        </button>
                        <button onClick={() => setCurrentFolderId(folder.id)} className="rounded-lg p-2 text-gray-400 hover:text-gray-600">
                          <ChevronRight className="h-5 w-5" />
                        </button>
                      </div>
                      <button
                        type="button"
                        onPointerDown={handleFolderCardResizeStart}
                        className="absolute bottom-2 right-2 h-5 w-5 cursor-nwse-resize rounded border border-gray-300 bg-white/90 text-gray-400 shadow-sm hover:border-red-400 hover:text-red-500"
                        title="Arraste para ajustar largura e altura dos cards"
                        aria-label="Ajustar tamanho dos cards de pasta"
                      >
                        <span className="block h-full w-full bg-[linear-gradient(135deg,transparent_0_45%,currentColor_46%_52%,transparent_53%_61%,currentColor_62%_68%,transparent_69%)]" />
                      </button>
                    </div>
                      ))}
                    </div>
                  )}
                  <div className={visibleFolders.length > 0 ? 'divide-y divide-gray-200 border-t border-gray-200' : 'divide-y divide-gray-200'}>
                  {visibleMachines.map((machine) => (
                    <div
                      key={machine.id}
                      draggable
                      onDragStart={(event) => handleMachineDragStart(event, machine)}
                      onDragEnd={handleMachineDragEnd}
                      className={`flex cursor-move items-center justify-between p-6 transition-colors hover:bg-gray-50 ${draggedMachineId === machine.id ? 'opacity-50' : ''}`}
                      title="Arraste esta máquina para uma pasta da estrutura"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <h3 className="text-lg font-bold text-gray-900">{machine.name}</h3>
                          <span
                            className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                              machine.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                            }`}
                          >
                            {machine.is_active ? 'Ativo' : 'Inativo'}
                          </span>
                        </div>
                        <div className="mt-2 space-y-1 text-sm text-gray-500">
                          <p><span className="font-medium">Código:</span> {machine.code}</p>
                          <p><span className="font-medium">Centro de Custo:</span> {machine.cost_center}</p>
                          {machine.location && <p><span className="font-medium">Setor:</span> {machine.location}</p>}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => router.push(`/machines/${machine.id}/config`)}
                          className="rounded-lg border border-gray-300 p-2 text-gray-600 transition-colors hover:border-red-500 hover:text-red-600"
                          title="Configurar TAGs"
                        >
                          <Settings className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => handleEditMachine(machine)}
                          className="rounded-lg border border-gray-300 p-2 text-gray-600 transition-colors hover:border-red-500 hover:text-red-600"
                        >
                          <Edit className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => handleDeleteMachine(machine.id!)}
                          className="rounded-lg border border-gray-300 p-2 text-gray-600 transition-colors hover:border-red-500 hover:text-red-600"
                        >
                          <Trash2 className="h-5 w-5" />
                        </button>
                      </div>
                    </div>
                  ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {showMachineModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
              <div className="mb-6">
                <h2 className="text-xl font-bold text-gray-900">{form.id ? 'Editar Máquina' : 'Nova Máquina'}</h2>
                <p className="text-sm text-gray-500">{form.id ? 'Edite os dados da máquina' : 'Cadastre uma nova máquina'}</p>
              </div>
              <div className="space-y-4">
                <Field label="Nome *" value={form.name} onChange={(name) => setForm({ ...form, name })} />
                <Field label="Código *" value={form.code} onChange={(code) => setForm({ ...form, code })} />
                <Field label="Centro de Custo *" value={form.cost_center} onChange={(cost_center) => setForm({ ...form, cost_center })} />
                <Field label="Setor" value={form.location} onChange={(location) => setForm({ ...form, location })} />
                <label className="block space-y-2">
                  <span className="text-sm font-medium text-gray-600">Pasta</span>
                  <select
                    value={form.folder_id ?? ''}
                    onChange={(e) => setForm({ ...form, folder_id: e.target.value ? Number(e.target.value) : null })}
                    className="w-full rounded-xl border border-gray-300 bg-white px-4 py-2 text-gray-900 shadow-sm focus:border-red-500 focus:outline-none"
                  >
                    <option value="">Raiz</option>
                    {folders.map((folder) => (
                      <option key={folder.id} value={folder.id}>
                        {getFolderPath(folder, folders)}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="flex items-center gap-3 rounded-xl border border-gray-200 bg-gray-50 px-4 py-2">
                  <input
                    type="checkbox"
                    checked={form.is_active === true}
                    onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                    className="h-4 w-4 rounded border-gray-300 text-red-600 focus:ring-red-500"
                  />
                  <span className="text-sm font-medium text-gray-700">Ativo</span>
                </label>
              </div>
              <div className="mt-6 flex justify-end gap-3">
                <button onClick={() => setShowMachineModal(false)} className="rounded-xl border border-gray-300 px-4 py-2 text-gray-700 hover:bg-gray-50">
                  Cancelar
                </button>
                <button onClick={handleSaveMachine} className="rounded-xl bg-red-600 px-4 py-2 text-white hover:bg-red-700">
                  Salvar
                </button>
              </div>
            </div>
          </div>
        )}

        {showFolderModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
              <div className="mb-6">
                <h2 className="text-xl font-bold text-gray-900">{editingFolder ? 'Editar Pasta' : 'Nova Pasta'}</h2>
                <p className="text-sm text-gray-500">
                  {editingFolder
                    ? getFolderPath(editingFolder, folders)
                    : `Criar dentro de ${currentFolder ? getFolderPath(currentFolder, folders) : 'Raiz'}`}
                </p>
              </div>
              <Field label="Nome da pasta" value={newFolderName} onChange={setNewFolderName} />
              <label className="mt-4 flex items-center gap-3 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
                <input
                  type="checkbox"
                  checked={newFolderIsSector}
                  onChange={(e) => setNewFolderIsSector(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-red-600 focus:ring-red-500"
                />
                <span className="text-sm font-medium text-gray-700">Esta pasta representa um setor</span>
              </label>
              <div className="mt-6 flex justify-end gap-3">
                <button
                  onClick={() => {
                    setShowFolderModal(false)
                    setEditingFolder(null)
                    setNewFolderName('')
                    setNewFolderIsSector(false)
                  }}
                  className="rounded-xl border border-gray-300 px-4 py-2 text-gray-700 hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button onClick={handleSaveFolder} className="rounded-xl bg-red-600 px-4 py-2 text-white hover:bg-red-700">
                  Salvar
                </button>
              </div>
            </div>
          </div>
        )}

        {notification.show && (
          <div className={`fixed bottom-4 right-4 rounded-xl px-4 py-3 text-white shadow-lg ${notification.type === 'success' ? 'bg-green-600' : 'bg-red-600'}`}>
            {notification.message}
          </div>
        )}
      </div>
    </ProtectedLayout>
  )
}

function Field({
  label,
  value,
  onChange,
}: {
  label: string
  value: string
  onChange: (value: string) => void
}) {
  return (
    <label className="block space-y-2">
      <span className="text-sm font-medium text-gray-600">{label}</span>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border border-gray-300 bg-white px-4 py-2 text-gray-900 shadow-sm focus:border-red-500 focus:outline-none"
      />
    </label>
  )
}

function FolderTreeNode({
  folder,
  folders,
  currentFolderId,
  onSelect,
  expandedFolderIds,
  onToggle,
  onEdit,
  onDelete,
  dragOverFolderId,
  onDragOverFolder,
  onDropMachine,
  level = 0,
}: {
  folder: MachineFolder
  folders: MachineFolder[]
  currentFolderId: number | null | 'all'
  onSelect: (id: number | null | 'all') => void
  expandedFolderIds: number[]
  onToggle: (folderId: number) => void
  onEdit: (folder: MachineFolder) => void
  onDelete: (folder: MachineFolder) => void
  dragOverFolderId: number | null | 'root'
  onDragOverFolder: (folderId: number | null | 'root') => void
  onDropMachine: (event: React.DragEvent, folderId: number | null) => void
  level?: number
}) {
  const children = folders.filter((item) => item.parent_folder_id === folder.id)
  const isExpanded = expandedFolderIds.includes(folder.id)
  const isDragOver = dragOverFolderId === folder.id

  return (
    <div>
      <div
        onDragOver={(event) => {
          event.preventDefault()
          event.dataTransfer.dropEffect = 'move'
          onDragOverFolder(folder.id)
        }}
        onDragLeave={() => onDragOverFolder(null)}
        onDrop={(event) => onDropMachine(event, folder.id)}
        className={`group flex items-center rounded-lg hover:bg-gray-100 ${
          isDragOver
            ? 'bg-green-50 ring-2 ring-green-300'
            : currentFolderId === folder.id
              ? 'bg-red-50 font-semibold text-red-600'
              : 'text-gray-700'
        }`}
      >
        <div className="flex min-w-0 flex-1 items-center" style={{ paddingLeft: `${8 + level * 18}px` }}>
          {children.length > 0 ? (
            <button
              onClick={() => onToggle(folder.id)}
              className="rounded-md p-1 text-gray-400 transition hover:bg-gray-200 hover:text-gray-700"
              title={isExpanded ? 'Recolher pasta' : 'Expandir pasta'}
              aria-label={isExpanded ? `Recolher ${folder.name}` : `Expandir ${folder.name}`}
            >
              <ChevronRight className={`h-4 w-4 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
            </button>
          ) : (
            <span className="h-6 w-6 shrink-0" />
          )}
          <button
            onClick={() => onSelect(folder.id)}
            className="flex min-w-0 flex-1 items-center gap-2 py-2 pr-2 text-left text-sm"
          >
            <Folder className="h-4 w-4 shrink-0 text-amber-500" />
            <span className="min-w-0 flex-1 whitespace-nowrap">{folder.name}</span>
          </button>
        </div>
        <button
          onClick={() => onEdit(folder)}
          className="mr-1 rounded-md p-1 text-gray-400 opacity-0 transition hover:text-red-600 group-hover:opacity-100"
          title="Editar pasta"
        >
          <Edit className="h-4 w-4" />
        </button>
        <button
          onClick={() => onDelete(folder)}
          className="mr-1 rounded-md p-1 text-gray-400 opacity-0 transition hover:text-red-600 group-hover:opacity-100"
          title="Excluir pasta"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
      {isExpanded && children.map((child) => (
        <FolderTreeNode
          key={child.id}
          folder={child}
          folders={folders}
          currentFolderId={currentFolderId}
          onSelect={onSelect}
          expandedFolderIds={expandedFolderIds}
          onToggle={onToggle}
          onEdit={onEdit}
          onDelete={onDelete}
          dragOverFolderId={dragOverFolderId}
          onDragOverFolder={onDragOverFolder}
          onDropMachine={onDropMachine}
          level={level + 1}
        />
      ))}
    </div>
  )
}
