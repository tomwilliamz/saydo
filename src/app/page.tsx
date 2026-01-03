'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useState, useEffect } from 'react'
import { ALL_PERSONS, PERSON_COLORS, PERSON_AVATARS, Person } from '@/lib/types'

interface PersonProgress {
  person: Person
  done: number
  total: number
  percentage: number
}

type TimePeriod = 'today' | 'week' | 'month' | 'all'

const PERIOD_LABELS: Record<TimePeriod, string> = {
  today: "Today's SayDo Leader",
  week: "This Week's SayDo Leader",
  month: "This Month's SayDo Leader",
  all: 'All Time SayDo Leader',
}

// Color configs for 3D effects - matching leaderboard
const CHART_COLORS = {
  Thomas: { main: '#3B82F6', gradient: ['#60A5FA', '#2563EB', '#1E40AF'] },
  Ivor: { main: '#10B981', gradient: ['#34D399', '#059669', '#047857'] },
  Axel: { main: '#F59E0B', gradient: ['#FBBF24', '#D97706', '#B45309'] },
}

function PersonAvatar({ person, size = 'large' }: { person: Person; size?: 'large' | 'small' }) {
  const [hasError, setHasError] = useState(false)
  const colors = CHART_COLORS[person]

  const sizeClasses = size === 'large'
    ? 'w-32 h-32 text-4xl'
    : 'w-10 h-10 text-lg'

  if (hasError) {
    return (
      <div
        className={`${sizeClasses} rounded-full flex items-center justify-center text-white font-bold`}
        style={{
          background: `linear-gradient(135deg, ${colors.gradient[0]}, ${colors.gradient[2]})`,
          boxShadow: `0 0 20px ${colors.main}66`,
        }}
      >
        {person[0]}
      </div>
    )
  }

  return (
    <div
      className={`${sizeClasses} rounded-full p-1`}
      style={{
        background: `linear-gradient(135deg, ${colors.gradient[0]}, ${colors.gradient[2]})`,
        boxShadow: `0 0 20px ${colors.main}66`,
      }}
    >
      <Image
        src={PERSON_AVATARS[person]}
        alt={person}
        width={size === 'large' ? 128 : 40}
        height={size === 'large' ? 128 : 40}
        className="w-full h-full rounded-full object-cover"
        onError={() => setHasError(true)}
      />
    </div>
  )
}

function getMedalEmoji(rank: number): string {
  switch (rank) {
    case 1: return '🥇'
    case 2: return '🥈'
    case 3: return '🥉'
    default: return ''
  }
}

function ProgressBar({ progress, rank }: { progress: PersonProgress; rank: number }) {
  const colors = CHART_COLORS[progress.person]

  return (
    <Link
      href={`/${progress.person.toLowerCase()}`}
      className="flex items-center gap-3 w-full hover:scale-105 transition-all duration-300 group"
    >
      <PersonAvatar person={progress.person} size="small" />
      <div className="flex-1 relative h-8 bg-gray-800/50 rounded-full overflow-hidden backdrop-blur-sm">
        <div
          className="h-full transition-all duration-500 ease-out rounded-full"
          style={{
            width: `${Math.max(progress.percentage, 5)}%`,
            background: `linear-gradient(90deg, ${colors.gradient[0]}, ${colors.gradient[2]})`,
            boxShadow: `0 0 20px ${colors.main}66`,
          }}
        />
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-white/80 text-sm font-bold">
          {progress.percentage}%
        </span>
      </div>
      <span className="text-3xl w-10 text-center group-hover:scale-125 transition-transform">
        {getMedalEmoji(rank)}
      </span>
    </Link>
  )
}

export default function HomePage() {
  const [progressData, setProgressData] = useState<PersonProgress[]>([])
  const [initialLoading, setInitialLoading] = useState(true)
  const [period, setPeriod] = useState<TimePeriod>('today')
  const [hoveredPerson, setHoveredPerson] = useState<Person | null>(null)

  useEffect(() => {
    async function fetchProgress() {
      try {
        const response = await fetch(`/api/stats?period=${period}`)
        const data = await response.json()

        const progress: PersonProgress[] = data.stats.map((s: { person: Person; done: number; total: number; ratio: number }) => ({
          person: s.person,
          done: s.done,
          total: s.total,
          percentage: Math.round(s.ratio * 100),
        }))

        setProgressData(progress)
      } catch (error) {
        console.error('Failed to fetch progress:', error)
      } finally {
        setInitialLoading(false)
      }
    }

    fetchProgress()
  }, [period])

  // Auto-cycle through periods
  useEffect(() => {
    const interval = setInterval(() => {
      setPeriod((current) => {
        if (current === 'today') return 'week'
        if (current === 'week') return 'month'
        if (current === 'month') return 'all'
        return 'today'
      })
    }, 5000)

    return () => clearInterval(interval)
  }, [])

  const handlePeriodClick = () => {
    setPeriod((current) => {
      if (current === 'today') return 'week'
      if (current === 'week') return 'month'
      if (current === 'month') return 'all'
      return 'today'
    })
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex flex-col">
      {/* Animated background particles */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute top-1/2 right-1/3 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }} />
      </div>

      {/* Header with nav links */}
      <div className="flex justify-end p-6 relative z-10">
        <div className="inline-flex rounded-full bg-gray-800/50 px-4 py-2 backdrop-blur-sm border border-gray-700">
          <Link
            href="/leaderboard"
            className="text-gray-400 hover:text-white transition-colors px-3"
          >
            Trends
          </Link>
          <span className="text-gray-600">|</span>
          <Link
            href="/admin"
            className="text-gray-400 hover:text-white transition-colors px-3"
          >
            Admin
          </Link>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col items-center justify-center px-8 -mt-16 relative z-10">
        {/* Logo */}
        <div
          className="rounded-2xl px-12 py-6 mb-12"
          style={{
            background: 'linear-gradient(135deg, rgba(30,41,59,0.6), rgba(15,23,42,0.8))',
            boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.1)',
            border: '1px solid rgba(255,255,255,0.1)',
          }}
        >
          <h1 className="text-7xl font-light">
            <span className="bg-gradient-to-r from-blue-400 via-emerald-400 to-amber-400 bg-clip-text text-transparent">
              Say
            </span>
            <span className="font-black bg-gradient-to-r from-amber-400 via-emerald-400 to-blue-400 bg-clip-text text-transparent">
              Do
            </span>
            <span className="text-gray-400 ml-4">Central</span>
          </h1>
        </div>

        {/* Person cards */}
        <div className="grid grid-cols-3 gap-6 mb-12">
          {ALL_PERSONS.map((person) => {
            const colors = CHART_COLORS[person]
            const isHovered = hoveredPerson === person
            return (
              <Link
                key={person}
                href={`/${person.toLowerCase()}`}
                onMouseEnter={() => setHoveredPerson(person)}
                onMouseLeave={() => setHoveredPerson(null)}
                className={`relative overflow-hidden flex flex-col items-center justify-center
                  w-52 h-60 rounded-3xl transition-all duration-300
                  ${isHovered ? 'scale-110 z-10' : ''}`}
                style={{
                  background: `linear-gradient(135deg, ${colors.gradient[0]}22, ${colors.gradient[2]}44)`,
                  boxShadow: isHovered
                    ? `0 25px 50px -10px ${colors.main}66, 0 0 80px -15px ${colors.main}44`
                    : `0 15px 40px -10px ${colors.main}33`,
                  border: `1px solid ${colors.gradient[0]}44`,
                }}
              >
                {/* Glow effect */}
                <div
                  className="absolute inset-0 opacity-30"
                  style={{
                    background: `radial-gradient(circle at 50% 30%, ${colors.main}, transparent 60%)`,
                  }}
                />

                <div className="relative z-10">
                  <PersonAvatar person={person} />
                  <div className="text-2xl font-bold text-white mt-4 text-center">{person}</div>
                </div>

                {/* Bottom accent bar */}
                <div className="absolute bottom-0 left-0 right-0 h-1">
                  <div
                    className="h-full w-full"
                    style={{
                      background: `linear-gradient(90deg, transparent, ${colors.gradient[0]}, ${colors.gradient[2]}, transparent)`,
                    }}
                  />
                </div>
              </Link>
            )
          })}
        </div>

        {/* Progress with cycling periods */}
        <div
          className="w-full max-w-lg p-6 rounded-2xl mb-8"
          style={{
            background: 'linear-gradient(135deg, rgba(30,41,59,0.6), rgba(15,23,42,0.8))',
            boxShadow: '0 25px 50px -12px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.1)',
            border: '1px solid rgba(255,255,255,0.1)',
          }}
        >
          <button
            onClick={handlePeriodClick}
            className="w-full text-lg font-bold bg-gradient-to-r from-blue-400 via-emerald-400 to-amber-400 bg-clip-text text-transparent mb-6 text-center hover:opacity-80 transition-opacity cursor-pointer"
          >
            {PERIOD_LABELS[period]}
          </button>
          {initialLoading ? (
            <div className="text-center py-4">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-blue-500 border-t-transparent" />
            </div>
          ) : (
            <div className="space-y-4">
              {progressData.map((progress) => {
                const sortedPercentages = [...new Set(progressData.map(p => p.percentage))].sort((a, b) => b - a)
                const rank = sortedPercentages.indexOf(progress.percentage) + 1
                return (
                  <ProgressBar key={progress.person} progress={progress} rank={rank} />
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
