'use client'

import { useEffect, useState } from 'react'
import { Search, Package, Clock, CheckCircle, Filter } from 'lucide-react'

export default function Traceability() {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedType, setSelectedType] = useState<'lote' | 'ordem' | 'produto'>('lote')
  const [traceabilityData, setTraceabilityData] = useState<any>(null)

  const handleSearch = () => {
    // Implementar busca de rastreabilidade
    console.log('Buscar rastreabilidade:', searchTerm, selectedType)
  }

  const traceResults = [
    { id: 'LOT-2024-001', type: 'Lote', product: 'Produto A', quantity: 5000, startDate: '01/01/2024', status: 'Concluído', machine: 'Máquina 01' },
    { id: 'ORD-2024-045', type: 'Ordem', product: 'Produto B', quantity: 3000, startDate: '15/01/2024', status: 'Em Produção', machine: 'Máquina 03' },
    { id: 'LOT-2024-002', type: 'Lote', product: 'Produto C', quantity: 2500, startDate: '20/01/2024', status: 'Pendente', machine: 'Máquina 02' },
  ]

  const operationHistory = [
    { date: '01/01/2024 08:00', operation: 'Início Produção', machine: 'Máquina 01', operator: 'João Silva', status: 'OK' },
    { date: '01/01/2024 12:00', operation: 'Parada Manutenção', machine: 'Máquina 01', operator: 'Sistema', status: 'Alerta' },
    { date: '01/01/2024 14:00', operation: 'Retorno Produção', machine: 'Máquina 01', operator: 'João Silva', status: 'OK' },
    { date: '01/01/2024 18:00', operation: 'Fim Produção', machine: 'Máquina 01', operator: 'João Silva', status: 'OK' },
    { date: '01/01/2024 18:30', operation: 'Inspeção Qualidade', machine: 'Máquina 01', operator: 'Maria Santos', status: 'OK' },
    { date: '01/01/2024 19:00', operation: 'Estoque', machine: 'Armazém A', operator: 'Pedro Costa', status: 'OK' },
  ]

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">Rastreabilidade</h1>
        <p className="text-gray-600">Rastreabilidade de lote, ordem, histórico operacional completo</p>
      </div>

      {/* Busca */}
      <div className="bg-gradient-to-br from-cyan-50 to-cyan-100 rounded-2xl border border-cyan-200 p-6 shadow-sm mb-6">
        <div className="flex items-center gap-4 mb-4">
          <Search className="w-6 h-6 text-cyan-600" />
          <h2 className="text-xl font-bold text-gray-800">Buscar Rastreabilidade</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="text-gray-600 text-sm mb-2 block">Tipo de Busca</label>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value as any)}
              className="bg-white border border-gray-300 rounded-lg px-4 py-2 text-gray-800 w-full focus:border-cyan-500 focus:outline-none"
            >
              <option value="lote">Lote</option>
              <option value="ordem">Ordem de Produção</option>
              <option value="produto">Produto</option>
            </select>
          </div>
          <div>
            <label className="text-gray-600 text-sm mb-2 block">Código</label>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Digite o código..."
              className="bg-white border border-gray-300 rounded-lg px-4 py-2 text-gray-800 w-full focus:border-cyan-500 focus:outline-none"
            />
          </div>
          <div className="flex items-end">
            <button
              onClick={handleSearch}
              className="bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-600 hover:to-cyan-700 text-white px-6 py-2 rounded-lg transition flex items-center gap-2 w-full"
            >
              <Search className="w-4 h-4" />
              Buscar
            </button>
          </div>
        </div>
      </div>

      {/* Resultados da Busca */}
      <div className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 p-6 rounded-xl shadow-md mb-6">
        <div className="flex items-center gap-4 mb-4">
          <Package className="w-6 h-6 text-blue-600" />
          <h2 className="text-xl font-bold text-gray-800">Resultados da Busca</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 text-gray-600 font-medium">ID</th>
                <th className="text-left py-3 px-4 text-gray-600 font-medium">Tipo</th>
                <th className="text-left py-3 px-4 text-gray-600 font-medium">Produto</th>
                <th className="text-right py-3 px-4 text-gray-600 font-medium">Quantidade</th>
                <th className="text-left py-3 px-4 text-gray-600 font-medium">Início</th>
                <th className="text-left py-3 px-4 text-gray-600 font-medium">Status</th>
                <th className="text-left py-3 px-4 text-gray-600 font-medium">Máquina</th>
              </tr>
            </thead>
            <tbody>
              {traceResults.map((result, index) => (
                <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-3 px-4 text-gray-800 font-medium">{result.id}</td>
                  <td className="py-3 px-4 text-gray-600">{result.type}</td>
                  <td className="py-3 px-4 text-gray-800">{result.product}</td>
                  <td className="text-right py-3 px-4 text-gray-800 font-bold">{result.quantity}</td>
                  <td className="py-3 px-4 text-gray-600">{result.startDate}</td>
                  <td className="py-3 px-4">
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                      result.status === 'Concluído' ? 'bg-green-100 text-green-600' : 
                      result.status === 'Em Produção' ? 'bg-blue-100 text-blue-600' : 
                      'bg-yellow-100 text-yellow-600'
                    }`}>
                      {result.status}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-gray-600">{result.machine}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Histórico Operacional */}
      <div className="bg-gradient-to-br from-gray-50 to-gray-100 border border-gray-200 p-6 rounded-xl shadow-md">
        <div className="flex items-center gap-4 mb-4">
          <Clock className="w-6 h-6 text-gray-600" />
          <h2 className="text-xl font-bold text-gray-800">Histórico Operacional - LOT-2024-001</h2>
        </div>
        <div className="space-y-3">
          {operationHistory.map((op, index) => (
            <div key={index} className="flex items-start gap-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
              <div className={`p-2 rounded-lg ${
                op.status === 'OK' ? 'bg-green-100' : 'bg-red-100'
              }`}>
                <CheckCircle className={`w-4 h-4 ${
                  op.status === 'OK' ? 'text-green-600' : 'text-red-600'
                }`} />
              </div>
              <div className="flex-1">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-semibold text-gray-800">{op.operation}</p>
                    <p className="text-sm text-gray-600">{op.machine} - {op.operator}</p>
                  </div>
                  <span className="text-xs text-gray-500">{op.date}</span>
                </div>
                <span className={`text-xs px-2 py-1 rounded-full font-medium mt-2 inline-block ${
                  op.status === 'OK' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'
                }`}>
                  {op.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
