'use client'

import React, { useEffect } from 'react'
import { useSelectedMachine } from '@/components/providers/selected-machine-provider'
import { Factory, Building2, MapPin, X } from 'lucide-react'

export function SelectedMachineModal() {
  const { selectedMachine, clearSelectedMachine } = useSelectedMachine()
  const [visible, setVisible] = React.useState(false)

  useEffect(() => {
    if (selectedMachine) {
      setVisible(true)
      // Auto-hide after 1 second
      const timer = setTimeout(() => {
        setVisible(false)
      }, 1000)
      return () => clearTimeout(timer)
    }
  }, [selectedMachine])

  if (!selectedMachine || !visible) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl border-2 border-green-500 p-4 min-w-80 animate-scale-in">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
              <Factory className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-xs font-semibold text-green-600 uppercase tracking-wide">Máquina Selecionada</p>
              <p className="text-sm font-bold text-gray-900">{selectedMachine.name}</p>
            </div>
          </div>
          <button
            onClick={() => setVisible(false)}
            className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-4 h-4 text-gray-400" />
          </button>
        </div>
        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-2">
            <span className="text-gray-400 font-mono text-xs">{selectedMachine.code}</span>
          </div>
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-gray-400" />
            <span className="text-gray-600">{selectedMachine.cost_center}</span>
          </div>
          {selectedMachine.location && (
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-gray-400" />
              <span className="text-gray-600">{selectedMachine.location}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
