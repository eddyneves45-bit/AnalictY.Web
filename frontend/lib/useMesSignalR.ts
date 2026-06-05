import { HubConnection, HubConnectionBuilder, HubConnectionState, LogLevel } from '@microsoft/signalr'
import { useCallback, useEffect, useRef, useState } from 'react'
import { HUB_BASE_URL } from './api'

type MachineSnapshotHandler = (data: any[]) => void
type MachineUpdateHandler = (data: any) => void
type RuntimeSnapshotHandler = (data: any[]) => void
type RuntimeUpdateHandler = (data: any) => void
type AlertSnapshotHandler = (data: any[]) => void
type AlertHandler = (data: any) => void
type AlertDeletedHandler = (id: number) => void
type MesSnapshotHandler = (data: any[]) => void
type MesUpdateHandler = (data: any) => void

type MesSignalRHandlers = {
  onMachineSnapshot?: MachineSnapshotHandler
  onMachineUpdate?: MachineUpdateHandler
  onRuntimeSnapshot?: RuntimeSnapshotHandler
  onRuntimeUpdate?: RuntimeUpdateHandler
  onAlertSnapshot?: AlertSnapshotHandler
  onAlertCreated?: AlertHandler
  onAlertUpdated?: AlertHandler
  onAlertDeleted?: AlertDeletedHandler
  onMesSnapshot?: MesSnapshotHandler
  onMesUpdate?: MesUpdateHandler
  enabled?: boolean
}

let connection: HubConnection | null = null
let connectionPromise: Promise<void> | null = null
const snapshotListeners = new Set<MachineSnapshotHandler>()
const updateListeners = new Set<MachineUpdateHandler>()
const runtimeSnapshotListeners = new Set<RuntimeSnapshotHandler>()
const runtimeUpdateListeners = new Set<RuntimeUpdateHandler>()
const alertSnapshotListeners = new Set<AlertSnapshotHandler>()
const alertCreatedListeners = new Set<AlertHandler>()
const alertUpdatedListeners = new Set<AlertHandler>()
const alertDeletedListeners = new Set<AlertDeletedHandler>()
const mesSnapshotListeners = new Set<MesSnapshotHandler>()
const mesUpdateListeners = new Set<MesUpdateHandler>()

function getConnection() {
  if (connection) return connection

  connection = new HubConnectionBuilder()
    .withUrl(`${HUB_BASE_URL}/hubs/mes`, { withCredentials: true })
    .withAutomaticReconnect([0, 2000, 5000, 10000, 30000])
    .configureLogging(LogLevel.Warning)
    .build()

  connection.on('machines:snapshot', (data) => snapshotListeners.forEach((listener) => listener(data)))
  connection.on('machines:update', (data) => updateListeners.forEach((listener) => listener(data)))
  connection.on('runtime:snapshot', (data) => runtimeSnapshotListeners.forEach((listener) => listener(data)))
  connection.on('runtime:update', (data) => runtimeUpdateListeners.forEach((listener) => listener(data)))
  connection.on('alerts:snapshot', (data) => alertSnapshotListeners.forEach((listener) => listener(data)))
  connection.on('alerts:created', (data) => alertCreatedListeners.forEach((listener) => listener(data)))
  connection.on('alerts:updated', (data) => alertUpdatedListeners.forEach((listener) => listener(data)))
  connection.on('alerts:deleted', (data) => alertDeletedListeners.forEach((listener) => listener(data)))
  connection.on('mes:snapshot', (data) => mesSnapshotListeners.forEach((listener) => listener(data)))
  connection.on('mes:update', (data) => mesUpdateListeners.forEach((listener) => listener(data)))

  return connection
}

async function ensureConnected() {
  const current = getConnection()
  if (current.state === HubConnectionState.Connected) return
  if (connectionPromise) return connectionPromise

  connectionPromise = current.start().finally(() => {
    connectionPromise = null
  })
  return connectionPromise
}

export function useMesSignalR({
  onMachineSnapshot,
  onMachineUpdate,
  onRuntimeSnapshot,
  onRuntimeUpdate,
  onAlertSnapshot,
  onAlertCreated,
  onAlertUpdated,
  onAlertDeleted,
  onMesSnapshot,
  onMesUpdate,
  enabled = true,
}: MesSignalRHandlers = {}) {
  const [connected, setConnected] = useState(false)
  const snapshotRef = useRef(onMachineSnapshot)
  const updateRef = useRef(onMachineUpdate)
  const runtimeSnapshotRef = useRef(onRuntimeSnapshot)
  const runtimeUpdateRef = useRef(onRuntimeUpdate)
  const alertSnapshotRef = useRef(onAlertSnapshot)
  const alertCreatedRef = useRef(onAlertCreated)
  const alertUpdatedRef = useRef(onAlertUpdated)
  const alertDeletedRef = useRef(onAlertDeleted)
  const mesSnapshotRef = useRef(onMesSnapshot)
  const mesUpdateRef = useRef(onMesUpdate)

  useEffect(() => {
    snapshotRef.current = onMachineSnapshot
  }, [onMachineSnapshot])

  useEffect(() => {
    updateRef.current = onMachineUpdate
  }, [onMachineUpdate])

  useEffect(() => {
    runtimeSnapshotRef.current = onRuntimeSnapshot
  }, [onRuntimeSnapshot])

  useEffect(() => {
    runtimeUpdateRef.current = onRuntimeUpdate
  }, [onRuntimeUpdate])

  useEffect(() => {
    alertSnapshotRef.current = onAlertSnapshot
  }, [onAlertSnapshot])

  useEffect(() => {
    alertCreatedRef.current = onAlertCreated
  }, [onAlertCreated])

  useEffect(() => {
    alertUpdatedRef.current = onAlertUpdated
  }, [onAlertUpdated])

  useEffect(() => {
    alertDeletedRef.current = onAlertDeleted
  }, [onAlertDeleted])

  useEffect(() => {
    mesSnapshotRef.current = onMesSnapshot
  }, [onMesSnapshot])

  useEffect(() => {
    mesUpdateRef.current = onMesUpdate
  }, [onMesUpdate])

  const snapshotListener = useCallback((data: any[]) => snapshotRef.current?.(data), [])
  const updateListener = useCallback((data: any) => updateRef.current?.(data), [])
  const runtimeSnapshotListener = useCallback((data: any[]) => runtimeSnapshotRef.current?.(data), [])
  const runtimeUpdateListener = useCallback((data: any) => runtimeUpdateRef.current?.(data), [])
  const alertSnapshotListener = useCallback((data: any[]) => alertSnapshotRef.current?.(data), [])
  const alertCreatedListener = useCallback((data: any) => alertCreatedRef.current?.(data), [])
  const alertUpdatedListener = useCallback((data: any) => alertUpdatedRef.current?.(data), [])
  const alertDeletedListener = useCallback((id: number) => alertDeletedRef.current?.(id), [])
  const mesSnapshotListener = useCallback((data: any[]) => mesSnapshotRef.current?.(data), [])
  const mesUpdateListener = useCallback((data: any) => mesUpdateRef.current?.(data), [])
  const usesMachines = !!onMachineSnapshot || !!onMachineUpdate
  const usesRuntime = !!onRuntimeSnapshot || !!onRuntimeUpdate
  const usesAlerts = !!onAlertSnapshot || !!onAlertCreated || !!onAlertUpdated || !!onAlertDeleted
  const usesMes = !!onMesSnapshot || !!onMesUpdate

  useEffect(() => {
    if (!enabled) return

    const current = getConnection()
    const handleReconnected = async () => {
      setConnected(true)
      if (usesMachines) await current.invoke('RequestMachineSnapshot')
      if (usesRuntime) await current.invoke('RequestRuntimeSnapshot')
      if (usesAlerts) await current.invoke('RequestAlertSnapshot')
      if (usesMes) await current.invoke('RequestMesSnapshot')
    }
    const handleReconnecting = () => setConnected(false)
    const handleClosed = () => setConnected(false)

    if (usesMachines) {
      snapshotListeners.add(snapshotListener)
      updateListeners.add(updateListener)
    }
    if (usesRuntime) {
      runtimeSnapshotListeners.add(runtimeSnapshotListener)
      runtimeUpdateListeners.add(runtimeUpdateListener)
    }
    if (usesAlerts) {
      alertSnapshotListeners.add(alertSnapshotListener)
      alertCreatedListeners.add(alertCreatedListener)
      alertUpdatedListeners.add(alertUpdatedListener)
      alertDeletedListeners.add(alertDeletedListener)
    }
    if (usesMes) {
      mesSnapshotListeners.add(mesSnapshotListener)
      mesUpdateListeners.add(mesUpdateListener)
    }
    current.onreconnected(handleReconnected)
    current.onreconnecting(handleReconnecting)
    current.onclose(handleClosed)

    void ensureConnected()
      .then(async () => {
        setConnected(true)
        if (usesMachines) await current.invoke('RequestMachineSnapshot')
        if (usesRuntime) await current.invoke('RequestRuntimeSnapshot')
        if (usesAlerts) await current.invoke('RequestAlertSnapshot')
        if (usesMes) await current.invoke('RequestMesSnapshot')
      })
      .catch(() => setConnected(false))

    return () => {
      if (usesMachines) {
        snapshotListeners.delete(snapshotListener)
        updateListeners.delete(updateListener)
      }
      if (usesRuntime) {
        runtimeSnapshotListeners.delete(runtimeSnapshotListener)
        runtimeUpdateListeners.delete(runtimeUpdateListener)
      }
      if (usesAlerts) {
        alertSnapshotListeners.delete(alertSnapshotListener)
        alertCreatedListeners.delete(alertCreatedListener)
        alertUpdatedListeners.delete(alertUpdatedListener)
        alertDeletedListeners.delete(alertDeletedListener)
      }
      if (usesMes) {
        mesSnapshotListeners.delete(mesSnapshotListener)
        mesUpdateListeners.delete(mesUpdateListener)
      }
    }
  }, [
    enabled,
    snapshotListener,
    updateListener,
    runtimeSnapshotListener,
    runtimeUpdateListener,
    alertSnapshotListener,
    alertCreatedListener,
    alertUpdatedListener,
    alertDeletedListener,
    mesSnapshotListener,
    mesUpdateListener,
    usesMachines,
    usesRuntime,
    usesAlerts,
    usesMes,
  ])

  return { connected }
}

export function useMqttDiagnosticsSignalR(
  connectionId: string,
  onDiagnostics: (data: any) => void,
  onMessageSnapshot?: (data: any[]) => void,
  onMessage?: (data: any) => void,
  enabled = true,
) {
  const diagnosticsRef = useRef(onDiagnostics)
  const messageSnapshotRef = useRef(onMessageSnapshot)
  const messageRef = useRef(onMessage)

  useEffect(() => {
    diagnosticsRef.current = onDiagnostics
  }, [onDiagnostics])

  useEffect(() => {
    messageSnapshotRef.current = onMessageSnapshot
  }, [onMessageSnapshot])

  useEffect(() => {
    messageRef.current = onMessage
  }, [onMessage])

  useEffect(() => {
    if (!enabled || !connectionId) return

    const current = getConnection()
    const listener = (data: any) => {
      if (String(data.connection_id) === connectionId) {
        diagnosticsRef.current(data)
      }
    }
    const messageListener = (data: any) => {
      if (String(data.connection_id) === connectionId) {
        messageRef.current?.(data)
      }
    }
    const messageSnapshotListener = (data: any[]) => {
      messageSnapshotRef.current?.(
        data.filter((message) => String(message.connection_id) === connectionId),
      )
    }

    current.on('mqtt:diagnostics', listener)
    current.on('mqtt:messages:snapshot', messageSnapshotListener)
    current.on('mqtt:message', messageListener)

    void ensureConnected()
      .then(() => current.invoke('SubscribeMqttDiagnostics', Number(connectionId)))
      .catch(() => {})

    return () => {
      current.off('mqtt:diagnostics', listener)
      current.off('mqtt:messages:snapshot', messageSnapshotListener)
      current.off('mqtt:message', messageListener)
      void current.invoke('UnsubscribeMqttDiagnostics', Number(connectionId)).catch(() => {})
    }
  }, [connectionId, enabled])
}
