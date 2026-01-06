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
import { ActivityType, getUserColorById } from '@/lib/types'

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
  avatar_url: string | null
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


function getUserChartColors(userId: string) {
  const colors = getUserColorById(userId)
  // Map Tailwind gradient classes to hex colors for charts
  const colorMap: Record<string, { main: string; gradient: string[] }> = {
    'from-blue-500 to-blue-700': { main: '#3B82F6', gradient: ['#60A5FA', '#3B82F6', '#1D4ED8'] },
    'from-green-500 to-green-700': { main: '#22C55E', gradient: ['#4ADE80', '#22C55E', '#15803D'] },
    'from-orange-500 to-orange-700': { main: '#F97316', gradient: ['#FB923C', '#F97316', '#C2410C'] },
    'from-purple-500 to-purple-700': { main: '#A855F7', gradient: ['#C084FC', '#A855F7', '#7E22CE'] },
    'from-pink-500 to-pink-700': { main: '#EC4899', gradient: ['#F472B6', '#EC4899', '#BE185D'] },
    'from-cyan-500 to-cyan-700': { main: '#06B6D4', gradient: ['#22D3EE', '#06B6D4', '#0E7490'] },
  }
  return colorMap[colors.gradient] || { main: `rgb(${colors.rgb})`, gradient: [`rgb(${colors.rgb})`, `rgb(${colors.rgb})`, `rgb(${colors.rgb})`] }
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
    .map((trend) => {
      const latest = trend.data[trend.data.length - 1]
      return {
        user_id: trend.user_id,
        display_name: trend.display_name,
        avatar_url: trend.avatar_url,
        ratio: latest ? Math.round(latest.ratio * 100) : 0,
        done: latest?.done || 0,
        total: latest?.total || 0,
      }
    })
    .sort((a, b) => b.ratio - a.ratio)

  // Calculate ranks accounting for ties (same ratio = same rank)
  const getRank = (stat: typeof currentStats[0]) => {
    // Rank = number of people with HIGHER ratio + 1
    return currentStats.filter(s => s.ratio > stat.ratio).length + 1
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      {/* Sticky header matching person page style */}
      <div className="sticky top-0 z-30">
        <div className="text-white px-6 py-3 pb-8 relative overflow-hidden bg-gradient-to-br from-purple-600 to-indigo-700">
          <div className="max-w-6xl mx-auto relative z-10">
            {/* Top row: Back link, nav pills, settings */}
            <div className="flex items-center justify-between mb-1">
              <Link href="/" className="text-white/70 hover:text-white text-sm transition-colors">
                &larr; Switch person
              </Link>
              <div className="flex items-center gap-3">
                <div className="inline-flex items-center rounded-full bg-black/20 px-3 py-1 backdrop-blur-sm">
                  <Link
                    href="/"
                    className="text-sm transition-colors px-3 text-white/70 hover:text-white"
                  >
                    Daily
                  </Link>
                  <span className="text-white/30">|</span>
                  <Link
                    href="/"
                    className="text-sm transition-colors px-3 text-white/70 hover:text-white"
                  >
                    Long Term
                  </Link>
                  <span className="text-white/30">|</span>
                  <span className="text-sm px-3 text-white font-semibold">
                    Leaderboard
                  </span>
                </div>
                <Link href="/admin" className="text-white/70 hover:text-white transition-colors p-2 rounded-full hover:bg-black/20" title="Settings">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z"
                    />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                  </svg>
                </Link>
              </div>
            </div>
            {/* Title row */}
            <div className="flex items-center justify-center">
              <h1 className="text-5xl font-black text-white drop-shadow-lg">
                Leaderboard
              </h1>
            </div>
          </div>
        </div>
        {/* Curved bottom edge */}
        <div className="relative bg-indigo-700">
          <svg className="absolute -bottom-6 left-0 right-0 w-full h-6" viewBox="0 0 1440 24" preserveAspectRatio="none">
            <path
              d="M0,0 L1440,0 L1440,0 C960,24 480,24 0,0 Z"
              fill="rgb(67, 56, 202)"
            />
          </svg>
        </div>
      </div>

      <div className="flex-1 pt-8 px-4">
        <div className="max-w-6xl mx-auto">

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
            {/* Granularity toggle */}
            <div className="flex justify-center mb-8">
              <div className="inline-flex rounded-full bg-gray-800/50 p-1 border border-gray-700">
                <button
                  onClick={() => setGranularity('day')}
                  className={'px-6 py-2 rounded-full text-sm font-medium transition-all ' + (granularity === 'day' ? 'bg-gradient-to-r from-purple-500 to-indigo-600 text-white' : 'text-gray-400 hover:text-white')}
                >
                  Daily
                </button>
                <button
                  onClick={() => setGranularity('week')}
                  className={'px-6 py-2 rounded-full text-sm font-medium transition-all ' + (granularity === 'week' ? 'bg-gradient-to-r from-purple-500 to-indigo-600 text-white' : 'text-gray-400 hover:text-white')}
                >
                  Weekly
                </button>
              </div>
            </div>

            {/* Podium display for top 3 */}
            <div className="flex justify-center items-end gap-2 md:gap-4 mb-8 px-2">
              {/* Reorder: 2nd, 1st, 3rd for podium layout */}
              {[currentStats[1], currentStats[0], currentStats[2]].map((stat, podiumIndex) => {
                if (!stat) return null
                const rank = getRank(stat) // 1-based rank accounting for ties
                const chartColors = getUserChartColors(stat.user_id)
                const medals = ['🥇', '🥈', '🥉']
                const medal = rank <= 3 ? medals[rank - 1] : '🏅'

                // All styling based on RANK (for ties), not position
                const podiumHeightsByRank: Record<number, string> = {
                  1: 'h-36',
                  2: 'h-28',
                  3: 'h-20',
                }
                const podiumColorsByRank: Record<number, string> = {
                  1: 'from-yellow-400 to-amber-500', // Gold
                  2: 'from-slate-400 to-slate-500', // Silver
                  3: 'from-amber-600 to-amber-700', // Bronze
                }
                const avatarSizesByRank: Record<number, string> = {
                  1: 'w-28 h-28',
                  2: 'w-20 h-20',
                  3: 'w-16 h-16',
                }
                const textSizesByRank: Record<number, string> = {
                  1: 'text-2xl',
                  2: 'text-lg',
                  3: 'text-base',
                }
                const percentSizesByRank: Record<number, string> = {
                  1: 'text-5xl',
                  2: 'text-3xl',
                  3: 'text-2xl',
                }
                const podiumHeight = podiumHeightsByRank[rank] || 'h-16'
                const podiumColor = podiumColorsByRank[rank] || 'from-gray-500 to-gray-600'
                const avatarSize = avatarSizesByRank[rank] || 'w-14 h-14'
                const textSize = textSizesByRank[rank] || 'text-base'
                const percentSize = percentSizesByRank[rank] || 'text-xl'

                return (
                  <Link
                    key={stat.user_id}
                    href={'/person/' + stat.user_id}
                    onMouseEnter={() => setHoveredUser(stat.user_id)}
                    onMouseLeave={() => setHoveredUser(null)}
                    className={'flex flex-col items-center transition-all ' + (hoveredUser === stat.user_id ? 'scale-105 z-10' : '')}
                  >
                    {/* Avatar and info above podium */}
                    <div className="flex flex-col items-center mb-2">
                      <div className="relative mb-2">
                        <div
                          className={`${avatarSize} rounded-full overflow-hidden`}
                          style={{ boxShadow: `0 0 0 4px ${chartColors.main}, 0 8px 32px rgba(0,0,0,0.3)` }}
                        >
                          {stat.avatar_url ? (
                            <img src={stat.avatar_url} alt={stat.display_name} className="w-full h-full object-cover" />
                          ) : (
                            <div
                              className="w-full h-full flex items-center justify-center text-3xl font-bold text-white"
                              style={{ background: `linear-gradient(135deg, ${chartColors.gradient[0]}, ${chartColors.gradient[2]})` }}
                            >
                              {stat.display_name[0]?.toUpperCase()}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className={`text-white font-bold ${textSize} text-center`}>{stat.display_name}</div>
                      <div className={`font-black ${percentSize}`} style={{ color: chartColors.main }}>
                        {stat.ratio}%
                      </div>
                      <div className="text-gray-400 text-xs">
                        {stat.done}/{stat.total} tasks
                      </div>
                    </div>

                    {/* Podium block - all styling based on rank (for ties) */}
                    <div
                      className={`w-24 md:w-32 ${podiumHeight} rounded-t-xl flex items-center justify-center bg-gradient-to-b ${podiumColor}`}
                      style={{
                        boxShadow: 'inset 0 2px 4px rgba(255,255,255,0.3), 0 4px 12px rgba(0,0,0,0.3)',
                      }}
                    >
                      <span className="text-4xl md:text-5xl drop-shadow-lg">{medal}</span>
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
                    {trends.map((trend) => {
                      const chartColors = getUserChartColors(trend.user_id)
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
                  {trends.map((trend) => {
                    const chartColors = getUserChartColors(trend.user_id)
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
              {trends.map((trend) => {
                const chartColors = getUserChartColors(trend.user_id)
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
                      {hoursData.breakdown.map((b) => {
                        const chartColors = getUserChartColors(b.user_id)
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
                          name={type}
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
                    {hoursData.breakdown.map((b) => {
                      const chartColors = getUserChartColors(b.user_id)
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
                        <span className="text-gray-300 text-sm">{type}</span>
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
    </div>
  )
}
