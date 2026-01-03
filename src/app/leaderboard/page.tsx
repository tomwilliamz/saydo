'use client'

import { useState, useEffect } from 'react'
import LeaderboardCard from '@/components/LeaderboardCard'
import { PersonStats } from '@/lib/types'
import { formatMonth, getCurrentMonth } from '@/lib/utils'

interface LeaderboardResponse {
  month: string
  stats: PersonStats[]
}

export default function LeaderboardPage() {
  const [stats, setStats] = useState<PersonStats[]>([])
  const [loading, setLoading] = useState(true)
  const currentMonth = getCurrentMonth()

  useEffect(() => {
    const fetchStats = async () => {
      setLoading(true)
      try {
        const response = await fetch(`/api/leaderboard?month=${currentMonth}`)
        const data: LeaderboardResponse = await response.json()
        setStats(data.stats)
      } catch (error) {
        console.error('Failed to fetch leaderboard:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchStats()
  }, [currentMonth])

  // Parse month for display
  const [year, month] = currentMonth.split('-')
  const displayDate = new Date(parseInt(year), parseInt(month) - 1)

  return (
    <div className="max-w-3xl mx-auto py-8 px-4">
      <h1 className="text-3xl font-bold text-center text-gray-900 mb-8">
        {formatMonth(displayDate)} Leaderboard
      </h1>

      {loading ? (
        <div className="text-center text-gray-500 py-12">Loading...</div>
      ) : (
        <div className="space-y-6">
          {stats.map((personStats, index) => (
            <LeaderboardCard
              key={personStats.person}
              stats={personStats}
              rank={index}
            />
          ))}
        </div>
      )}

      <p className="text-center text-gray-500 mt-8 text-sm">
        Say/Do ratio: Only &quot;Done&quot; tasks count. Blocked and skipped tasks count against the ratio.
      </p>
    </div>
  )
}
