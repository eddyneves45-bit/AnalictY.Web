'use client'

import { useEffect, useState } from 'react'
import { FileText, Download, Calendar, Filter, Printer } from 'lucide-react'

export default function Reports() {
  const [machines, setMachines] = useState<any[]>([])
  const [selectedMachine, setSelectedMachine] = useState<number | null>(null)
  const [selectedPeriod, setSelectedPeriod] = useState<'shift' | 'day' | 'week' | 'month'>('day')
  const [startDate, setStartDate] = useState<string>(new Date().toISOString().split('T')[0])
  const [endDate, setEndDate] = useState<string>(new Date().toISOString().split('T')[0])
  const [report, setReport] = useState<any>(null)

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
    if (!selectedMachine || !startDate) return

    const url = `${process.env.NEXT_PUBLIC_API_URL}/api/reports/daily?machine_id=${selectedMachine}&report_date=${startDate}`
    fetch(url)
      .then(res => res.json())
      .then(data => setReport(data))
      .catch(err => console.error('Erro ao gerar relatório:', err))
  }

  const handleExportPDF = () => {
    // Implementar exportação PDF
    console.log('Exportar PDF')
  }

  const handleExportExcel = () => {
    // Implementar exportação Excel
    console.log('Exportar Excel')
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">Relatórios</h1>
        <p className="text-gray-600">Relatórios por turno, dia, semana, mês com exportação PDF/Excel</p>
      </div>

      {/* Filtros */}
      <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl border border-blue-200 p-6 shadow-sm">
        <div className="flex items-center gap-4 mb-4">
          <FileText className="w-6 h-6 text-blue-600" />
          <h2 className="text-xl font-bold text-gray-800">Gerar Relatório</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="text-gray-600 text-sm mb-2 block">Máquina</label>
            <select
              value={selectedMachine || ''}
              onChange={(e) => setSelectedMachine(Number(e.target.value))}
              className="bg-white border border-gray-300 rounded-lg px-4 py-2 text-gray-800 w-full focus:border-blue-500 focus:outline-none"
            >
              <option value="">Selecione uma máquina</option>
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
              className="bg-white border border-gray-300 rounded-lg px-4 py-2 text-gray-800 w-full focus:border-blue-500 focus:outline-none"
            >
              <option value="shift">Turno</option>
              <option value="day">Dia</option>
              <option value="week">Semana</option>
              <option value="month">Mês</option>
            </select>
          </div>
          <div>
            <label className="text-gray-600 text-sm mb-2 block">Data Início</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="bg-white border border-gray-300 rounded-lg px-4 py-2 text-gray-800 w-full focus:border-blue-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="text-gray-600 text-sm mb-2 block">Data Fim</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="bg-white border border-gray-300 rounded-lg px-4 py-2 text-gray-800 w-full focus:border-blue-500 focus:outline-none"
            />
          </div>
        </div>
        <div className="flex gap-4 mt-4">
          <button
            onClick={handleGenerateReport}
            className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white px-6 py-2 rounded-lg transition flex items-center gap-2"
          >
            <Filter className="w-4 h-4" />
            Gerar Relatório
          </button>
          {report && (
            <>
              <button
                onClick={handleExportPDF}
                className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white px-6 py-2 rounded-lg transition flex items-center gap-2"
              >
                <Printer className="w-4 h-4" />
                Exportar PDF
              </button>
              <button
                onClick={handleExportExcel}
                className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white px-6 py-2 rounded-lg transition flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                Exportar Excel
              </button>
            </>
          )}
        </div>
      </div>

      {/* Resultados do Relatório */}
      {report && (
        <div className="bg-gradient-to-br from-purple-50 to-purple-100 border border-purple-200 p-6 rounded-xl shadow-md">
          <div className="flex items-center gap-4 mb-4">
            <FileText className="w-6 h-6 text-purple-600" />
            <h2 className="text-xl font-bold text-gray-800">Relatório - {selectedPeriod === 'shift' ? 'Turno' : selectedPeriod === 'day' ? 'Dia' : selectedPeriod === 'week' ? 'Semana' : 'Mês'}</h2>
          </div>
          <div className="space-y-4">
            <div className="flex justify-between">
              <span className="text-gray-600">Máquina</span>
              <span className="text-gray-800 font-medium">{report.machine_name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Data</span>
              <span className="text-gray-800 font-medium">{report.date}</span>
            </div>
            <div className="border-t border-gray-200 pt-4">
              <h3 className="text-gray-800 font-semibold mb-2">Detalhes por Turno</h3>
              {report.shifts && report.shifts.length > 0 ? (
                report.shifts.map((shift: any, index: number) => (
                  <div key={index} className="bg-gray-50 rounded-lg p-4 mb-2 border border-gray-200">
                    <div className="flex justify-between mb-2">
                      <span className="text-gray-600">Tipo</span>
                      <span className="text-gray-800">{shift.shift_type}</span>
                    </div>
                    <div className="grid grid-cols-4 gap-4">
                      <div className="text-center">
                        <p className="text-xs text-gray-500">Produção</p>
                        <p className="text-lg font-bold text-blue-600">{shift.production_count}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-xs text-gray-500">Downtime</p>
                        <p className="text-lg font-bold text-orange-600">{shift.downtime_minutes} min</p>
                      </div>
                      <div className="text-center">
                        <p className="text-xs text-gray-500">OEE</p>
                        <p className="text-lg font-bold text-purple-600">{shift.oee}%</p>
                      </div>
                      <div className="text-center">
                        <p className="text-xs text-gray-500">Meta</p>
                        <p className="text-lg font-bold text-green-600">85%</p>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-gray-500 text-sm">Nenhum dado encontrado para o período selecionado</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
