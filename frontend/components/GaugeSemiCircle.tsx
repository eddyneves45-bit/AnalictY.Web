'use client'

import React from 'react'

type Props = {
  value: number | boolean | null | undefined
  min?: number
  max?: number
  label?: string
}

const normalizeValue = (value: any, min: number, max: number) => {
  if (value === null || value === undefined) return 0

  if (typeof value === "boolean") {
    return value ? max : min
  }

  return Math.max(min, Math.min(max, value))
}

const valueToAngle = (value: number, min: number, max: number) => {
  const percent = (value - min) / (max - min)
  return percent * 180
}

const GaugeSemiCircle: React.FC<Props> = ({
  value,
  min = 0,
  max = 100,
  label
}) => {
  const normalizedValue = normalizeValue(value, min, max)
  const angle = valueToAngle(normalizedValue, min, max)
  
  const rad = (Math.PI * (180 - angle)) / 180
  const x = 100 + 70 * Math.cos(rad)
  const y = 100 - 70 * Math.sin(rad)

  const displayValue = value === null || value === undefined ? "--" : value

  return (
    <div className="flex flex-col items-center">
      <svg width="200" height="120" viewBox="0 0 200 120">
        {/* Arco base com borda preta */}
        <path
          d="M 10 100 A 90 90 0 0 1 190 100"
          stroke="#1f2937"
          strokeWidth="2"
          fill="none"
        />
        <path
          d="M 10 100 A 90 90 0 0 1 190 100"
          stroke="#e5e7eb"
          strokeWidth="20"
          fill="none"
        />
        
        {/* Zona 0-30: vermelho (baixo) */}
        <path
          d="M 10 100 A 90 90 0 0 1 55 27.1"
          stroke="#ef4444"
          strokeWidth="20"
          fill="none"
          opacity="0.6"
        />
        
        {/* Zona 30-70: amarelo (médio) */}
        <path
          d="M 55 27.1 A 90 90 0 0 1 145 27.1"
          stroke="#facc15"
          strokeWidth="20"
          fill="none"
          opacity="0.6"
        />
        
        {/* Zona 70-100: verde (alto) */}
        <path
          d="M 145 27.1 A 90 90 0 0 1 190 100"
          stroke="#22c55e"
          strokeWidth="20"
          fill="none"
          opacity="0.6"
        />
        
        {/* Marcadores de percentual */}
        <text x="10" y="115" textAnchor="middle" fontSize="10" fontWeight="bold" fill="#6b7280">0%</text>
        <text x="32.5" y="25" textAnchor="middle" fontSize="10" fontWeight="bold" fill="#6b7280">25%</text>
        <text x="100" y="15" textAnchor="middle" fontSize="10" fontWeight="bold" fill="#6b7280">50%</text>
        <text x="167.5" y="25" textAnchor="middle" fontSize="10" fontWeight="bold" fill="#6b7280">75%</text>
        <text x="190" y="115" textAnchor="middle" fontSize="10" fontWeight="bold" fill="#6b7280">100%</text>
        
        {/* Ponteiro - preto */}
        <line
          x1="100"
          y1="100"
          x2={x}
          y2={y}
          stroke="#1f2937"
          strokeWidth="6"
          strokeLinecap="round"
          style={{ transition: "all 0.3s ease" }}
        />
        
        {/* Centro do ponteiro - preto */}
        <circle cx="100" cy="100" r="8" fill="#1f2937" />
        <circle cx="100" cy="100" r="4" fill="#ffffff" />
        
        {/* Valor no centro - mais destacado */}
        <text x="100" y="85" textAnchor="middle" fontSize="18" fontWeight="black" fill="#1f2937">
          {displayValue}
        </text>
        
        {/* Label */}
        {label && (
          <text x="100" y="115" textAnchor="middle" fontSize="12" fontWeight="bold" fill="#4b5563">
            {label}
          </text>
        )}
      </svg>
    </div>
  )
}

export default GaugeSemiCircle
