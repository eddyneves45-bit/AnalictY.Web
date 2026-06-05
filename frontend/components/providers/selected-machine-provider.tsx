'use client'

import React, { createContext, useContext, useState, ReactNode } from 'react'

type Machine = {
  id: number
  name: string
  code: string
  cost_center: string
  location: string
  opcua_node_id: string
  mqtt_topic: string
  is_active: boolean
}

type SelectedMachineContextType = {
  selectedMachine: Machine | null
  setSelectedMachine: (machine: Machine | null) => void
  clearSelectedMachine: () => void
}

const SelectedMachineContext = createContext<SelectedMachineContextType | undefined>(undefined)

export function SelectedMachineProvider({ children }: { children: ReactNode }) {
  const [selectedMachine, setSelectedMachine] = useState<Machine | null>(null)

  const clearSelectedMachine = () => {
    setSelectedMachine(null)
  }

  return (
    <SelectedMachineContext.Provider value={{ selectedMachine, setSelectedMachine, clearSelectedMachine }}>
      {children}
    </SelectedMachineContext.Provider>
  )
}

export function useSelectedMachine() {
  const context = useContext(SelectedMachineContext)
  if (context === undefined) {
    throw new Error('useSelectedMachine must be used within a SelectedMachineProvider')
  }
  return context
}
