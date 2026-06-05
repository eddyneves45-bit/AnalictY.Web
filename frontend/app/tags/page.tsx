'use client'

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Sidebar } from '@/components/layout/sidebar'
import { useAuth } from '@/components/providers/auth-provider'
import { API_BASE_URL, apiFetch } from '@/lib/api'
import { useMesSignalR } from '@/lib/useMesSignalR'
import { formatRuntimeValue } from '@/lib/runtime-format'
import { 
  Tag, 
  Plus, 
  Trash2, 
  Edit, 
  ChevronRight,
  ArrowLeft,
  Folder,
  Home,
  Search,
  X
} from 'lucide-react'

interface TagConfig {
  id: number
  folderId?: number | null
  folder_id?: number | null
  tagName: string
  dataType: string
  driverType: string
  persistenceMode?: 'mes' | 'telemetry'
  persistence_mode?: 'mes' | 'telemetry'
  address: string
  opcuaConnectionId?: number | null
  opcua_connection_id?: number | null
  pollIntervalMs: number
  mqttConnectionId?: number | null
  mqtt_connection_id?: number | null
  isActive: boolean
  createdAt: string
  updatedAt: string
}

interface MachineFolder {
  id: number
  name: string
  parent_folder_id: number | null
}

interface TagRuntimeState {
  tagId: number
  value: any
  quality: string
  timestamp: string
  connected: boolean
  tagName?: string
}

export default function TagsPage() {
  const router = useRouter()
  const { token } = useAuth()
  const [tags, setTags] = useState<TagConfig[]>([])
  const [runtimeStates, setRuntimeStates] = useState<TagRuntimeState[]>([])
  const [folders, setFolders] = useState<MachineFolder[]>([])
  const [expandedFolderIds, setExpandedFolderIds] = useState<number[]>([])
  const [isTreeCollapsed, setIsTreeCollapsed] = useState(false)
  const [currentFolderId, setCurrentFolderId] = useState<number | null | 'all'>('all')
  const [draggedTagId, setDraggedTagId] = useState<number | null>(null)
  const [dragOverFolderId, setDragOverFolderId] = useState<number | null | 'root'>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editingTag, setEditingTag] = useState<TagConfig | null>(null)
  const [formData, setFormData] = useState<any>({})
  const [saving, setSaving] = useState(false)
  const [tagSearchQuery, setTagSearchQuery] = useState('')

  useEffect(() => {
    loadTags()
    loadFolders()
  }, [token])

  useMesSignalR({
    onRuntimeSnapshot: (snapshot) => setRuntimeStates(snapshot as TagRuntimeState[]),
    onRuntimeUpdate: (update) => setRuntimeStates((previous) => {
      const runtimeState = update as TagRuntimeState
      const exists = previous.some((item) => item.tagId === runtimeState.tagId)
      return exists
        ? previous.map((item) => item.tagId === runtimeState.tagId ? runtimeState : item)
        : [...previous, runtimeState]
    }),
    enabled: !!token,
  })

  const loadTags = async () => {
    if (!token) return

    setIsLoading(true)
    try {
      const response = await apiFetch(`${API_BASE_URL}/api/config/tags`, {
        
      })

      if (response.ok) {
        const data: TagConfig[] = await response.json()
        console.log("Tags recebidas do backend:", data)
        setTags(data || [])
      } else {
        setError('Erro ao carregar TAGs')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar TAGs')
    } finally {
      setIsLoading(false)
    }
  }

  const loadFolders = async () => {
    if (!token) return
    try {
      const response = await apiFetch(`${API_BASE_URL}/api/machine-folders`, {
        
      })
      if (response.ok) {
        const data = await response.json()
        const normalizedFolders = (data || []).map((item: any) => ({
          id: item.id,
          name: item.name,
          parent_folder_id: item.parent_folder_id ?? item.parentFolderId ?? item.ParentFolderId ?? null,
        }))
        setFolders(normalizedFolders)
        setExpandedFolderIds((previous) =>
          previous.length === 0
            ? normalizedFolders.map((folder: MachineFolder) => folder.id)
            : Array.from(new Set([...previous, ...normalizedFolders.map((folder: MachineFolder) => folder.id)])),
        )
      }
    } catch (err) {
      console.error('Erro ao carregar pastas:', err)
    }
  }

  const openCreateModal = () => {
    setEditingTag(null)
    setFormData({
      tag_name: '',
      data_type: 'Double',
      driver_type: 'OPCUA',
      persistence_mode: 'mes',
      address: '',
      opcua_connection_id: null,
      mqtt_connection_id: null,
      folder_id: currentFolderId === 'all' ? null : currentFolderId,
      poll_interval_ms: 1000,
      is_active: true
    })
    setModalOpen(true)
  }

  const openEditModal = (tag: TagConfig) => {
    setEditingTag(tag)
    setFormData({
      id: tag.id,
      tag_name: tag.tagName,
      data_type: tag.dataType,
      driver_type: tag.driverType,
      persistence_mode: tag.persistenceMode ?? tag.persistence_mode ?? 'mes',
      address: tag.address,
      opcua_connection_id: tag.opcuaConnectionId ?? tag.opcua_connection_id ?? null,
      mqtt_connection_id: tag.mqttConnectionId ?? tag.mqtt_connection_id ?? null,
      folder_id: tag.folderId ?? tag.folder_id ?? null,
      poll_interval_ms: tag.pollIntervalMs,
      is_active: tag.isActive
    })
    setModalOpen(true)
  }

  const handleSave = async () => {
    if (!token) return
    setSaving(true)

    try {
      const isUpdate = editingTag !== null
      const url = isUpdate 
        ? `${API_BASE_URL}/api/config/tags/${editingTag.id}`
        : `${API_BASE_URL}/api/config/tags`
      const method = isUpdate ? 'PUT' : 'POST'
      
      console.log("Salvando tag:", { isUpdate, method, url, payload: formData })
      
      const response = await apiFetch(url, {
        method: method,
        headers: {          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      })

      const data = await response.json()
      if (response.ok) {
        setModalOpen(false)
        loadTags()
      } else {
        setError(data.message || data.detail || 'Erro ao salvar TAG')
      }
    } catch (err) {
      setError('Erro ao salvar TAG')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (tagId: number) => {
    if (!token) return
    if (!window.confirm('Deseja realmente excluir esta TAG?')) return

    try {
      const response = await apiFetch(`${API_BASE_URL}/api/config/tags/${tagId}`, {
        method: 'DELETE',
        
      })

      if (response.ok) {
        loadTags()
      } else {
        setError('Erro ao excluir TAG')
      }
    } catch (err) {
      setError('Erro ao excluir TAG')
    }
  }

  const moveTagToFolder = async (tag: TagConfig, folderId: number | null) => {
    if (!token) return

    const previousTags = tags
    const updatedTag = { ...tag, folderId, folder_id: folderId }
    setTags((currentTags) => currentTags.map((item) => item.id === tag.id ? updatedTag : item))
    setError('')

    try {
      const response = await apiFetch(`${API_BASE_URL}/api/config/tags/${tag.id}`, {
        method: 'PUT',
        headers: {          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          id: tag.id,
          tag_name: tag.tagName,
          data_type: tag.dataType,
          driver_type: tag.driverType,
          persistence_mode: tag.persistenceMode ?? tag.persistence_mode ?? 'mes',
          address: tag.address,
          opcua_connection_id: tag.opcuaConnectionId ?? tag.opcua_connection_id ?? null,
          mqtt_connection_id: tag.mqttConnectionId ?? tag.mqtt_connection_id ?? null,
          folder_id: folderId,
          poll_interval_ms: tag.pollIntervalMs,
          is_active: tag.isActive,
        })
      })

      const data = await response.json()
      if (!response.ok) {
        setTags(previousTags)
        setError(data.message || data.detail || 'Erro ao mover TAG')
        return
      }

      loadTags()
    } catch (err) {
      setTags(previousTags)
      setError('Erro ao mover TAG')
    }
  }

  const handleTagDragStart = (event: React.DragEvent<HTMLTableRowElement>, tag: TagConfig) => {
    setDraggedTagId(tag.id)
    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.setData('text/plain', String(tag.id))
  }

  const handleTagDragEnd = () => {
    setDraggedTagId(null)
    setDragOverFolderId(null)
  }

  const handleDropTagOnFolder = (event: React.DragEvent, folderId: number | null) => {
    event.preventDefault()
    const tagId = Number(event.dataTransfer.getData('text/plain') || draggedTagId)
    const tag = tags.find((item) => item.id === tagId)
    setDraggedTagId(null)
    setDragOverFolderId(null)

    if (!tag) return
    const currentTagFolderId = tag.folderId ?? tag.folder_id ?? null
    if (currentTagFolderId === folderId) return

    void moveTagToFolder(tag, folderId)
  }

  const visibleTags = currentFolderId === 'all'
    ? tags
    : tags.filter((tag) => (tag.folderId ?? tag.folder_id ?? null) === currentFolderId)
  const normalizedTagSearchQuery = tagSearchQuery.trim().toLowerCase()
  const filteredTags = normalizedTagSearchQuery
    ? visibleTags.filter((tag) => [
      tag.tagName,
      tag.address,
      tag.driverType,
      tag.dataType,
      (tag.persistenceMode ?? tag.persistence_mode ?? 'mes') === 'telemetry' ? 'telemetria' : 'mes',
      tag.isActive ? 'ativa' : 'inativa',
    ].some((value) => String(value || '').toLowerCase().includes(normalizedTagSearchQuery)))
    : visibleTags
  const rootFolders = folders.filter((folder) => folder.parent_folder_id === null)

  const toggleFolder = (folderId: number) => {
    setExpandedFolderIds((previous) =>
      previous.includes(folderId)
        ? previous.filter((id) => id !== folderId)
        : [...previous, folderId],
    )
  }

  const collapseAllFolders = () => {
    setExpandedFolderIds([])
  }

  const expandAllFolders = () => {
    setExpandedFolderIds(folders.map((folder) => folder.id))
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <Sidebar />
      <main className="ml-64 min-h-screen p-4">
        <div className="space-y-3">
          {/* Header */}
          <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => router.back()}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <ArrowLeft className="h-5 w-5 text-gray-600" />
                </button>
                <Tag className="h-8 w-8 text-blue-600" />
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">Gestão de TAGs</h1>
                  <p className="text-sm text-gray-500">Configure e gerencie todas as TAGs do sistema</p>
                </div>
              </div>
              <button
                onClick={openCreateModal}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors"
              >
                <Plus className="h-4 w-4" />
                Nova TAG
              </button>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 rounded-xl border border-red-200 p-4">
              <p className="text-red-800">{error}</p>
            </div>
          )}

          <div className={`grid min-h-0 gap-3 lg:h-[calc(100vh-132px)] ${isTreeCollapsed ? 'lg:grid-cols-[48px_minmax(0,1fr)]' : 'lg:grid-cols-[220px_minmax(0,1fr)]'}`}>
            <div className={`min-h-0 rounded-xl border border-gray-200 bg-white shadow-sm ${isTreeCollapsed ? 'p-2' : 'p-3'}`}>
              <div className={`mb-3 flex items-center ${isTreeCollapsed ? 'justify-center' : 'justify-between gap-2'}`}>
                {!isTreeCollapsed && <h2 className="text-sm font-semibold uppercase text-gray-500">Estrutura</h2>}
                <button
                  onClick={() => setIsTreeCollapsed((previous) => !previous)}
                  className="rounded-lg border border-gray-200 p-2 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-800"
                  title={isTreeCollapsed ? 'Mostrar árvore' : 'Encolher árvore'}
                  aria-label={isTreeCollapsed ? 'Mostrar árvore de diretórios' : 'Encolher árvore de diretórios'}
                >
                  <ChevronRight className={`h-4 w-4 transition-transform ${isTreeCollapsed ? '' : 'rotate-180'}`} />
                </button>
              </div>
              {isTreeCollapsed ? (
                <div className="flex flex-col items-center gap-2">
                  <button
                    onClick={() => setCurrentFolderId('all')}
                    className={`rounded-lg p-2 transition-colors hover:bg-gray-100 ${currentFolderId === 'all' ? 'bg-blue-50 text-blue-600' : 'text-gray-600'}`}
                    title="Todas"
                    aria-label="Todas as TAGs"
                  >
                    <Tag className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => setCurrentFolderId(null)}
                    className={`rounded-lg p-2 transition-colors hover:bg-gray-100 ${currentFolderId === null ? 'bg-blue-50 text-blue-600' : 'text-gray-600'}`}
                    title="Raiz"
                    aria-label="TAGs na raiz"
                  >
                    <Home className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <div className="flex h-[calc(100%-44px)] min-h-0 flex-col space-y-3">
                  <div className="flex gap-2">
                    <button
                      onClick={collapseAllFolders}
                      className="flex-1 rounded-lg border border-gray-200 px-2 py-1.5 text-xs font-semibold text-gray-600 transition-colors hover:bg-gray-100"
                    >
                      Recolher
                    </button>
                    <button
                      onClick={expandAllFolders}
                      className="flex-1 rounded-lg border border-gray-200 px-2 py-1.5 text-xs font-semibold text-gray-600 transition-colors hover:bg-gray-100"
                    >
                      Expandir
                    </button>
                  </div>
                  <div className="min-h-0 space-y-1 overflow-y-auto pr-1">
                    <button
                      onClick={() => setCurrentFolderId('all')}
                      className={`flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm hover:bg-gray-100 ${currentFolderId === 'all' ? 'bg-blue-50 font-semibold text-blue-600' : 'text-gray-700'}`}
                    >
                      <Tag className="h-4 w-4" />
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
                      onDrop={(event) => handleDropTagOnFolder(event, null)}
                      className={`flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm hover:bg-gray-100 ${
                        dragOverFolderId === 'root'
                          ? 'bg-green-50 ring-2 ring-green-300'
                          : currentFolderId === null
                            ? 'bg-blue-50 font-semibold text-blue-600'
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
                        onToggle={toggleFolder}
                        dragOverFolderId={dragOverFolderId}
                        onDragOverFolder={setDragOverFolderId}
                        onDropTag={handleDropTagOnFolder}
                      />
                    ))}
                  </div>
                </div>
              )}
              </div>

            {/* Table */}
            <div className="flex min-h-0 flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
              <div className="shrink-0 border-b border-gray-200 bg-white p-3">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div className="relative w-full md:max-w-sm">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      value={tagSearchQuery}
                      onChange={(event) => setTagSearchQuery(event.target.value)}
                      placeholder="Pesquisar TAG por nome, endereço, driver..."
                      className="w-full rounded-lg border border-gray-300 py-2 pl-9 pr-10 text-sm text-gray-900 outline-none transition-colors placeholder:text-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    />
                    {tagSearchQuery && (
                      <button
                        type="button"
                        onClick={() => setTagSearchQuery('')}
                        className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700"
                        aria-label="Limpar pesquisa"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                  <div className="text-sm text-gray-500">
                    Exibindo <span className="font-semibold text-gray-700">{filteredTags.length}</span> de <span className="font-semibold text-gray-700">{visibleTags.length}</span> TAGs
                  </div>
                </div>
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden">
              <table className="w-full table-fixed text-xs">
                <colgroup>
                  <col className="w-[17%]" />
                  <col className="w-[10%]" />
                  <col className="w-[10%]" />
                  <col className="w-[7%]" />
                  <col className="w-[9%]" />
                  <col className="w-[22%]" />
                  <col className="w-[6%]" />
                  <col className="w-[7%]" />
                  <col className="w-[6%]" />
                  <col className="w-[6%]" />
                </colgroup>
                <thead className="bg-gray-50 border-b border-gray-200 sticky top-0 z-10">
                  <tr>
                    <th className="px-2 py-2 text-left font-semibold uppercase text-gray-900">Nome</th>
                    <th className="px-2 py-2 text-left font-semibold uppercase text-gray-900">Valor</th>
                    <th className="px-2 py-2 text-left font-semibold uppercase text-gray-900">Qualid.</th>
                    <th className="px-2 py-2 text-left font-semibold uppercase text-gray-900">Driver</th>
                    <th className="px-2 py-2 text-left font-semibold uppercase text-gray-900">Classe</th>
                    <th className="px-2 py-2 text-left font-semibold uppercase text-gray-900">Endereço</th>
                    <th className="px-2 py-2 text-left font-semibold uppercase text-gray-900">Tipo</th>
                    <th className="px-2 py-2 text-left font-semibold uppercase text-gray-900">Poll</th>
                    <th className="px-2 py-2 text-left font-semibold uppercase text-gray-900">Status</th>
                    <th className="px-2 py-2 text-right font-semibold uppercase text-gray-900">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {isLoading ? (
                    <tr>
                      <td colSpan={10} className="px-6 py-12 text-center text-gray-500">
                        Carregando...
                      </td>
                    </tr>
                  ) : filteredTags.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="px-6 py-12 text-center text-gray-500">
                        Nenhuma TAG encontrada
                      </td>
                    </tr>
                  ) : (
                    filteredTags.map((tag) => {
                      const runtimeState = runtimeStates.find(s => s.tagId === tag.id)
                      return (
                        <tr
                          key={tag.id}
                          draggable
                          onDragStart={(event) => handleTagDragStart(event, tag)}
                          onDragEnd={handleTagDragEnd}
                          className={`cursor-move hover:bg-gray-50 ${draggedTagId === tag.id ? 'opacity-50' : ''}`}
                          title="Arraste esta TAG para uma pasta da estrutura"
                        >
                          <td className="px-2 py-2">
                            <div className="truncate font-semibold text-gray-900" title={tag.tagName}>{tag.tagName}</div>
                          </td>
                          <td className="px-2 py-2">
                            <div className="truncate font-mono text-gray-900" title={formatRuntimeValue(runtimeState?.value)}>
                              {formatRuntimeValue(runtimeState?.value)}
                            </div>
                          </td>
                          <td className="px-2 py-2">
                            <span className={`inline-block max-w-full truncate rounded px-1.5 py-0.5 font-semibold ${
                              runtimeState?.quality === 'GOOD' ? 'bg-green-100 text-green-800' :
                              runtimeState?.quality === 'BAD' ? 'bg-red-100 text-red-800' :
                              runtimeState?.quality === 'STALE' ? 'bg-yellow-100 text-yellow-800' :
                              runtimeState?.quality === 'DISCONNECTED' ? 'bg-gray-100 text-gray-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {runtimeState?.quality || 'UNKNOWN'}
                            </span>
                          </td>
                          <td className="px-2 py-2">
                            <span className={`inline-block max-w-full truncate rounded px-1.5 py-0.5 font-semibold ${
                              tag.driverType === 'MQTT' ? 'bg-orange-100 text-orange-800' : 
                              tag.driverType === 'OPCUA' ? 'bg-green-100 text-green-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {tag.driverType}
                            </span>
                          </td>
                          <td className="px-2 py-2">
                            <span className={`inline-block max-w-full truncate rounded px-1.5 py-0.5 font-semibold ${
                              (tag.persistenceMode ?? tag.persistence_mode ?? 'mes') === 'telemetry'
                                ? 'bg-sky-100 text-sky-800'
                                : 'bg-violet-100 text-violet-800'
                            }`}>
                              {(tag.persistenceMode ?? tag.persistence_mode ?? 'mes') === 'telemetry' ? 'Telemetria' : 'MES'}
                            </span>
                          </td>
                          <td className="px-2 py-2">
                            <div className="truncate font-mono text-gray-900" title={tag.address}>{tag.address}</div>
                          </td>
                          <td className="truncate px-2 py-2 text-gray-900" title={tag.dataType}>
                            {tag.dataType}
                          </td>
                          <td className="truncate px-2 py-2 text-gray-900">
                            {tag.pollIntervalMs}ms
                          </td>
                          <td className="px-2 py-2">
                            <span className={`inline-block max-w-full truncate rounded px-1.5 py-0.5 font-semibold ${
                              tag.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                            }`}>
                              {tag.isActive ? 'Ativa' : 'Inativa'}
                            </span>
                          </td>
                          <td className="px-2 py-2 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                onClick={() => openEditModal(tag)}
                                className="rounded-md p-1 text-blue-600 transition-colors hover:bg-blue-50"
                                title="Editar TAG"
                                aria-label={`Editar ${tag.tagName}`}
                              >
                                <Edit className="h-3.5 w-3.5" />
                              </button>
                              <button
                                onClick={() => handleDelete(tag.id)}
                                className="rounded-md p-1 text-red-600 transition-colors hover:bg-red-50"
                                title="Excluir TAG"
                                aria-label={`Excluir ${tag.tagName}`}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
              </div>
            </div>
          </div>
        </div>

        {/* Modal */}
        {modalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl p-6 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900">
                  {editingTag ? 'Editar TAG' : 'Nova TAG'}
                </h2>
                <button
                  onClick={() => setModalOpen(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nome *</label>
                  <input
                    type="text"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                    value={formData.tag_name || ''}
                    onChange={(e) => setFormData({...formData, tag_name: e.target.value})}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Driver *</label>
                    <select
                      className="w-full border border-gray-300 rounded-lg px-3 py-2"
                      value={formData.driver_type || 'OPCUA'}
                      onChange={(e) => setFormData({...formData, driver_type: e.target.value})}
                    >
                      <option value="OPCUA">OPC UA</option>
                      <option value="MQTT">MQTT</option>
                      <option value="WEINTEK_HTTP">Weintek HTTP</option>
                      <option value="Modbus">Modbus</option>
                      <option value="EthernetIP">Ethernet/IP</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Dado *</label>
                    <select
                      className="w-full border border-gray-300 rounded-lg px-3 py-2"
                      value={formData.data_type || 'Double'}
                      onChange={(e) => setFormData({...formData, data_type: e.target.value})}
                    >
                      <option value="Bool">Bool</option>
                      <option value="Int16">Int16</option>
                      <option value="Int32">Int32</option>
                      <option value="Int64">Int64</option>
                      <option value="Float">Float</option>
                      <option value="Double">Double</option>
                      <option value="String">String</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Classificação *</label>
                    <select
                      className="w-full border border-gray-300 rounded-lg px-3 py-2"
                      value={formData.persistence_mode || 'mes'}
                      onChange={(e) => setFormData({...formData, persistence_mode: e.target.value})}
                    >
                      <option value="mes">MES</option>
                      <option value="telemetry">Telemetria</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Endereço *</label>
                  <input
                    type="text"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                    value={formData.address || ''}
                    onChange={(e) => setFormData({...formData, address: e.target.value})}
                    placeholder="Ex: ns=2;s=Machine.Temperature"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Pasta</label>
                  <select
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                    value={formData.folder_id ?? ''}
                    onChange={(e) => setFormData({...formData, folder_id: e.target.value ? Number(e.target.value) : null})}
                  >
                    <option value="">Raiz</option>
                    {folders.map((folder) => (
                      <option key={folder.id} value={folder.id}>
                        {getFolderPath(folder, folders)}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Poll Interval (ms) *</label>
                    <input
                      type="number"
                      step="100"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2"
                      value={formData.poll_interval_ms || 1000}
                      onChange={(e) => setFormData({...formData, poll_interval_ms: parseInt(e.target.value)})}
                    />
                  </div>
                  <div className="flex items-center gap-2 pt-6">
                    <input
                      type="checkbox"
                      id="is_active"
                      checked={formData.is_active !== false}
                      onChange={(e) => setFormData({...formData, is_active: e.target.checked})}
                      className="w-4 h-4 text-blue-600 rounded"
                    />
                    <label htmlFor="is_active" className="text-sm font-medium text-gray-700">
                      TAG Ativa
                    </label>
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-4">
                  <button
                    onClick={() => setModalOpen(false)}
                    className="px-4 py-2 border border-red-600 bg-red-50 text-red-600 rounded-lg font-semibold hover:bg-red-100 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-300 transition-colors"
                  >
                    {saving ? 'Salvando...' : 'Salvar'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

function getFolderPath(folder: MachineFolder, folders: MachineFolder[]) {
  const names = [folder.name]
  let cursor = folders.find((item) => item.id === folder.parent_folder_id) ?? null
  while (cursor) {
    names.unshift(cursor.name)
    cursor = folders.find((item) => item.id === cursor?.parent_folder_id) ?? null
  }
  return names.join(' / ')
}

function FolderTreeNode({
  folder,
  folders,
  currentFolderId,
  onSelect,
  expandedFolderIds,
  onToggle,
  dragOverFolderId,
  onDragOverFolder,
  onDropTag,
  level = 0,
}: {
  folder: MachineFolder
  folders: MachineFolder[]
  currentFolderId: number | null | 'all'
  onSelect: (id: number | null | 'all') => void
  expandedFolderIds: number[]
  onToggle: (folderId: number) => void
  dragOverFolderId: number | null | 'root'
  onDragOverFolder: (folderId: number | null | 'root') => void
  onDropTag: (event: React.DragEvent, folderId: number | null) => void
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
        onDrop={(event) => onDropTag(event, folder.id)}
        className={`flex items-center rounded-lg hover:bg-gray-100 ${
          isDragOver
            ? 'bg-green-50 ring-2 ring-green-300'
            : currentFolderId === folder.id
              ? 'bg-blue-50 font-semibold text-blue-600'
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
            <span className="truncate">{folder.name}</span>
          </button>
        </div>
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
          dragOverFolderId={dragOverFolderId}
          onDragOverFolder={onDragOverFolder}
          onDropTag={onDropTag}
          level={level + 1}
        />
      ))}
    </div>
  )
}
