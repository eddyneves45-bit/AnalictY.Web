'use client'

import { useEffect, useState } from 'react'
import { Brain, AlertTriangle, TrendingUp, Lightbulb, Zap, Target } from 'lucide-react'

export default function Analytics() {
  const [insights, setInsights] = useState<any[]>([])
  const [anomalies, setAnomalies] = useState<any[]>([])
  const [predictions, setPredictions] = useState<any[]>([])

  useEffect(() => {
    // Simular dados de analytics
    setInsights([
      { type: 'optimization', title: 'Oportunidade de Otimização', description: 'Máquina 01 pode aumentar produção em 15% ajustando velocidade', impact: 'Alto', confidence: 85 },
      { type: 'maintenance', title: 'Previsão de Manutenção', description: 'Rolamento da Máquina 03 precisa de troca em 48h', impact: 'Alto', confidence: 92 },
      { type: 'quality', title: 'Tendência de Qualidade', description: 'Taxa de defeitos aumentou 2% na última semana', impact: 'Médio', confidence: 78 },
    ])
    setAnomalies([
      { machine: 'Máquina 02', anomaly: 'Pico de temperatura inesperado', severity: 'Alta', detected: 'Hoje, 15:30' },
      { machine: 'Máquina 05', anomaly: 'Variação de pressão fora do normal', severity: 'Média', detected: 'Hoje, 12:15' },
      { machine: 'Máquina 01', anomaly: 'Consumo de energia acima da média', severity: 'Baixa', detected: 'Ontem, 18:45' },
    ])
    setPredictions([
      { metric: 'Produção Semanal', current: 8500, predicted: 9200, variation: '+8.2%', trend: 'up' },
      { metric: 'OEE Mensal', current: 78, predicted: 82, variation: '+5.1%', trend: 'up' },
      { metric: 'Downtime', current: 45, predicted: 38, variation: '-15.6%', trend: 'down' },
    ])
  }, [])

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">Analytics / IA</h1>
        <p className="text-gray-600">Insights inteligentes, detecção de anomalias, tendências e previsões operacionais</p>
      </div>

      {/* Cards de Resumo AI */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div className="bg-gradient-to-br from-pink-500 to-pink-600 text-white p-6 rounded-xl shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <Brain className="w-6 h-6" />
            <span className="text-xs uppercase opacity-80">Insights</span>
          </div>
          <p className="text-2xl font-bold">12</p>
          <p className="text-sm opacity-90">Insights Ativos</p>
        </div>
        <div className="bg-gradient-to-br from-red-500 to-red-600 text-white p-6 rounded-xl shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <AlertTriangle className="w-6 h-6" />
            <span className="text-xs uppercase opacity-80">Anomalias</span>
          </div>
          <p className="text-2xl font-bold">3</p>
          <p className="text-sm opacity-90">Detectadas Hoje</p>
        </div>
        <div className="bg-gradient-to-br from-cyan-500 to-cyan-600 text-white p-6 rounded-xl shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <TrendingUp className="w-6 h-6" />
            <span className="text-xs uppercase opacity-80">Previsões</span>
          </div>
          <p className="text-2xl font-bold">92%</p>
          <p className="text-sm opacity-90">Acurácia Média</p>
        </div>
      </div>

      {/* Insights Inteligentes */}
      <div className="bg-gradient-to-br from-pink-50 to-pink-100 border border-pink-200 p-6 rounded-xl shadow-md mb-6">
        <div className="flex items-center gap-4 mb-4">
          <Lightbulb className="w-6 h-6 text-pink-600" />
          <h2 className="text-xl font-bold text-gray-800">Insights Inteligentes</h2>
        </div>
        <div className="space-y-4">
          {insights.map((insight, index) => (
            <div key={index} className="p-4 bg-gradient-to-r from-pink-50 to-purple-50 border border-pink-200 rounded-lg">
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-pink-500" />
                  <h3 className="font-semibold text-gray-800">{insight.title}</h3>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs px-2 py-1 rounded-full ${insight.impact === 'Alto' ? 'bg-red-100 text-red-600' : 'bg-yellow-100 text-yellow-600'}`}>
                    Impacto: {insight.impact}
                  </span>
                  <span className="text-xs text-gray-500">{insight.confidence}% confiança</span>
                </div>
              </div>
              <p className="text-sm text-gray-600">{insight.description}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Anomalias Detectadas */}
      <div className="bg-gradient-to-br from-red-50 to-red-100 border border-red-200 p-6 rounded-xl shadow-md mb-6">
        <div className="flex items-center gap-4 mb-4">
          <AlertTriangle className="w-6 h-6 text-red-600" />
          <h2 className="text-xl font-bold text-gray-800">Anomalias Detectadas</h2>
        </div>
        <div className="space-y-3">
          {anomalies.map((anomaly, index) => (
            <div key={index} className={`flex items-start gap-4 p-4 rounded-lg border ${
              anomaly.severity === 'Alta' ? 'bg-red-50 border-red-200' : 
              anomaly.severity === 'Média' ? 'bg-orange-50 border-orange-200' : 
              'bg-yellow-50 border-yellow-200'
            }`}>
              <AlertTriangle className={`w-5 h-5 mt-1 ${
                anomaly.severity === 'Alta' ? 'text-red-500' : 
                anomaly.severity === 'Média' ? 'text-orange-500' : 
                'text-yellow-500'
              }`} />
              <div className="flex-1">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-semibold text-gray-800">{anomaly.machine}</p>
                    <p className="text-sm text-gray-600">{anomaly.anomaly}</p>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                    anomaly.severity === 'Alta' ? 'bg-red-500 text-white' : 
                    anomaly.severity === 'Média' ? 'bg-orange-500 text-white' : 
                    'bg-yellow-500 text-white'
                  }`}>
                    {anomaly.severity}
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-1">Detectado: {anomaly.detected}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-gradient-to-br from-cyan-50 to-cyan-100 rounded-2xl border border-cyan-200 p-6 shadow-sm mb-6">
        <div className="flex items-center gap-4 mb-4">
          <Brain className="w-6 h-6 text-cyan-600" />
          <h2 className="text-xl font-bold text-gray-800">Filtrar Analytics</h2>
        </div>
        <div className="space-y-4">
          {predictions.map((prediction, index) => (
            <div key={index} className="p-4 bg-gradient-to-r from-cyan-50 to-blue-50 border border-cyan-200 rounded-lg">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-gray-800">{prediction.metric}</h3>
                <span className={`text-sm font-bold flex items-center gap-1 ${
                  prediction.trend === 'up' ? 'text-green-600' : 'text-red-600'
                }`}>
                  {prediction.trend === 'up' ? <TrendingUp className="w-4 h-4" /> : <TrendingUp className="w-4 h-4 rotate-180" />}
                  {prediction.variation}
                </span>
              </div>
              <div className="flex items-center gap-8">
                <div>
                  <p className="text-xs text-gray-500">Atual</p>
                  <p className="text-lg font-bold text-gray-700">{prediction.current}</p>
                </div>
                <div className="flex-1">
                  <p className="text-xs text-gray-500">Previsto</p>
                  <p className="text-lg font-bold text-cyan-600">{prediction.predicted}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
