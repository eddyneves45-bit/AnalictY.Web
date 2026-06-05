'use client'

import { useEffect, useState, type ReactNode } from 'react'
import { ArrowLeft, Clock3, Edit, Plus, Trash2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { ProtectedLayout } from '@/components/layout/protected-layout'
import { API_BASE_URL, apiFetch } from '@/lib/api'

interface Shift {
  id: number | null
  codigo: string
  nome: string
  hora_inicio: string
  hora_fim: string
  ativo: boolean
  contabilizar_producao: boolean
}

const emptyShift = (): Shift => ({
  id: null,
  codigo: '',
  nome: '',
  hora_inicio: '06:00',
  hora_fim: '14:00',
  ativo: true,
  contabilizar_producao: true,
})

export default function ShiftsPage() {
  const router = useRouter()
  const [items, setItems] = useState<Shift[]>([])
  const [form, setForm] = useState<Shift>(emptyShift())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    loadShifts()
  }, [])

  const loadShifts = async () => {
    setLoading(true)
    try {
      const response = await apiFetch(`${API_BASE_URL}/api/config/shifts`)
      if (!response.ok) {
        throw new Error('Erro ao carregar turnos')
      }
      const data = await response.json()
      setItems(
        data.map((item: any) => ({
          id: item.id,
          codigo: item.codigo,
          nome: item.nome,
          hora_inicio: normalizeTime(item.hora_inicio),
          hora_fim: normalizeTime(item.hora_fim),
          ativo: item.ativo,
          contabilizar_producao: item.contabilizar_producao ?? true,
        })),
      )
      setError('')
    } catch (caughtError) {
      console.error(caughtError)
      setError('Não foi possível carregar os turnos.')
    } finally {
      setLoading(false)
    }
  }

  const saveShift = async () => {
    try {
      const response = await apiFetch(`${API_BASE_URL}/api/config/shifts`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (!response.ok) {
        const data = await response.json().catch(() => null)
        throw new Error(data?.message || 'Erro ao salvar turno')
      }
      setForm(emptyShift())
      await loadShifts()
    } catch (caughtError) {
      console.error(caughtError)
      setError(caughtError instanceof Error ? caughtError.message : 'Erro ao salvar turno')
    }
  }

  const deleteShift = async (id: number | null) => {
    if (!id) return
    if (!window.confirm('Excluir este turno?')) return

    try {
      const response = await apiFetch(`${API_BASE_URL}/api/config/shifts/${id}`, {
        method: 'DELETE',
      })
      if (!response.ok) {
        const data = await response.json().catch(() => null)
        throw new Error(data?.message || 'Erro ao excluir turno')
      }
      await loadShifts()
    } catch (caughtError) {
      console.error(caughtError)
      setError(caughtError instanceof Error ? caughtError.message : 'Erro ao excluir turno')
    }
  }

  return (
    <ProtectedLayout>
      <div className="space-y-6">
        <header className="flex items-center gap-4">
          <button onClick={() => router.back()} className="rounded-lg p-2 hover:bg-gray-100">
            <ArrowLeft className="h-5 w-5 text-gray-600" />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Turnos</h1>
            <p className="mt-1 text-gray-600">Configure as janelas operacionais usadas nos relatórios e no BI.</p>
          </div>
        </header>

        {error && (
          <section className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700">
            {error}
          </section>
        )}

        <section className="rounded-xl border border-gray-200 bg-white">
          <div className="flex items-center gap-3 border-b border-gray-200 px-5 py-4">
            <Clock3 className="h-5 w-5 text-emerald-600" />
            <div>
              <h2 className="font-semibold text-gray-900">{form.id ? 'Editar turno' : 'Novo turno'}</h2>
              <p className="text-sm text-gray-500">Turnos podem atravessar a meia-noite, por exemplo 22:00 até 06:00.</p>
            </div>
          </div>
          <div className="grid gap-4 p-5 md:grid-cols-[120px_1fr_130px_130px_auto]">
            <Field label="Código">
              <input value={form.codigo} onChange={(e) => setForm({ ...form, codigo: e.target.value })} className="w-full rounded-xl border border-gray-300 px-4 py-2 text-gray-900 focus:border-red-500 focus:outline-none" />
            </Field>
            <Field label="Nome">
              <input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} className="w-full rounded-xl border border-gray-300 px-4 py-2 text-gray-900 focus:border-red-500 focus:outline-none" />
            </Field>
            <Field label="Início">
              <input type="time" value={form.hora_inicio} onChange={(e) => setForm({ ...form, hora_inicio: e.target.value })} className="w-full rounded-xl border border-gray-300 px-4 py-2 text-gray-900 focus:border-red-500 focus:outline-none" />
            </Field>
            <Field label="Fim">
              <input type="time" value={form.hora_fim} onChange={(e) => setForm({ ...form, hora_fim: e.target.value })} className="w-full rounded-xl border border-gray-300 px-4 py-2 text-gray-900 focus:border-red-500 focus:outline-none" />
            </Field>
            <div className="flex items-end gap-3">
              <label className="flex h-11 items-center gap-2 rounded-xl border border-gray-200 px-3 text-sm text-gray-700">
                <input type="checkbox" checked={form.ativo} onChange={(e) => setForm({ ...form, ativo: e.target.checked })} />
                Ativo
              </label>
              <label className="flex h-11 items-center gap-2 rounded-xl border border-gray-200 px-3 text-sm text-gray-700">
                <input type="checkbox" checked={form.contabilizar_producao} onChange={(e) => setForm({ ...form, contabilizar_producao: e.target.checked })} />
                Contagem
              </label>
              <button onClick={saveShift} className="flex h-11 items-center gap-2 rounded-xl bg-red-600 px-4 font-medium text-white hover:bg-red-700">
                <Plus className="h-4 w-4" />
                Salvar
              </button>
            </div>
          </div>
        </section>

        <section className="rounded-xl border border-gray-200 bg-white">
          <div className="border-b border-gray-200 px-5 py-4">
            <h2 className="font-semibold text-gray-900">Turnos cadastrados</h2>
          </div>
          {loading ? (
            <div className="px-5 py-6 text-sm text-gray-500">Carregando...</div>
          ) : items.length === 0 ? (
            <div className="px-5 py-6 text-sm text-gray-500">Nenhum turno cadastrado.</div>
          ) : (
            <div className="divide-y divide-gray-200">
              {items.map((item) => (
                <div key={item.id} className="grid gap-4 px-5 py-4 md:grid-cols-[120px_1fr_180px_120px_120px_auto] md:items-center">
                  <div className="font-semibold text-gray-900">{item.codigo}</div>
                  <div>
                    <div className="font-medium text-gray-900">{item.nome}</div>
                    <div className="text-sm text-gray-500">{item.hora_inicio} - {item.hora_fim}</div>
                  </div>
                  <div className="text-sm text-gray-600">
                    {crossesMidnight(item) ? 'Atravessa meia-noite' : 'Mesmo dia'}
                  </div>
                  <div className={item.ativo ? 'text-sm font-medium text-emerald-700' : 'text-sm text-gray-500'}>
                    {item.ativo ? 'Ativo' : 'Inativo'}
                  </div>
                  <div className={item.contabilizar_producao ? 'text-sm font-medium text-blue-700' : 'text-sm text-gray-500'}>
                    {item.contabilizar_producao ? 'Conta' : 'Não conta'}
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => setForm(item)} className="rounded-lg border border-gray-300 p-2 text-gray-600 hover:border-red-500 hover:text-red-600" title="Editar turno">
                      <Edit className="h-4 w-4" />
                    </button>
                    <button onClick={() => deleteShift(item.id)} className="rounded-lg border border-gray-300 p-2 text-gray-600 hover:border-red-500 hover:text-red-600" title="Excluir turno">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </ProtectedLayout>
  )
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="space-y-2">
      <span className="text-sm font-medium text-gray-600">{label}</span>
      {children}
    </label>
  )
}

function normalizeTime(value: string) {
  return value?.slice(0, 5) || ''
}

function crossesMidnight(shift: Shift) {
  return shift.hora_fim <= shift.hora_inicio
}
