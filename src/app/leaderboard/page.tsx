'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'
import { ActivityType, getUserColor } from '@/lib/types'

type Granularity = 'day' | 'week'

interface TrendDataPoint {
  label: string
  date: string
  ratio: number
  done: number
  total: number
}

interface UserTrend {
  user_id: string
  display_name: string
  data: TrendDataPoint[]
}

interface HoursBreakdown {
  user_id: string
  display_name: string
  totalHours: number
  hoursPerWeek: number
  hoursPerDay: number
  byType: {
    type: ActivityType
    hours: number
    percentage: number
  }[]
}

interface HoursData {
  period: string
  doneOnly: boolean
  days: number
  weeks: number
  breakdown: HoursBreakdown[]
  totals: {
    totalHours: number
    hoursPerWeek: number
    hoursPerDay: number
    byType: { type: ActivityType; hours: number; percentage: number }[]
  }
}

const TYPE_COLORS: Record<ActivityType, { main: string; gradient: string[] }> = {
  Home: { main: '#EC4899', gradient: ['#F472B6', '#DB2777', '#BE185D'] },
  Brain: { main: '#8B5CF6', gradient: ['#A78BFA', '#7C3AED', '#6D28D9'] },
  Body: { main: '#10B981', gradient: ['#34D399', '#059669', '#047857'] },
  Downtime: { main: '#F59E0B', gradient: ['#FBBF24', '#D97706', '#B45309'] },
}

const TYPE_EMOJIS: Record<ActivityType, string> = {
  Home: '🏠',
  Brain: '🧠',
  Body: '💪',
  Downtime: '🎮',
}

function getUserChartColors(index: number) {
  const colors = getUserColor(index)
  const colorMap: Record<string, { main: string; gradient: string[] }> = {
    'from-blue-500 to-indigo-600': { main: '#3B82F6', gradient: ['#60A5FA', '#3B82F6', '#4F46E5'] },
    'from-emerald-500 to-teal-600': { main: '#10B981', gradient: ['#34D399', '#10B981', '#0D9488'] },
    'from-amber-500 to-orange-600': { main: '#F59E0B', gradient: ['#FBBF24', '#F59E0B', '#EA580C'] },
    'from-pink-500 to-rose-600': { main: '#EC4899', gradient: ['#F472B6', '#EC4899', '#E11D48'] },
    'from-purple-500 to-violet-600': { main: '#8B5CF6', gradient: ['#A78BFA', '#8B5CF6', '#7C3AED'] },
    'from-cyan-500 to-sky-600': { main: '#06B6D4', gradient: ['#22D3EE', '#06B6D4', '#0284C7'] },
  }
  return colorMap[colors.gradient] || colorMap['from-blue-500 to-indigo-600']
}

export default function LeaderboardPage() {
  const [trends, setTrends] = useState<UserTrend[]>([])
  const [hoursData, setHoursData] = useState<HoursData | null>(null)
  const [loading, setLoading] = useState(true)
  const [granularity, setGranularity] = useState<Granularity>('day')
  const [hoveredUser, setHoveredUser] = useState<string | null>(null)
  const [doneOnly, setDoneOnly] = useState(false)

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      try {
        const [trendsRes, hoursRes] = await Promise.all([
          fetch('/api/trends?granularity=' + granularity),
          fetch('/api/hours?period=month&doneOnly=' + doneOnly),
        ])
        const trendsData = await trendsRes.json()
        const hoursJson = await hoursRes.json()
        setTrends(trendsData.trends || [])
        setHoursData(hoursJson)
      } catch (error) {
        console.error('Failed to fetch data:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [granularity, doneOnly])

  const maxBars = granularity === 'day' ? 14 : 12
  const chartData =
    trends.length > 0
      ? trends[0].data.slice(-maxBars).map((point, i) => {
          const entry: Record<string, string | number> = { label: point.label, date: point.date }
          trends.forEach((trend) => {
            const dataPoint = trend.data.slice(-maxBars)[i]
            entry[trend.display_name] = dataPoint ? Math.round(dataPoint.ratio * 100) : 0
          })
          return entry
        })
      : []

  const currentStats = trends
    .map((trend, index) => {
      const latest = trend.data[trend.data.length - 1]
      return {
        user_id: trend.user_id,
        display_name: trend.display_name,
        ratio: latest ? Math.round(latest.ratio * 100) : 0,
        done: latest?.done || 0,
        total: latest?.total || 0,
        colorIndex: index,
      }
    })
    .sort((a, b) => b.ratio - a.ratio)

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 py-8 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-5xl font-black bg-gradient-to-r from-blue-400 via-emerald-400 to-amber-400 bg-clip-text text-transparent mb-2">
            SayDo Trends
          </h1>
          <p className="text-gray-400">Track progress over time</p>
          <Link href="/" className="text-gray-500 hover:text-white text-sm mt-2 inline-block">
            ← Back to Home
          </Link>
        </div>

        <div className="flex justify-center mb-8">
          <div className="inline-flex rounded-full bg-gray-800/50 p-1 border border-gray-700">
            <button
              onClick={() => setGranularity('day')}
              className={'px-8 py-3 rounded-full text-sm font-bold transition-all ' + (granularity === 'day' ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white' : 'text-gray-400 hover:text-white')}
            >
              Daily
            </button>
            <button
              onClick={() => setGranularity('week')}
              className={'px-8 py-3 rounded-full text-sm font-bold transition-all ' + (granularity === 'week' ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white' : 'text-gray-400 hover:text-white')}
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
        ) : trends.length === 0 ? (
          <div className="text-center text-gray-400 py-12">
            <p>No trend data available yet.</p>
            <p className="text-sm mt-2">Complete some tasks to see your progress!</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
              {currentStats.map((stat, index) => {
                const chartColors = getUserChartColors(stat.colorIndex)
                const medals = ['🥇', '🥈', '🥉']
                return (
                  <Link
                    key={stat.user_id}
                    href={'/person/' + stat.user_id}
                    onMouseEnter={() => setHoveredUser(stat.user_id)}
                    onMouseLeave={() => setHoveredUser(null)}
                    className={'relative overflow-hidden rounded-2xl p-6 transition-all ' + (hoveredUser === stat.user_id ? 'scale-105 z-10' : '')}
                    style={{
                      background: 'linear-gradient(135deg, ' + chartColors.gradient[0] + '22, ' + chartColors.gradient[2] + '44)',
                      border: '1px solid ' + chartColors.gradient[0] + '44',
                    }}
                  >
                    <div className="relative">
                      <div className="flex items-center justify-between mb-4">
                        <span className="text-4xl">{medals[index] || '🏅'}</span>
                        <div className="text-4xl font-black" style={{ color: chartColors.main }}>
                          {stat.ratio}%
                        </div>
                      </div>
                      <div className="text-white text-xl font-bold">{stat.display_name}</div>
                      <div className="text-gray-400 text-sm mt-1">
                        {stat.done}/{stat.total} tasks
                      </div>
                    </div>
                  </Link>
                )
              })}
            </div>

            <div
              className="rounded-3xl p-8"
              style={{
                background: 'linear-gradient(135deg, rgba(30,41,59,0.8), rgba(15,23,42,0.9))',
                border: '1px solid rgba(255,255,255,0.1)',
              }}
            >
              <ResponsiveContainer width="100%" height={400}>
                <AreaChart data={chartData}>
                  <defs>
                    {trends.map((trend, index) => {
                      const chartColors = getUserChartColors(index)
                      return (
                        <linearGradient key={trend.user_id} id={'gradient-' + trend.user_id} x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={chartColors.gradient[0]} stopOpacity={0.8} />
                          <stop offset="100%" stopColor={chartColors.gradient[2]} stopOpacity={0.1} />
                        </linearGradient>
                      )
                    })}
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                  <XAxis dataKey="label" stroke="rgba(255,255,255,0.5)" tick={{ fill: 'rgba(255,255,255,0.6)', fontSize: 12 }} />
                  <YAxis domain={[0, 100]} stroke="rgba(255,255,255,0.5)" tick={{ fill: 'rgba(255,255,255,0.6)', fontSize: 12 }} tickFormatter={(v) => v + '%'} />
                  <Tooltip />
                  <Legend />
                  {trends.map((trend, index) => {
                    const chartColors = getUserChartColors(index)
                    return (
                      <Area
                        key={trend.user_id}
                        type="monotone"
                        dataKey={trend.display_name}
                        stroke={chartColors.main}
                        strokeWidth={3}
                        fill={'url(#gradient-' + trend.user_id + ')'}
                        style={{ opacity: hoveredUser === null || hoveredUser === trend.user_id ? 1 : 0.3 }}
                      />
                    )
                  })}
                </AreaChart>
              </ResponsiveContainer>
            </div>

            <div className="flex justify-center gap-8 mt-6 flex-wrap">
              {trends.map((trend, index) => {
                const chartColors = getUserChartColors(index)
                return (
                  <button
                    key={trend.user_id}
                    onMouseEnter={() => setHoveredUser(trend.user_id)}
                    onMouseLeave={() => setHoveredUser(null)}
                    className={'flex items-center gap-3 px-4 py-2 rounded-full transition-all ' + (hoveredUser === trend.user_id ? 'scale-110' : hoveredUser === null ? 'opacity-100' : 'opacity-50')}
                  >
                    <div className="w-4 h-4 rounded-full" style={{ background: chartColors.main }} />
                    <span className="text-white font-medium">{trend.display_name}</span>
                  </button>
                )
              })}
            </div>

            {hoursData && hoursData.breakdown && hoursData.breakdown.length > 0 && (
              <div className="mt-12">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-3xl font-black bg-gradient-to-r from-pink-400 via-purple-400 to-indigo-400 bg-clip-text text-transparent">
                    Time Investment
                  </h2>
                  <button
                    onClick={() => setDoneOnly(!doneOnly)}
                    className={'px-4 py-2 rounded-lg text-sm ' + (doneOnly ? 'bg-emerald-500 text-white' : 'bg-gray-700 text-gray-300')}
                  >
                    {doneOnly ? 'Done Only' : 'All Scheduled'}
                  </button>
                </div>

                <div className="rounded-2xl p-6 mb-6" style={{ background: 'linear-gradient(135deg, rgba(30,41,59,0.8), rgba(15,23,42,0.9))', border: '1px solid rgba(255,255,255,0.1)' }}>
                  <h3 className="text-lg font-bold text-white mb-4">Hours Summary</h3>
                  <table className="w-full">
                    <thead>
                      <tr className="text-gray-400 text-sm">
                        <th className="text-left py-2">Person</th>
                        <th className="text-right py-2">Total</th>
                        <th className="text-right py-2">Per Week</th>
                        <th className="text-right py-2">Per Day</th>
                      </tr>
                    </thead>
                    <tbody>
                      {hoursData.breakdown.map((b, index) => {
                        const chartColors = getUserChartColors(index)
                        return (
                          <tr key={b.user_id} className="border-t border-gray-700/50">
                            <td className="py-3"><span style={{ color: chartColors.main }}>{b.display_name}</span></td>
                            <td className="text-right text-white">{b.totalHours}h</td>
                            <td className="text-right text-gray-300">{b.hoursPerWeek}h</td>
                            <td className="text-right text-gray-300">{b.hoursPerDay}h</td>
                          </tr>
                        )
                      })}
                      <tr className="border-t-2 border-gray-600 font-bold">
                        <td className="py-3 text-white">Total</td>
                        <td className="text-right text-white">{hoursData.totals.totalHours}h</td>
                        <td className="text-right text-gray-300">{hoursData.totals.hoursPerWeek}h</td>
                        <td className="text-right text-gray-300">{hoursData.totals.hoursPerDay}h</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div className="rounded-2xl p-6" style={{ background: 'linear-gradient(135deg, rgba(30,41,59,0.8), rgba(15,23,42,0.9))', border: '1px solid rgba(255,255,255,0.1)' }}>
                  <h3 className="text-lg font-bold text-white mb-4">Hours by Category</h3>
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={hoursData.breakdown}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                      <XAxis dataKey="display_name" stroke="rgba(255,255,255,0.5)" tick={{ fill: 'rgba(255,255,255,0.6)', fontSize: 12 }} />
                      <YAxis stroke="rgba(255,255,255,0.5)" tick={{ fill: 'rgba(255,255,255,0.6)', fontSize: 12 }} tickFormatter={(v) => v + 'h'} />
                      <Tooltip />
                      <Legend />
                      {(['Home', 'Brain', 'Body', 'Downtime'] as ActivityType[]).map((type) => (
                        <Bar
                          key={type}
                          dataKey={(d: HoursBreakdown) => d.byType.find((t) => t.type === type)?.hours || 0}
                          name={TYPE_EMOJIS[type] + ' ' + type}
                          fill={TYPE_COLORS[type].main}
                          radius={[4, 4, 0, 0]}
                        />
                      ))}
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div className="rounded-2xl p-6 mt-6" style={{ background: 'linear-gradient(135deg, rgba(30,41,59,0.8), rgba(15,23,42,0.9))', border: '1px solid rgba(255,255,255,0.1)' }}>
                  <h3 className="text-lg font-bold text-white mb-4">Time Distribution</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {hoursData.breakdown.map((b, index) => {
                      const chartColors = getUserChartColors(index)
                      return (
                        <div key={b.user_id} className="text-center">
                          <h4 className="text-white font-medium mb-2" style={{ color: chartColors.main }}>{b.display_name}</h4>
                          <ResponsiveContainer width="100%" height={150}>
                            <PieChart>
                              <Pie
                                data={b.byType.filter((t) => t.hours > 0)}
                                dataKey="hours"
                                nameKey="type"
                                cx="50%"
                                cy="50%"
                                innerRadius={30}
                                outerRadius={55}
                                paddingAngle={2}
                              >
                                {b.byType.filter((t) => t.hours > 0).map((t) => (
                                  <Cell key={t.type} fill={TYPE_COLORS[t.type].main} />
                                ))}
                              </Pie>
                              <Tooltip formatter={(value) => [value + 'h', '']} />
                            </PieChart>
                          </ResponsiveContainer>
                        </div>
                      )
                    })}
                  </div>
                  <div className="flex justify-center gap-6 mt-4 flex-wrap">
                    {(['Home', 'Brain', 'Body', 'Downtime'] as ActivityType[]).map((type) => (
                      <div key={type} className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ background: TYPE_COLORS[type].main }} />
                        <span className="text-gray-300 text-sm">{TYPE_EMOJIS[type]} {type}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
