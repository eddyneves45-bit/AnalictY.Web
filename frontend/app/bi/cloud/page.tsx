'use client'

import { useEffect, useState } from 'react'
import { Cloud as CloudIcon, CheckCircle, AlertTriangle, RefreshCw, Database, Upload, Download } from 'lucide-react'

export default function CloudPage() {
  const [syncStatus, setSyncStatus] = useState<'online' | 'offline' | 'syncing'>('online')
  const [pendingItems, setPendingItems] = useState(0)
  const [lastSync, setLastSync] = useState('Há 5 minutos')
  const [integrityStatus, setIntegrityStatus] = useState<'ok' | 'warning' | 'error'>('ok')

  const handleSyncNow = () => {
    setSyncStatus('syncing')
    setTimeout(() => {
      setSyncStatus('online')
      setLastSync('Agora')
      setPendingItems(0)
    }, 2000)
  }

  const syncLogs = [
    { time: '14:30', operation: 'Upload', table: 'production_shift', status: 'OK', records: 150 },
    { time: '14:25', operation: 'Upload', table: 'machine', status: 'OK', records: 5 },
    { time: '14:20', operation: 'Download', table: 'config', status: 'OK', records: 12 },
    { time: '14:15', operation: 'Upload', table: 'production_hourly', status: 'OK', records: 480 },
    { time: '14:10', operation: 'Upload', table: 'oee_daily', status: 'Warning', records: 30 },
  ]

  const dataIntegrity = [
    { table: 'production_shift', total: 15000, synced: 15000, integrity: 100 },
    { table: 'production_hourly', total: 360000, synced: 359850, integrity: 99.96 },
    { table: 'oee_daily', total: 365, synced: 365, integrity: 100 },
    { table: 'machine', total: 10, synced: 10, integrity: 100 },
  ]

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">Cloud / Sync</h1>
        <p className="text-gray-600">Sincronização edge/cloud, status de sync, pendências e integridade operacional</p>
      </div>

      {/* Cards de Status */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <div className={`bg-gradient-to-br ${syncStatus === 'online' ? 'from-green-500 to-green-600' : syncStatus === 'syncing' ? 'from-blue-500 to-blue-600' : 'from-red-500 to-red-600'} text-white p-6 rounded-xl shadow-lg`}>
          <div className="flex items-center justify-between mb-2">
            <CloudIcon className="w-6 h-6" />
            <span className="text-xs uppercase opacity-80">Status</span>
          </div>
          <p className="text-2xl font-bold">{syncStatus === 'online' ? 'Online' : syncStatus === 'syncing' ? 'Sincronizando' : 'Offline'}</p>
          <p className="text-sm opacity-90">Conexão Cloud</p>
        </div>
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white p-6 rounded-xl shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <Database className="w-6 h-6" />
            <span className="text-xs uppercase opacity-80">Pendentes</span>
          </div>
          <p className="text-2xl font-bold">{pendingItems}</p>
          <p className="text-sm opacity-90">Itens para Sync</p>
        </div>
        <div className="bg-gradient-to-br from-purple-500 to-purple-600 text-white p-6 rounded-xl shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <RefreshCw className="w-6 h-6" />
            <span className="text-xs uppercase opacity-80">Último Sync</span>
          </div>
          <p className="text-2xl font-bold">{lastSync}</p>
          <p className="text-sm opacity-90">Sincronização</p>
        </div>
        <div className={`bg-gradient-to-br ${integrityStatus === 'ok' ? 'from-green-500 to-green-600' : integrityStatus === 'warning' ? 'from-yellow-500 to-yellow-600' : 'from-red-500 to-red-600'} text-white p-6 rounded-xl shadow-lg`}>
          <div className="flex items-center justify-between mb-2">
            <CheckCircle className="w-6 h-6" />
            <span className="text-xs uppercase opacity-80">Integridade</span>
          </div>
          <p className="text-2xl font-bold">{integrityStatus === 'ok' ? '100%' : integrityStatus === 'warning' ? '99.9%' : 'Error'}</p>
          <p className="text-sm opacity-90">Integridade dos Dados</p>
        </div>
      </div>

      {/* Ações de Sincronização */}
      <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 rounded-2xl border border-indigo-200 p-6 shadow-sm mb-6">
        <div className="flex items-center gap-4 mb-4">
          <CloudIcon className="w-6 h-6 text-indigo-600" />
          <h2 className="text-xl font-bold text-gray-800">Ações de Sincronização</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button
            onClick={handleSyncNow}
            className="bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white px-6 py-4 rounded-xl transition flex items-center justify-center gap-2"
          >
            <RefreshCw className={`w-5 h-5 ${syncStatus === 'syncing' ? 'animate-spin' : ''}`} />
            Sincronizar Agora
          </button>
          <button className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white px-6 py-4 rounded-xl transition flex items-center justify-center gap-2">
            <Upload className="w-5 h-5" />
            Upload Manual
          </button>
          <button className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white px-6 py-4 rounded-xl transition flex items-center justify-center gap-2">
            <Download className="w-5 h-5" />
            Download Manual
          </button>
        </div>
      </div>

      {/* Logs de Sincronização */}
      <div className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 p-6 rounded-xl shadow-md mb-6">
        <div className="flex items-center gap-4 mb-4">
          <RefreshCw className="w-6 h-6 text-blue-600" />
          <h2 className="text-xl font-bold text-gray-800">Logs de Sincronização</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 text-gray-600 font-medium">Hora</th>
                <th className="text-left py-3 px-4 text-gray-600 font-medium">Operação</th>
                <th className="text-left py-3 px-4 text-gray-600 font-medium">Tabela</th>
                <th className="text-right py-3 px-4 text-gray-600 font-medium">Registros</th>
                <th className="text-left py-3 px-4 text-gray-600 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {syncLogs.map((log, index) => (
                <tr key={index} className="border-b border-gray-100">
                  <td className="py-3 px-4 text-gray-600">{log.time}</td>
                  <td className="py-3 px-4 text-gray-800">{log.operation}</td>
                  <td className="py-3 px-4 text-gray-800 font-mono text-sm">{log.table}</td>
                  <td className="text-right py-3 px-4 text-gray-800 font-bold">{log.records}</td>
                  <td className="py-3 px-4">
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                      log.status === 'OK' ? 'bg-green-100 text-green-600' : 'bg-yellow-100 text-yellow-600'
                    }`}>
                      {log.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Integridade dos Dados */}
      <div className="bg-gradient-to-br from-purple-50 to-purple-100 border border-purple-200 p-6 rounded-xl shadow-md">
        <div className="flex items-center gap-4 mb-4">
          <Database className="w-6 h-6 text-purple-600" />
          <h2 className="text-xl font-bold text-gray-800">Integridade dos Dados</h2>
        </div>
        <div className="space-y-4">
          {dataIntegrity.map((item, index) => (
            <div key={index} className="p-4 bg-gray-50 rounded-lg border border-gray-200">
              <div className="flex justify-between items-center mb-2">
                <h3 className="font-semibold text-gray-800">{item.table}</h3>
                <span className={`text-sm font-bold ${item.integrity === 100 ? 'text-green-600' : 'text-yellow-600'}`}>
                  {item.integrity}% integridade
                </span>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-500">Total</span>
                    <span className="text-gray-700">{item.total.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Sincronizado</span>
                    <span className="text-green-600 font-medium">{item.synced.toLocaleString()}</span>
                  </div>
                </div>
                <div className="w-32">
                  <div className="bg-gray-200 rounded-full h-4">
                    <div 
                      className={`h-4 rounded-full ${item.integrity === 100 ? 'bg-green-500' : 'bg-yellow-500'}`}
                      style={{ width: `${item.integrity}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
