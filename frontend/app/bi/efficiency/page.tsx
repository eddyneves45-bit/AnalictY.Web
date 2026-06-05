'use client'

import { useEffect, useState } from 'react'
import { TrendingUp, Activity, Target, Filter, LineChart } from 'lucide-react'

export default function Efficiency() {
  const [machines, setMachines] = useState<any[]>([])
  const [selectedMachine, setSelectedMachine] = useState<number | null>(null)
  const [selectedPeriod, setSelectedPeriod] = useState<'week' | 'month' | 'quarter' | 'year'>('month')
  const [efficiencyData, setEfficiencyData] = useState<any>(null)

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
    // Implementar busca de dados de eficiência histórica
    console.log('Gerar relatório de eficiência histórica')
  }

  const oeeTrend = [
    { date: '01/01', availability: 92, performance: 88, quality: 95, oee: 77 },
    { date: '08/01', availability: 90, performance: 90, quality: 94, oee: 76 },
    { date: '15/01', availability: 94, performance: 86, quality: 96, oee: 78 },
    { date: '22/01', availability: 88, performance: 92, quality: 93, oee: 75 },
    { date: '29/01', availability: 95, performance: 89, quality: 97, oee: 82 },
  ]

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">Eficiência Histórica</h1>
        <p className="text-gray-600">Tendência OEE, disponibilidade, performance, qualidade e gráficos consolidados</p>
      </div>

      {/* Filtros */}
      <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-2xl border border-purple-200 p-6 shadow-sm mb-6">
        <div className="flex items-center gap-4 mb-4">
          <TrendingUp className="w-6 h-6 text-purple-600" />
          <h2 className="text-xl font-bold text-gray-800">Filtrar Eficiência</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="text-gray-600 text-sm mb-2 block">Máquina</label>
            <select
              value={selectedMachine || ''}
              onChange={(e) => setSelectedMachine(Number(e.target.value))}
              className="bg-white border border-gray-300 rounded-lg px-4 py-2 text-gray-800 w-full focus:border-purple-500 focus:outline-none"
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
              className="bg-white border border-gray-300 rounded-lg px-4 py-2 text-gray-800 w-full focus:border-purple-500 focus:outline-none"
            >
              <option value="week">Semana</option>
              <option value="month">Mês</option>
              <option value="quarter">Trimestre</option>
              <option value="year">Ano</option>
            </select>
          </div>
          <div className="flex items-end">
            <button
              onClick={handleGenerateReport}
              className="bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white px-6 py-2 rounded-lg transition flex items-center gap-2 w-full"
            >
              <Filter className="w-4 h-4" />
              Filtrar
            </button>
          </div>
        </div>
      </div>

      {/* Cards de Resumo */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white p-6 rounded-xl shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <Activity className="w-6 h-6" />
            <span className="text-xs uppercase opacity-80">Disponibilidade</span>
          </div>
          <p className="text-2xl font-bold">92%</p>
          <p className="text-sm opacity-90">Média do Período</p>
        </div>
        <div className="bg-gradient-to-br from-green-500 to-green-600 text-white p-6 rounded-xl shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <TrendingUp className="w-6 h-6" />
            <span className="text-xs uppercase opacity-80">Performance</span>
          </div>
          <p className="text-2xl font-bold">89%</p>
          <p className="text-sm opacity-90">Média do Período</p>
        </div>
        <div className="bg-gradient-to-br from-purple-500 to-purple-600 text-white p-6 rounded-xl shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <Target className="w-6 h-6" />
            <span className="text-xs uppercase opacity-80">Qualidade</span>
          </div>
          <p className="text-2xl font-bold">95%</p>
          <p className="text-sm opacity-90">Média do Período</p>
        </div>
        <div className="bg-gradient-to-br from-orange-500 to-orange-600 text-white p-6 rounded-xl shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <LineChart className="w-6 h-6" />
            <span className="text-xs uppercase opacity-80">OEE</span>
          </div>
          <p className="text-2xl font-bold">78%</p>
          <p className="text-sm opacity-90">Média do Período</p>
        </div>
      </div>

      {/* Gráfico de Tendência OEE */}
      <div className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 p-6 rounded-xl shadow-md mb-6">
        <h3 className="text-lg font-bold text-gray-800 mb-4">Tendência OEE - Últimas 5 Semanas</h3>
        <div className="space-y-4">
          {oeeTrend.map((item, index) => (
            <div key={index} className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">{item.date}</span>
                <span className="font-bold text-gray-800">OEE: {item.oee}%</span>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-500">Disp.</span>
                    <span className="text-blue-600 font-medium">{item.availability}%</span>
                  </div>
                  <div className="bg-gray-200 rounded-full h-2">
                    <div className="bg-blue-500 h-2 rounded-full" style={{ width: `${item.availability}%` }}></div>
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-500">Perf.</span>
                    <span className="text-green-600 font-medium">{item.performance}%</span>
                  </div>
                  <div className="bg-gray-200 rounded-full h-2">
                    <div className="bg-green-500 h-2 rounded-full" style={{ width: `${item.performance}%` }}></div>
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-500">Qual.</span>
                    <span className="text-purple-600 font-medium">{item.quality}%</span>
                  </div>
                  <div className="bg-gray-200 rounded-full h-2">
                    <div className="bg-purple-500 h-2 rounded-full" style={{ width: `${item.quality}%` }}></div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Comparativo por Máquina */}
      <div className="bg-gradient-to-br from-green-50 to-green-100 border border-green-200 p-6 rounded-xl shadow-md">
        <h3 className="text-lg font-bold text-gray-800 mb-4">Comparativo OEE por Máquina</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 text-gray-600 font-medium">Máquina</th>
                <th className="text-right py-3 px-4 text-gray-600 font-medium">Disponibilidade</th>
                <th className="text-right py-3 px-4 text-gray-600 font-medium">Performance</th>
                <th className="text-right py-3 px-4 text-gray-600 font-medium">Qualidade</th>
                <th className="text-right py-3 px-4 text-gray-600 font-medium">OEE</th>
                <th className="text-right py-3 px-4 text-gray-600 font-medium">Tendência</th>
              </tr>
            </thead>
            <tbody>
              {machines.slice(0, 5).map((machine, index) => (
                <tr key={machine.id} className="border-b border-gray-100">
                  <td className="py-3 px-4 text-gray-800">{machine.name}</td>
                  <td className="text-right py-3 px-4 text-blue-600 font-bold">{90 + index}%</td>
                  <td className="text-right py-3 px-4 text-green-600 font-bold">{85 + index}%</td>
                  <td className="text-right py-3 px-4 text-purple-600 font-bold">{94 + index}%</td>
                  <td className="text-right py-3 px-4 text-orange-600 font-bold">{72 + (index * 2)}%</td>
                  <td className="text-right py-3 px-4">
                    <span className={`text-sm font-medium ${index % 2 === 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {index % 2 === 0 ? '↑ +2.1%' : '↓ -1.5%'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
