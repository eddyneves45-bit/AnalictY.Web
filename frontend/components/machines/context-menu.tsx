'use client'

import React, { useEffect, useState } from 'react'
import { Eye, Activity, AlertTriangle, X } from 'lucide-react'

export type ContextMenuOption = {
  id: string
  label: string
  icon: React.ReactNode
  onClick: () => void
}

interface ContextMenuProps {
  options: ContextMenuOption[]
  onClose: () => void
  position: { x: number; y: number }
}

export function ContextMenu({ options, onClose, position }: ContextMenuProps) {
  const [menuStyle, setMenuStyle] = useState<React.CSSProperties>({})

  useEffect(() => {
    const handleClickOutside = () => onClose()
    document.addEventListener('click', handleClickOutside)
    document.addEventListener('contextmenu', handleClickOutside)

    // Ajustar posição se o menu sair da tela
    const menuWidth = 200
    const menuHeight = options.length * 48
    
    let x = position.x
    let y = position.y
    
    if (x + menuWidth > window.innerWidth) {
      x = window.innerWidth - menuWidth - 10
    }
    if (y + menuHeight > window.innerHeight) {
      y = window.innerHeight - menuHeight - 10
    }

    setMenuStyle({ left: x, top: y })

    return () => {
      document.removeEventListener('click', handleClickOutside)
      document.removeEventListener('contextmenu', handleClickOutside)
    }
  }, [onClose, position, options.length])

  return (
    <div
      className="fixed bg-white rounded-lg shadow-2xl border border-gray-200 py-2 z-[1000] min-w-[200px]"
      style={menuStyle}
    >
      {options.map((option) => (
        <button
          key={option.id}
          onClick={() => {
            option.onClick()
            onClose()
          }}
          className="w-full px-4 py-3 flex items-center gap-3 hover:bg-gray-100 transition-colors text-left"
        >
          {option.icon}
          <span className="text-sm font-medium text-gray-700">{option.label}</span>
        </button>
      ))}
    </div>
  )
}

interface UseContextMenuReturn {
  contextMenu: { x: number; y: number } | null
  openContextMenu: (event: React.MouseEvent) => void
  closeContextMenu: () => void
}

export function useContextMenu(): UseContextMenuReturn {
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null)

  const openContextMenu = (event: React.MouseEvent) => {
    event.preventDefault()
    event.stopPropagation()
    setContextMenu({ x: event.clientX, y: event.clientY })
  }

  const closeContextMenu = () => {
    setContextMenu(null)
  }

  return { contextMenu, openContextMenu, closeContextMenu }
}
