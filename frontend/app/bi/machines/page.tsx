'use client'

import { useEffect, useState } from 'react'
import { Factory, Plus, Edit, Trash2, X } from 'lucide-react'

export default function Machines() {
  const [machines, setMachines] = useState<any[]>([])
  const [showModal, setShowModal] = useState(false)
  const [newMachine, setNewMachine] = useState({ name: '', code: '', cost_center: '', location: '' })

  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/machines`)
      .then(res => res.json())
      .then(data => setMachines(Array.isArray(data) ? data : []))
      .catch(err => {
        console.error('Erro ao carregar máquinas:', err)
        setMachines([])
      })
  }, [])

  const handleCreateMachine = async () => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/machines`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newMachine)
      })
      if (response.ok) {
        setNewMachine({ name: '', code: '', cost_center: '', location: '' })
        setShowModal(false)
        // Reload machines
        fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/machines`)
          .then(res => res.json())
          .then(data => setMachines(Array.isArray(data) ? data : []))
          .catch(err => {
            console.error('Erro ao carregar máquinas:', err)
            setMachines([])
          })
      }
    } catch (err) {
      console.error('Erro ao criar máquina:', err)
    }
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Máquinas</h1>
          <p className="text-gray-600">Gerenciamento de máquinas</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition"
        >
          <Plus className="w-4 h-4" />
          Nova Máquina
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {machines.map(machine => (
          <div key={machine.id} className="bg-gradient-to-br from-teal-50 to-teal-100 border border-teal-200 p-6 rounded-xl shadow-md hover:shadow-lg hover:scale-105 transition-all">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-500/20 rounded-lg">
                  <Factory className="w-5 h-5 text-green-600" />
                </div>
                <h3 className="text-gray-800 font-semibold">{machine.name}</h3>
              </div>
              <div className="flex gap-2">
                <button className="p-2 hover:bg-gray-100 rounded-lg transition">
                  <Edit className="w-4 h-4 text-gray-600" />
                </button>
                <button className="p-2 hover:bg-red-50 rounded-lg transition">
                  <Trash2 className="w-4 h-4 text-red-500" />
                </button>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600 text-sm">Código</span>
                <span className="text-gray-800 text-sm font-mono font-medium">{machine.code}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 text-sm">Centro de Custo</span>
                <span className="text-gray-800 text-sm">{machine.cost_center}</span>
              </div>
              {machine.location && (
                <div className="flex justify-between">
                  <span className="text-gray-600 text-sm">Localização</span>
                  <span className="text-gray-800 text-sm">{machine.location}</span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white border border-gray-200 p-6 w-full max-w-md m-4 rounded-xl shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-800">Nova Máquina</h3>
              <button
                onClick={() => setShowModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition"
              >
                <X className="w-5 h-5 text-gray-600" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-gray-600 text-sm mb-2 block">Nome</label>
                <input
                  type="text"
                  value={newMachine.name}
                  onChange={(e) => setNewMachine({ ...newMachine, name: e.target.value })}
                  className="bg-white border border-gray-300 rounded-lg px-4 py-2 text-gray-800 w-full focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="text-gray-600 text-sm mb-2 block">Código</label>
                <input
                  type="text"
                  value={newMachine.code}
                  onChange={(e) => setNewMachine({ ...newMachine, code: e.target.value })}
                  className="bg-white border border-gray-300 rounded-lg px-4 py-2 text-gray-800 w-full focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="text-gray-600 text-sm mb-2 block">Centro de Custo</label>
                <input
                  type="text"
                  value={newMachine.cost_center}
                  onChange={(e) => setNewMachine({ ...newMachine, cost_center: e.target.value })}
                  className="bg-white border border-gray-300 rounded-lg px-4 py-2 text-gray-800 w-full focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="text-gray-600 text-sm mb-2 block">Localização</label>
                <input
                  type="text"
                  value={newMachine.location}
                  onChange={(e) => setNewMachine({ ...newMachine, location: e.target.value })}
                  className="bg-white border border-gray-300 rounded-lg px-4 py-2 text-gray-800 w-full focus:border-blue-500 focus:outline-none"
                />
              </div>
            </div>
            <div className="flex gap-4 mt-6">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-2 rounded-lg transition"
              >
                Cancelar
              </button>
              <button
                onClick={handleCreateMachine}
                className="flex-1 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white px-4 py-2 rounded-lg transition"
              >
                Criar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
