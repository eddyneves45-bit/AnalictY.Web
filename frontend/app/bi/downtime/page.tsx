'use client'

import { useEffect, useState } from 'react'
import { AlertTriangle, Clock, TrendingDown, Filter, BarChart3 } from 'lucide-react'

export default function Downtime() {
  const [machines, setMachines] = useState<any[]>([])
  const [selectedMachine, setSelectedMachine] = useState<number | null>(null)
  const [selectedPeriod, setSelectedPeriod] = useState<'week' | 'month' | 'quarter'>('month')
  const [downtimeData, setDowntimeData] = useState<any>(null)

  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/machines`)
      .then(res => res.json())
      .then(data => setMachines(Array.isArray(data) ? data : []))
      .catch(err => {
        console.error('Erro ao carregar máquinas:', err)
        setMachines([])
      })
  }, [])

  const handleGenerateReport = () => {
    // Implementar busca de dados de downtime histórico
    console.log('Gerar relatório de downtime histórico')
  }

  const downtimeCauses = [
    { cause: 'Falha Mecânica', count: 45, percentage: 35 },
    { cause: 'Falta de Material', count: 28, percentage: 22 },
    { cause: 'Manutenção Programada', count: 22, percentage: 17 },
    { cause: 'Falha Elétrica', count: 18, percentage: 14 },
    { cause: 'Operacional', count: 15, percentage: 12 },
  ]

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">Downtime Histórico</h1>
        <p className="text-gray-600">Timeline de paradas, pareto, MTBF, MTTR e causas principais</p>
      </div>

      {/* Filtros */}
      <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-2xl border border-orange-200 p-6 shadow-sm mb-6">
        <div className="flex items-center gap-4 mb-4">
          <AlertTriangle className="w-6 h-6 text-orange-600" />
          <h2 className="text-xl font-bold text-gray-800">Filtrar Downtime</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="text-gray-600 text-sm mb-2 block">Máquina</label>
            <select
              value={selectedMachine || ''}
              onChange={(e) => setSelectedMachine(Number(e.target.value))}
              className="bg-white border border-gray-300 rounded-lg px-4 py-2 text-gray-800 w-full focus:border-orange-500 focus:outline-none"
            >
              <option value="">Todas as máquinas</option>
              {machines.map(m => (
                <option key={m.id} value={m.id}>{m.name} ({m.code})</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-gray-600 text-sm mb-2 block">Período</label>
            <select
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value as any)}
              className="bg-white border border-gray-300 rounded-lg px-4 py-2 text-gray-800 w-full focus:border-orange-500 focus:outline-none"
            >
              <option value="week">Semana</option>
              <option value="month">Mês</option>
              <option value="quarter">Trimestre</option>
            </select>
          </div>
          <div className="flex items-end">
            <button
              onClick={handleGenerateReport}
              className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white px-6 py-2 rounded-lg transition flex items-center gap-2 w-full"
            >
              <Filter className="w-4 h-4" />
              Filtrar
            </button>
          </div>
        </div>
      </div>

      {/* Cards de Resumo */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <div className="bg-gradient-to-br from-red-500 to-red-600 text-white p-6 rounded-xl shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <Clock className="w-6 h-6" />
            <span className="text-xs uppercase opacity-80">Total</span>
          </div>
          <p className="text-2xl font-bold">128h</p>
          <p className="text-sm opacity-90">Downtime Total</p>
        </div>
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white p-6 rounded-xl shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <TrendingDown className="w-6 h-6" />
            <span className="text-xs uppercase opacity-80">MTBF</span>
          </div>
          <p className="text-2xl font-bold">45h</p>
          <p className="text-sm opacity-90">Mean Time Between Failures</p>
        </div>
        <div className="bg-gradient-to-br from-green-500 to-green-600 text-white p-6 rounded-xl shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <Clock className="w-6 h-6" />
            <span className="text-xs uppercase opacity-80">MTTR</span>
          </div>
          <p className="text-2xl font-bold">2.5h</p>
          <p className="text-sm opacity-90">Mean Time To Repair</p>
        </div>
        <div className="bg-gradient-to-br from-purple-500 to-purple-600 text-white p-6 rounded-xl shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <BarChart3 className="w-6 h-6" />
            <span className="text-xs uppercase opacity-80">OEE</span>
          </div>
          <p className="text-2xl font-bold">85%</p>
          <p className="text-sm opacity-90">Impacto no OEE</p>
        </div>
      </div>

      {/* Pareto de Causas */}
      <div className="bg-gradient-to-br from-red-50 to-red-100 border border-red-200 p-6 rounded-xl shadow-md mb-6">
        <h3 className="text-lg font-bold text-gray-800 mb-4">Pareto de Causas Principais</h3>
        <div className="space-y-4">
          {downtimeCauses.map((item, index) => (
            <div key={index} className="flex items-center gap-4">
              <div className="w-40 text-sm text-gray-600">{item.cause}</div>
              <div className="flex-1 bg-gray-200 rounded-full h-6">
                <div 
                  className={`bg-gradient-to-r ${index === 0 ? 'from-red-500 to-red-600' : index === 1 ? 'from-orange-500 to-orange-600' : 'from-yellow-500 to-yellow-600'} h-6 rounded-full transition-all relative`}
                  style={{ width: `${item.percentage}%` }}
                >
                  <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs font-bold text-white">{item.percentage}%</span>
                </div>
              </div>
              <div className="w-16 text-sm font-bold text-gray-800">{item.count}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Timeline de Paradas */}
      <div className="bg-gradient-to-br from-gray-50 to-gray-100 border border-gray-200 p-6 rounded-xl shadow-md">
        <h3 className="text-lg font-bold text-gray-800 mb-4">Timeline de Paradas Recentes</h3>
        <div className="space-y-3">
          <div className="flex items-start gap-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <AlertTriangle className="w-5 h-5 text-red-500 mt-1" />
            <div className="flex-1">
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-semibold text-gray-800">Falha Mecânica - Máquina 01</p>
                  <p className="text-sm text-gray-600">Bomba principal parou devido a desgaste</p>
                </div>
                <span className="text-xs text-gray-500">Hoje, 14:30</span>
              </div>
              <div className="mt-2 flex gap-4 text-sm">
                <span className="text-red-600 font-medium">Duração: 2h 30min</span>
                <span className="text-gray-600">Impacto: 150 unidades</span>
              </div>
            </div>
          </div>
          <div className="flex items-start gap-4 p-4 bg-orange-50 border border-orange-200 rounded-lg">
            <AlertTriangle className="w-5 h-5 text-orange-500 mt-1" />
            <div className="flex-1">
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-semibold text-gray-800">Falta de Material - Máquina 03</p>
                  <p className="text-sm text-gray-600">Estoque de matéria-prima insuficiente</p>
                </div>
                <span className="text-xs text-gray-500">Hoje, 10:15</span>
              </div>
              <div className="mt-2 flex gap-4 text-sm">
                <span className="text-orange-600 font-medium">Duração: 1h 15min</span>
                <span className="text-gray-600">Impacto: 80 unidades</span>
              </div>
            </div>
          </div>
          <div className="flex items-start gap-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <AlertTriangle className="w-5 h-5 text-blue-500 mt-1" />
            <div className="flex-1">
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-semibold text-gray-800">Manutenção Programada - Máquina 02</p>
                  <p className="text-sm text-gray-600">Troca preventiva de rolamentos</p>
                </div>
                <span className="text-xs text-gray-500">Ontem, 08:00</span>
              </div>
              <div className="mt-2 flex gap-4 text-sm">
                <span className="text-blue-600 font-medium">Duração: 4h 00min</span>
                <span className="text-gray-600">Impacto: 300 unidades</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
