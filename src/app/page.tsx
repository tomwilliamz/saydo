'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useState, useEffect } from 'react'
import { User, ActivityType, getUserColor, DEFAULT_USER_COLORS } from '@/lib/types'
import SendAlertModal from '@/components/SendAlertModal'
import LongTermTaskForm from '@/components/LongTermTaskForm'

interface UserProgress {
  user: User
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

function UserAvatar({
  user,
  index,
  size = 'large',
}: {
  user: User
  index: number
  size?: 'large' | 'small'
}) {
  const [hasError, setHasError] = useState(false)
  const colors = getUserColor(index)

  const sizeClasses = size === 'large' ? 'w-32 h-32 text-4xl' : 'w-10 h-10 text-lg'

  if (hasError || !user.avatar_url) {
    return (
      <div
        className={`${sizeClasses} rounded-full flex items-center justify-center text-white font-bold bg-gradient-to-br ${colors.gradient}`}
        style={{
          boxShadow: `0 0 20px ${colors.bg.replace('bg-', '')}66`,
        }}
      >
        {user.display_name[0].toUpperCase()}
      </div>
    )
  }

  return (
    <div
      className={`${sizeClasses} rounded-full p-1 bg-gradient-to-br ${colors.gradient}`}
      style={{
        boxShadow: `0 0 20px ${colors.bg.replace('bg-', '')}66`,
      }}
    >
      <Image
        src={user.avatar_url}
        alt={user.display_name}
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
    case 1:
      return '🥇'
    case 2:
      return '🥈'
    case 3:
      return '🥉'
    default:
      return ''
  }
}

function ProgressBar({ progress, rank, index }: { progress: UserProgress; rank: number; index: number }) {
  const colors = getUserColor(index)

  return (
    <Link href={`/person/${progress.user.id}`} className="flex items-center gap-3 w-full hover:scale-105 transition-all duration-300 group">
      <UserAvatar user={progress.user} index={index} size="small" />
      <div className="flex-1 relative h-8 bg-gray-800/50 rounded-full overflow-hidden backdrop-blur-sm">
        <div
          className={`h-full transition-all duration-500 ease-out rounded-full bg-gradient-to-r ${colors.gradient}`}
          style={{
            width: `${Math.max(progress.percentage, 5)}%`,
          }}
        />
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-white/80 text-sm font-bold">{progress.percentage}%</span>
      </div>
      <span className="text-3xl w-10 text-center group-hover:scale-125 transition-transform">{getMedalEmoji(rank)}</span>
    </Link>
  )
}

export default function HomePage() {
  const [familyMembers, setFamilyMembers] = useState<User[]>([])
  const [progressData, setProgressData] = useState<UserProgress[]>([])
  const [initialLoading, setInitialLoading] = useState(true)
  const [period, setPeriod] = useState<TimePeriod>('today')
  const [hoveredUserId, setHoveredUserId] = useState<string | null>(null)
  const [showAlertModal, setShowAlertModal] = useState(false)
  const [showLongTermForm, setShowLongTermForm] = useState(false)
  const [selectedUserForTask, setSelectedUserForTask] = useState<User | null>(null)

  // Fetch family members on mount
  useEffect(() => {
    async function fetchFamilyMembers() {
      try {
        const response = await fetch('/api/families')
        const data = await response.json()

        // Collect all unique users from all families
        const usersMap = new Map<string, User>()
        for (const family of data.families || []) {
          for (const member of family.members || []) {
            if (member.user) {
              usersMap.set(member.user.id, member.user)
            }
          }
        }

        // Also get current user if not in a family
        const userResponse = await fetch('/api/users')
        const userData = await userResponse.json()
        if (userData.profile) {
          usersMap.set(userData.profile.id, userData.profile)
        }

        setFamilyMembers(Array.from(usersMap.values()))
      } catch (error) {
        console.error('Failed to fetch family members:', error)
      }
    }

    fetchFamilyMembers()
  }, [])

  // Fetch progress stats
  useEffect(() => {
    async function fetchProgress() {
      if (familyMembers.length === 0) {
        setInitialLoading(false)
        return
      }

      try {
        const response = await fetch(`/api/stats?period=${period}`)
        const data = await response.json()

        // Map stats to our progress format
        const progress: UserProgress[] =
          data.stats?.map((s: { user_id: string; done: number; total: number; ratio: number }) => {
            const user = familyMembers.find((u) => u.id === s.user_id)
            return {
              user: user || { id: s.user_id, display_name: 'Unknown', email: '', avatar_url: null, cycle_weeks: 1, cycle_start_date: '', is_superadmin: false, created_at: '' },
              done: s.done,
              total: s.total,
              percentage: Math.round(s.ratio * 100),
            }
          }) || []

        setProgressData(progress)
      } catch (error) {
        console.error('Failed to fetch progress:', error)
      } finally {
        setInitialLoading(false)
      }
    }

    fetchProgress()
  }, [period, familyMembers])

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

  const handleCreateLongTermTask = async (data: { title: string; category: ActivityType; due_date?: string; default_estimate_minutes?: number }) => {
    if (!selectedUserForTask) return

    try {
      await fetch('/api/long-term-tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, user_id: selectedUserForTask.id }),
      })
    } catch (error) {
      console.error('Failed to create task:', error)
    }

    setShowLongTermForm(false)
    setSelectedUserForTask(null)
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
      <div className="flex justify-between items-center p-6 relative z-30">
        {/* Alert button - top left */}
        <button
          onClick={() => setShowAlertModal(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-red-500/20 to-orange-500/20 border border-red-500/30 hover:from-red-500/30 hover:to-orange-500/30 transition-all hover:scale-105"
        >
          <span className="text-2xl">📢</span>
          <span className="text-white font-medium">Alert</span>
        </button>

        {/* Right nav */}
        <div className="flex items-center gap-3">
          <div className="inline-flex items-center rounded-full bg-gray-800/50 px-4 py-2 backdrop-blur-sm border border-gray-700">
            <Link href="/leaderboard" className="text-gray-400 hover:text-white transition-colors px-3">
              Leaderboard
            </Link>
            <span className="text-gray-600">|</span>
            <button
              onClick={async () => {
                const { createClient } = await import('@/lib/supabase/client')
                const supabase = createClient()
                await supabase.auth.signOut()
                window.location.href = '/login'
              }}
              className="text-gray-400 hover:text-white transition-colors px-3"
            >
              Logout
            </button>
          </div>
          <Link href="/admin" className="text-gray-400 hover:text-white transition-colors p-2 rounded-full hover:bg-gray-700/50" title="Settings">
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
            <span className="bg-gradient-to-r from-blue-400 via-emerald-400 to-amber-400 bg-clip-text text-transparent">Say</span>
            <span className="font-black bg-gradient-to-r from-amber-400 via-emerald-400 to-blue-400 bg-clip-text text-transparent">Do</span>
            <span className="text-gray-400 ml-4">Central</span>
          </h1>
        </div>

        {/* User cards */}
        {familyMembers.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
            {familyMembers.map((user, index) => {
              const colors = getUserColor(index)
              const isHovered = hoveredUserId === user.id
              return (
                <Link
                  key={user.id}
                  href={`/person/${user.id}`}
                  onMouseEnter={() => setHoveredUserId(user.id)}
                  onMouseLeave={() => setHoveredUserId(null)}
                  className={`relative overflow-hidden flex flex-col items-center justify-center
                    w-52 h-60 rounded-3xl transition-all duration-300
                    ${isHovered ? 'scale-110 z-10' : ''}`}
                  style={{
                    background: `linear-gradient(135deg, rgba(${colors.rgb},0.15), rgba(${colors.rgb},0.05))`,
                    boxShadow: isHovered ? `0 25px 50px -10px rgba(${colors.rgb},0.5)` : `0 15px 40px -10px rgba(${colors.rgb},0.25)`,
                    border: `1px solid rgba(${colors.rgb},0.3)`,
                  }}
                >
                  {/* Glow effect */}
                  <div
                    className="absolute inset-0 opacity-40"
                    style={{
                      background: `radial-gradient(circle at 50% 30%, rgba(${colors.rgb},0.6), transparent 60%)`,
                    }}
                  />

                  <div className="relative z-10">
                    <UserAvatar user={user} index={index} />
                    <div className="text-2xl font-bold text-white mt-4 text-center">{user.display_name}</div>
                  </div>

                  {/* Bottom accent bar */}
                  <div className="absolute bottom-0 left-0 right-0 h-1">
                    <div className={`h-full w-full bg-gradient-to-r ${colors.gradient}`} />
                  </div>
                </Link>
              )
            })}
          </div>
        ) : (
          <div className="text-center text-gray-400 mb-12">
            <p>No family members yet.</p>
            <Link href="/admin" className="text-blue-400 hover:text-blue-300 underline">
              Create or join a family
            </Link>
          </div>
        )}

        {/* Alert Modal */}
        {showAlertModal && <SendAlertModal onClose={() => setShowAlertModal(false)} />}

        {/* User selector for Long Term task */}
        {showLongTermForm && !selectedUserForTask && familyMembers.length > 0 && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-gray-800 rounded-2xl w-full max-w-sm shadow-2xl border border-gray-700 p-6">
              <h2 className="text-xl font-bold text-white mb-4 text-center">Create Long Term Task for...</h2>
              <div className="grid grid-cols-3 gap-4">
                {familyMembers.map((user, index) => {
                  const colors = getUserColor(index)
                  return (
                    <button
                      key={user.id}
                      onClick={() => setSelectedUserForTask(user)}
                      className={`flex flex-col items-center gap-2 p-4 rounded-xl transition-all hover:scale-105 bg-gradient-to-br ${colors.gradient} bg-opacity-20`}
                      style={{
                        border: `1px solid rgba(96,165,250,0.2)`,
                      }}
                    >
                      <UserAvatar user={user} index={index} size="small" />
                      <span className="text-white font-medium">{user.display_name}</span>
                    </button>
                  )
                })}
              </div>
              <button onClick={() => setShowLongTermForm(false)} className="w-full mt-4 py-2 text-gray-400 hover:text-white transition-colors">
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Long Term Task Form */}
        {showLongTermForm && selectedUserForTask && (
          <LongTermTaskForm
            onSave={handleCreateLongTermTask}
            onCancel={() => {
              setShowLongTermForm(false)
              setSelectedUserForTask(null)
            }}
          />
        )}

        {/* Progress with cycling periods */}
        {progressData.length > 0 && (
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
                {progressData.map((progress, index) => {
                  const sortedPercentages = [...new Set(progressData.map((p) => p.percentage))].sort((a, b) => b - a)
                  const rank = sortedPercentages.indexOf(progress.percentage) + 1
                  return <ProgressBar key={progress.user.id} progress={progress} rank={rank} index={index} />
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Floating add button for Long Term tasks */}
      {familyMembers.length > 0 && (
        <button
          onClick={() => setShowLongTermForm(true)}
          className="fixed bottom-6 right-6 w-14 h-14 rounded-full text-white text-3xl shadow-lg hover:scale-110 transition-transform z-20"
          style={{
            background: 'linear-gradient(135deg, #60A5FA, #1E40AF)',
            boxShadow: '0 10px 30px rgba(59, 130, 246, 0.4)',
          }}
          title="Create Long Term Task"
        >
          +
        </button>
      )}
    </div>
  )
}
