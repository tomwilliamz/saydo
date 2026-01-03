'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'
import { Person, PERSON_COLORS, ALL_PERSONS, PERSON_AVATARS } from '@/lib/types'

type Granularity = 'day' | 'week'

interface TrendDataPoint {
  label: string
  date: string
  ratio: number
  done: number
  total: number
}

interface PersonTrend {
  person: Person
  data: TrendDataPoint[]
}

// Color configs for 3D effects
const CHART_COLORS = {
  Thomas: { main: '#3B82F6', gradient: ['#60A5FA', '#2563EB', '#1E40AF'] },
  Ivor: { main: '#10B981', gradient: ['#34D399', '#059669', '#047857'] },
  Axel: { main: '#F59E0B', gradient: ['#FBBF24', '#D97706', '#B45309'] },
}

export default function LeaderboardPage() {
  const [trends, setTrends] = useState<PersonTrend[]>([])
  const [loading, setLoading] = useState(true)
  const [granularity, setGranularity] = useState<Granularity>('day')
  const [hoveredPerson, setHoveredPerson] = useState<Person | null>(null)

  useEffect(() => {
    const fetchTrends = async () => {
      setLoading(true)
      try {
        const response = await fetch(`/api/trends?granularity=${granularity}`)
        const data = await response.json()
        setTrends(data.trends)
      } catch (error) {
        console.error('Failed to fetch trends:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchTrends()
  }, [granularity])

  // Merge all person data into unified chart data
  const maxBars = granularity === 'day' ? 14 : 12
  const chartData = trends.length > 0
    ? trends[0].data.slice(-maxBars).map((point, i) => {
        const entry: Record<string, string | number> = { label: point.label, date: point.date }
        trends.forEach((trend) => {
          const dataPoint = trend.data.slice(-maxBars)[i]
          entry[trend.person] = dataPoint ? Math.round(dataPoint.ratio * 100) : 0
          entry[`${trend.person}_done`] = dataPoint?.done || 0
          entry[`${trend.person}_total`] = dataPoint?.total || 0
        })
        return entry
      })
    : []

  // Get current stats for each person
  const currentStats = trends.map((trend) => {
    const latest = trend.data[trend.data.length - 1]
    return {
      person: trend.person,
      ratio: latest ? Math.round(latest.ratio * 100) : 0,
      done: latest?.done || 0,
      total: latest?.total || 0,
    }
  }).sort((a, b) => b.ratio - a.ratio)

  const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: Array<{ dataKey: string; value: number; color: string }>; label?: string }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-gray-900/95 backdrop-blur-sm rounded-xl p-4 shadow-2xl border border-gray-700">
          <p className="text-white font-bold mb-2 text-lg">{label}</p>
          {payload.map((entry) => (
            <div key={entry.dataKey} className="flex items-center gap-2 py-1">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: entry.color }}
              />
              <span className="text-gray-300">{entry.dataKey}:</span>
              <span className="text-white font-bold">{entry.value}%</span>
            </div>
          ))}
        </div>
      )
    }
    return null
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 py-8 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Fancy Header */}
        <div className="text-center mb-8">
          <h1 className="text-5xl font-black bg-gradient-to-r from-blue-400 via-emerald-400 to-amber-400 bg-clip-text text-transparent mb-2 drop-shadow-lg">
            SayDo Trends
          </h1>
          <p className="text-gray-400">Track progress over time</p>
        </div>

        {/* Granularity Toggle - Fancy pills */}
        <div className="flex justify-center mb-8">
          <div className="inline-flex rounded-full bg-gray-800/50 p-1 backdrop-blur-sm border border-gray-700 shadow-xl">
            <button
              onClick={() => setGranularity('day')}
              className={`px-8 py-3 rounded-full text-sm font-bold transition-all duration-300 ${
                granularity === 'day'
                  ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg shadow-blue-500/30 scale-105'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Daily
            </button>
            <button
              onClick={() => setGranularity('week')}
              className={`px-8 py-3 rounded-full text-sm font-bold transition-all duration-300 ${
                granularity === 'week'
                  ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg shadow-blue-500/30 scale-105'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Weekly
            </button>
          </div>
        </div>

        {loading ? (
          <div className="text-center text-gray-400 py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-blue-500 border-t-transparent mb-4" />
            <p>Loading trends...</p>
          </div>
        ) : (
          <>
            {/* Leader Cards - 3D style */}
            <div className="grid grid-cols-3 gap-4 mb-8">
              {currentStats.map((stat, index) => {
                const colors = CHART_COLORS[stat.person]
                const medals = ['🥇', '🥈', '🥉']
                return (
                  <Link
                    key={stat.person}
                    href={`/${stat.person.toLowerCase()}`}
                    onMouseEnter={() => setHoveredPerson(stat.person)}
                    onMouseLeave={() => setHoveredPerson(null)}
                    className={`relative overflow-hidden rounded-2xl p-6 transition-all duration-300 ${
                      hoveredPerson === stat.person ? 'scale-105 z-10' : ''
                    }`}
                    style={{
                      background: `linear-gradient(135deg, ${colors.gradient[0]}22, ${colors.gradient[2]}44)`,
                      boxShadow: hoveredPerson === stat.person
                        ? `0 20px 40px -10px ${colors.main}66, 0 0 60px -15px ${colors.main}44`
                        : `0 10px 30px -10px ${colors.main}33`,
                      border: `1px solid ${colors.gradient[0]}44`,
                    }}
                  >
                    {/* Glow effect */}
                    <div
                      className="absolute inset-0 opacity-20"
                      style={{
                        background: `radial-gradient(circle at 30% 30%, ${colors.main}, transparent 60%)`,
                      }}
                    />

                    <div className="relative">
                      <div className="flex items-center justify-between mb-4">
                        <span className="text-4xl">{medals[index]}</span>
                        <div
                          className="text-4xl font-black"
                          style={{ color: colors.main }}
                        >
                          {stat.ratio}%
                        </div>
                      </div>
                      <div className="text-white text-xl font-bold">{stat.person}</div>
                      <div className="text-gray-400 text-sm mt-1">
                        {stat.done}/{stat.total} tasks
                      </div>
                    </div>

                    {/* Animated bar at bottom */}
                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-800">
                      <div
                        className="h-full transition-all duration-500"
                        style={{
                          width: `${stat.ratio}%`,
                          background: `linear-gradient(90deg, ${colors.gradient[0]}, ${colors.gradient[2]})`,
                        }}
                      />
                    </div>
                  </Link>
                )
              })}
            </div>

            {/* Main Chart - Fancy 3D Area Chart */}
            <div
              className="rounded-3xl p-8 backdrop-blur-sm"
              style={{
                background: 'linear-gradient(135deg, rgba(30,41,59,0.8), rgba(15,23,42,0.9))',
                boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.1)',
                border: '1px solid rgba(255,255,255,0.1)',
              }}
            >
              <ResponsiveContainer width="100%" height={400}>
                <AreaChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                  <defs>
                    {ALL_PERSONS.map((person) => {
                      const colors = CHART_COLORS[person]
                      return (
                        <linearGradient key={person} id={`gradient-${person}`} x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={colors.gradient[0]} stopOpacity={0.8} />
                          <stop offset="50%" stopColor={colors.main} stopOpacity={0.4} />
                          <stop offset="100%" stopColor={colors.gradient[2]} stopOpacity={0.1} />
                        </linearGradient>
                      )
                    })}
                    {/* Glow filters */}
                    {ALL_PERSONS.map((person) => {
                      const colors = CHART_COLORS[person]
                      return (
                        <filter key={`glow-${person}`} id={`glow-${person}`}>
                          <feGaussianBlur stdDeviation="3" result="coloredBlur" />
                          <feMerge>
                            <feMergeNode in="coloredBlur" />
                            <feMergeNode in="SourceGraphic" />
                          </feMerge>
                        </filter>
                      )
                    })}
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                  <XAxis
                    dataKey="label"
                    stroke="rgba(255,255,255,0.5)"
                    tick={{ fill: 'rgba(255,255,255,0.6)', fontSize: 12 }}
                    axisLine={{ stroke: 'rgba(255,255,255,0.2)' }}
                  />
                  <YAxis
                    domain={[0, 100]}
                    stroke="rgba(255,255,255,0.5)"
                    tick={{ fill: 'rgba(255,255,255,0.6)', fontSize: 12 }}
                    axisLine={{ stroke: 'rgba(255,255,255,0.2)' }}
                    tickFormatter={(value) => `${value}%`}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend
                    wrapperStyle={{ paddingTop: '20px' }}
                    formatter={(value) => <span className="text-gray-300">{value}</span>}
                  />
                  {ALL_PERSONS.map((person, index) => {
                    const colors = CHART_COLORS[person]
                    return (
                      <Area
                        key={person}
                        type="monotone"
                        dataKey={person}
                        stroke={colors.main}
                        strokeWidth={3}
                        fill={`url(#gradient-${person})`}
                        filter={`url(#glow-${person})`}
                        style={{
                          opacity: hoveredPerson === null || hoveredPerson === person ? 1 : 0.3,
                          transition: 'opacity 0.3s ease',
                        }}
                      />
                    )
                  })}
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Legend with avatars */}
            <div className="flex justify-center gap-8 mt-6">
              {ALL_PERSONS.map((person) => {
                const colors = CHART_COLORS[person]
                return (
                  <button
                    key={person}
                    onMouseEnter={() => setHoveredPerson(person)}
                    onMouseLeave={() => setHoveredPerson(null)}
                    className={`flex items-center gap-3 px-4 py-2 rounded-full transition-all duration-300 ${
                      hoveredPerson === person
                        ? 'scale-110'
                        : hoveredPerson === null
                        ? 'opacity-100'
                        : 'opacity-50'
                    }`}
                    style={{
                      background: hoveredPerson === person
                        ? `linear-gradient(135deg, ${colors.main}33, transparent)`
                        : 'transparent',
                    }}
                  >
                    <div
                      className="w-4 h-4 rounded-full"
                      style={{
                        background: `linear-gradient(135deg, ${colors.gradient[0]}, ${colors.gradient[2]})`,
                        boxShadow: `0 0 10px ${colors.main}66`,
                      }}
                    />
                    <span className="text-white font-medium">{person}</span>
                  </button>
                )
              })}
            </div>
          </>
        )}

        <p className="text-center text-gray-500 mt-8 text-sm">
          Only tasks due through today are counted. Future tasks don&apos;t affect the ratio.
        </p>
      </div>
    </div>
  )
}
