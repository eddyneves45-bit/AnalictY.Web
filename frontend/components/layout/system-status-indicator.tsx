'use client'

import React, { useState, useEffect } from 'react'
import { Clock } from 'lucide-react'
import { API_BASE_URL, apiFetch } from '@/lib/api'

export function SystemStatusIndicator() {
  const [isOnline, setIsOnline] = useState(true)
  const [mysqlStatus, setMysqlStatus] = useState<'online' | 'degraded' | 'offline'>('online')
  const [serverUtcNow, setServerUtcNow] = useState(new Date())
  const [serverSyncedAt, setServerSyncedAt] = useState(new Date())
  const [displayNow, setDisplayNow] = useState(new Date())
  const [timeZoneId, setTimeZoneId] = useState('America/Sao_Paulo')
  const [timeZoneLabel, setTimeZoneLabel] = useState('Brasil - Brasília (GMT-3)')

  useEffect(() => {
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    setIsOnline(navigator.onLine)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  useEffect(() => {
    async function loadMySqlHealth() {
      try {
        const response = await apiFetch(`${API_BASE_URL}/api/health/mysql`)
        if (!response.ok) {
          setMysqlStatus('offline')
          return
        }
        const data = await response.json()
        setMysqlStatus(data.status ?? 'offline')
      } catch {
        setMysqlStatus('offline')
      }
    }

    loadMySqlHealth()
    const interval = setInterval(loadMySqlHealth, 15000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    async function loadSystemTime() {
      try {
        const response = await apiFetch(`${API_BASE_URL}/api/config/system/time`)
        if (!response.ok) return
        const data = await response.json()
        const utcNow = new Date(data.utcNow ?? data.utc_now ?? Date.now())
        setServerUtcNow(utcNow)
        setServerSyncedAt(new Date())
        setDisplayNow(utcNow)
        setTimeZoneId(data.timeZoneId ?? 'America/Sao_Paulo')
        setTimeZoneLabel(data.label ?? data.timeZoneId ?? 'Brasil - Brasília (GMT-3)')
      } catch {
        setTimeZoneId('America/Sao_Paulo')
        setTimeZoneLabel('Brasil - Brasília (GMT-3)')
      }
    }

    loadSystemTime()
    const interval = setInterval(loadSystemTime, 60000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    const interval = setInterval(() => {
      const elapsed = Date.now() - serverSyncedAt.getTime()
      setDisplayNow(new Date(serverUtcNow.getTime() + elapsed))
    }, 1000)

    return () => clearInterval(interval)
  }, [serverSyncedAt, serverUtcNow])

  const formatDateTime = (date: Date) => {
    return date.toLocaleDateString('pt-BR', { 
      day: '2-digit',
      month: '2-digit',
      year: '2-digit',
      timeZone: timeZoneId
    }) + ' ' + date.toLocaleTimeString('pt-BR', { 
      hour: '2-digit', 
      minute: '2-digit',
      timeZone: timeZoneId
    })
  }

  const systemStatus = !isOnline ? 'offline' : mysqlStatus
  const statusLabel = systemStatus === 'degraded' ? 'Degradado' : systemStatus === 'offline' ? 'Offline' : 'Online'
  const statusColor = systemStatus === 'degraded'
    ? 'bg-orange-500 text-orange-600'
    : systemStatus === 'offline'
    ? 'bg-red-600 text-red-600'
    : 'bg-green-600 text-green-600'

  return (
    <div className="fixed bottom-4 right-4 z-50 bg-white rounded-xl border border-gray-200 shadow-lg px-4 py-3 flex items-center gap-3">
      <div className="flex items-center gap-2">
        <div className={`w-3 h-3 rounded-full ${statusColor.split(' ')[0]} animate-pulse`} />
        <span className={`text-xs font-semibold ${statusColor.split(' ')[1]}`}>
          {statusLabel}
        </span>
      </div>
      <div className="h-4 w-px bg-gray-300" />
      <div className="flex items-center gap-2">
        <Clock className="h-4 w-4 text-gray-500" />
        <span className="text-xs text-gray-600">
          Hora atual {formatDateTime(displayNow)}
          <span className="ml-1 text-gray-400">({timeZoneLabel})</span>
        </span>
      </div>
    </div>
  )
}
