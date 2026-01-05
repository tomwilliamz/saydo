'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useSearchParams, useRouter } from 'next/navigation'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { format } from 'date-fns'
import confetti from 'canvas-confetti'
import TaskRow from '@/components/TaskRow'
import DurationModal from '@/components/DurationModal'
import LongTermTaskList from '@/components/LongTermTaskList'
import { DailyTask, Person, ALL_PERSONS } from '@/lib/types'
import {
  formatDateForDB,
  getTomorrow,
  getYesterday,
  isPast,
  isToday,
  parseDate,
} from '@/lib/utils'

interface DailyResponse {
  date: string
  weekOfCycle: number
  dayOfWeek: number
  tasks: DailyTask[]
}

// Color configs for 3D effects
const CHART_COLORS = {
  Thomas: { main: '#3B82F6', gradient: ['#60A5FA', '#2563EB', '#1E40AF'] },
  Ivor: { main: '#10B981', gradient: ['#34D399', '#059669', '#047857'] },
  Axel: { main: '#F59E0B', gradient: ['#FBBF24', '#D97706', '#B45309'] },
}

export default function PersonPage() {
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const dateParam = searchParams.get('date')

  // Validate and normalize person param
  const personParam = (params.person as string)?.toLowerCase()
  const person = ALL_PERSONS.find((p) => p.toLowerCase() === personParam) as Person | undefined

  const [currentDate, setCurrentDate] = useState<Date>(() => {
    if (dateParam) {
      return parseDate(dateParam)
    }
    return new Date()
  })

  const [tasks, setTasks] = useState<DailyTask[]>([])
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [durationModal, setDurationModal] = useState<{
    isOpen: boolean
    task: DailyTask | null
    elapsedMinutes: number
  }>({ isOpen: false, task: null, elapsedMinutes: 0 })
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [activeView, setActiveView] = useState<'daily' | 'long-term'>('daily')

  const fetchTasks = useCallback(async (date: Date) => {
    if (!person) return
    setLoading(true)
    try {
      const response = await fetch(`/api/daily?date=${formatDateForDB(date)}`)
      const data: DailyResponse = await response.json()
      // Filter tasks for this person only
      const personTasks = data.tasks.filter((t) => t.person === person)
      setTasks(personTasks)
    } catch (error) {
      console.error('Failed to fetch tasks:', error)
    } finally {
      setLoading(false)
    }
  }, [person])

  useEffect(() => {
    fetchTasks(currentDate)
  }, [currentDate, fetchTasks])

  // If invalid person, show 404
  if (!person) {
    notFound()
  }

  const colors = CHART_COLORS[person]

  const handleDateChange = (newDate: Date) => {
    setCurrentDate(newDate)
    router.push(`/${person.toLowerCase()}?date=${formatDateForDB(newDate)}`, { scroll: false })
  }

  // Optimistic update helper
  const updateTaskLocally = (activityId: string, updates: Partial<DailyTask['completion']>) => {
    setTasks((prev) =>
      prev.map((t) => {
        if (t.activity.id !== activityId) return t

        const baseCompletion = t.completion ?? {
          id: 'temp-' + Date.now(),
          activity_id: activityId,
          person,
          date: formatDateForDB(currentDate),
          status: 'started' as const,
          started_at: null,
          completed_at: null,
          elapsed_ms: null,
          created_at: new Date().toISOString(),
        }

        return {
          ...t,
          completion: {
            ...baseCompletion,
            ...updates,
            elapsed_ms: updates?.elapsed_ms ?? baseCompletion.elapsed_ms,
          },
        }
      })
    )
  }

  const removeCompletionLocally = (activityId: string) => {
    setTasks((prev) =>
      prev.map((t) =>
        t.activity.id === activityId ? { ...t, completion: null } : t
      )
    )
  }

  const handleStart = async (task: DailyTask) => {
    const now = new Date().toISOString()
    updateTaskLocally(task.activity.id, {
      status: 'started',
      started_at: now,
    })
    setSelectedTaskId(task.activity.id)

    try {
      await fetch('/api/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          activity_id: task.activity.id,
          person: task.person,
          date: formatDateForDB(currentDate),
          status: 'started',
          started_at: now,
        }),
      })
    } catch (error) {
      console.error('Failed to start task:', error)
      fetchTasks(currentDate)
    }
  }

  const handleStop = async (task: DailyTask) => {
    if (!task.completion?.started_at) return

    const now = new Date().toISOString()
    const startedAt = new Date(task.completion.started_at).getTime()
    const stoppedAt = new Date(now).getTime()
    const elapsedMs = stoppedAt - startedAt
    const previousElapsed = task.completion.elapsed_ms || 0
    const totalElapsed = previousElapsed + elapsedMs

    updateTaskLocally(task.activity.id, {
      status: 'stopped',
      started_at: null,
      elapsed_ms: totalElapsed,
    })

    try {
      await fetch('/api/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          activity_id: task.activity.id,
          person: task.person,
          date: formatDateForDB(currentDate),
          status: 'stopped',
          started_at: null,
          elapsed_ms: totalElapsed,
        }),
      })
    } catch (error) {
      console.error('Failed to stop task:', error)
      fetchTasks(currentDate)
    }
  }

  const handleResume = async (task: DailyTask) => {
    const now = new Date().toISOString()
    updateTaskLocally(task.activity.id, {
      status: 'started',
      started_at: now,
    })
    setSelectedTaskId(task.activity.id)

    try {
      await fetch('/api/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          activity_id: task.activity.id,
          person: task.person,
          date: formatDateForDB(currentDate),
          status: 'started',
          started_at: now,
          elapsed_ms: task.completion?.elapsed_ms || 0,
        }),
      })
    } catch (error) {
      console.error('Failed to resume task:', error)
      fetchTasks(currentDate)
    }
  }

  const triggerConfetti = () => {
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { x: 0.1, y: 0.6 },
    })
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { x: 0.9, y: 0.6 },
    })
  }

  const handleDone = async (task: DailyTask) => {
    let totalElapsedMs = task.completion?.elapsed_ms || 0
    if (task.completion?.started_at) {
      const startedAt = new Date(task.completion.started_at).getTime()
      const stoppedAt = Date.now()
      totalElapsedMs += stoppedAt - startedAt
    }

    const now = new Date().toISOString()

    const remainingIncompleteTasks = tasks.filter(
      (t) => t.activity.id !== task.activity.id &&
             t.completion?.status !== 'done' &&
             t.completion?.status !== 'skipped'
    )
    const isLastTask = remainingIncompleteTasks.length === 0

    updateTaskLocally(task.activity.id, {
      status: 'done',
      completed_at: now,
      started_at: null,
      elapsed_ms: totalElapsedMs || null,
    })
    setSelectedTaskId(null)

    if (isLastTask) {
      triggerConfetti()
    }

    try {
      await fetch('/api/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          activity_id: task.activity.id,
          person: task.person,
          date: formatDateForDB(currentDate),
          status: 'done',
          started_at: null,
          completed_at: now,
          elapsed_ms: totalElapsedMs || null,
        }),
      })
    } catch (error) {
      console.error('Failed to complete task:', error)
      fetchTasks(currentDate)
    }
  }

  const handleEditDuration = (task: DailyTask) => {
    const elapsedMinutes = task.completion?.elapsed_ms
      ? Math.round(task.completion.elapsed_ms / 60000)
      : 0
    setDurationModal({
      isOpen: true,
      task,
      elapsedMinutes,
    })
  }

  const handleDurationConfirm = async (minutes: number) => {
    const task = durationModal.task
    if (!task) return

    const now = new Date().toISOString()
    const elapsedMs = minutes * 60000

    updateTaskLocally(task.activity.id, {
      status: 'done',
      completed_at: now,
      elapsed_ms: elapsedMs,
    })
    setSelectedTaskId(null)
    setDurationModal({ isOpen: false, task: null, elapsedMinutes: 0 })

    try {
      await fetch('/api/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          activity_id: task.activity.id,
          person: task.person,
          date: formatDateForDB(currentDate),
          status: 'done',
          started_at: task.completion?.started_at || null,
          completed_at: now,
          elapsed_ms: elapsedMs,
        }),
      })
    } catch (error) {
      console.error('Failed to complete task:', error)
      fetchTasks(currentDate)
    }
  }

  const handleDurationCancel = () => {
    setDurationModal({ isOpen: false, task: null, elapsedMinutes: 0 })
  }

  const handleSkip = async (task: DailyTask) => {
    updateTaskLocally(task.activity.id, {
      status: 'skipped',
    })
    setSelectedTaskId(null)

    try {
      await fetch('/api/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          activity_id: task.activity.id,
          person: task.person,
          date: formatDateForDB(currentDate),
          status: 'skipped',
        }),
      })
    } catch (error) {
      console.error('Failed to skip task:', error)
      fetchTasks(currentDate)
    }
  }

  const handleUndo = async (task: DailyTask) => {
    if (!task.completion?.id) return

    const completionId = task.completion.id
    removeCompletionLocally(task.activity.id)

    try {
      await fetch(`/api/completions/${completionId}`, {
        method: 'DELETE',
      })
    } catch (error) {
      console.error('Failed to undo:', error)
      fetchTasks(currentDate)
    }
  }

  const handleReset = async (task: DailyTask) => {
    if (!task.completion?.id) return

    const completionId = task.completion.id
    removeCompletionLocally(task.activity.id)
    setSelectedTaskId(null)

    try {
      await fetch(`/api/completions/${completionId}`, {
        method: 'DELETE',
      })
    } catch (error) {
      console.error('Failed to reset:', error)
      fetchTasks(currentDate)
    }
  }

  const handleRowClick = (task: DailyTask) => {
    if (selectedTaskId === task.activity.id) {
      setSelectedTaskId(null)
    } else {
      setSelectedTaskId(task.activity.id)
    }
  }

  const incompleteTasks = tasks.filter((t) => t.completion?.status !== 'done' && t.completion?.status !== 'skipped')
  const completedTasks = tasks.filter((t) => t.completion?.status === 'done' || t.completion?.status === 'skipped')

  const doneCount = tasks.filter((t) => t.completion?.status === 'done').length
  const totalCount = tasks.length
  const isPastDate = isPast(currentDate)
  const percentage = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      {/* Animated background particles */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div
          className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full blur-3xl animate-pulse opacity-20"
          style={{ backgroundColor: colors.main }}
        />
        <div
          className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full blur-3xl animate-pulse opacity-10"
          style={{ backgroundColor: colors.gradient[0], animationDelay: '1s' }}
        />
      </div>

      {/* Sticky header with person name and date nav */}
      <div className="sticky top-0 z-30">
        {/* Person header */}
        <div
          className="text-white px-6 py-3 pb-6 relative overflow-hidden"
          style={{
            background: `linear-gradient(135deg, ${colors.gradient[1]}, ${colors.gradient[2]})`,
          }}
        >
          <div className="max-w-5xl mx-auto relative z-10">
            {/* Top row: Switch person, Trends/Admin */}
            <div className="flex items-center justify-between mb-1">
              <Link
                href="/"
                className="text-white/70 hover:text-white text-sm transition-colors"
              >
                &larr; Switch person
              </Link>
              <div className="flex items-center gap-3">
                <div className="inline-flex items-center rounded-full bg-black/20 px-3 py-1 backdrop-blur-sm">
                  <button
                    onClick={() => setActiveView('daily')}
                    className={`text-sm transition-colors px-3 ${activeView === 'daily' ? 'text-white font-semibold' : 'text-white/70 hover:text-white'}`}
                  >
                    Daily
                  </button>
                  <span className="text-white/30">|</span>
                  <button
                    onClick={() => setActiveView('long-term')}
                    className={`text-sm transition-colors px-3 ${activeView === 'long-term' ? 'text-white font-semibold' : 'text-white/70 hover:text-white'}`}
                  >
                    Long Term
                  </button>
                  <span className="text-white/30">|</span>
                  <Link
                    href="/leaderboard"
                    className="text-white/70 hover:text-white text-sm transition-colors px-3"
                  >
                    Leaderboard
                  </Link>
                </div>
                <Link
                  href="/admin"
                  className="text-white/70 hover:text-white transition-colors p-2 rounded-full hover:bg-black/20"
                  title="Settings"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                  </svg>
                </Link>
              </div>
            </div>
            {/* Second row: Avatar + Name (left), Day (center), Percentage (right) */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 flex-1">
                <div
                  className="w-14 h-14 rounded-full p-0.5"
                  style={{
                    background: `linear-gradient(135deg, ${colors.gradient[0]}, ${colors.gradient[2]})`,
                    boxShadow: `0 0 20px ${colors.main}66`,
                  }}
                >
                  <img
                    src={`/avatar/${person === 'Thomas' ? 'tom' : person.toLowerCase()}.jpg`}
                    alt={person}
                    className="w-full h-full rounded-full object-cover"
                  />
                </div>
                <span className="text-3xl font-bold text-white">{person}</span>
              </div>
              {/* Day of week with Today button above (absolute so it doesn't push content) */}
              <div className="relative">
                {activeView === 'daily' && !isToday(currentDate) && (
                  <button
                    onClick={() => handleDateChange(new Date())}
                    className="absolute -top-6 left-1/2 -translate-x-1/2 text-xs text-white/70 hover:text-white transition-colors px-3 py-1 rounded-lg bg-black/20 whitespace-nowrap"
                  >
                    Go to Today
                  </button>
                )}
                <span className="text-6xl font-bold text-white drop-shadow-lg">
                  {activeView === 'long-term' ? 'Long Term Say Dos' : format(currentDate, 'EEEE')}
                </span>
              </div>
              <div className="flex-1 flex justify-end">
                <div
                  className="text-3xl font-black px-4 py-1 rounded-xl"
                  style={{
                    background: 'rgba(0,0,0,0.3)',
                    boxShadow: `0 0 30px ${colors.main}44`,
                  }}
                >
                  {percentage}%
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Date navigation */}
        <div
          className="px-6 rounded-t-[20%] relative -mt-2"
          style={{
            background: `linear-gradient(135deg, ${colors.gradient[0]}, ${colors.gradient[1]})`,
          }}
        >
          <div className="max-w-5xl mx-auto py-2 flex items-center justify-center gap-4">
            {activeView === 'daily' && (
              <>
                <button
                  onClick={() => handleDateChange(getYesterday(currentDate))}
                  className="text-white/70 hover:text-white transition-colors px-3 py-1 text-xl"
                >
                  &larr;
                </button>
                <button
                  onClick={() => setShowDatePicker(!showDatePicker)}
                  className="text-white font-medium hover:text-white/80 transition-colors"
                >
                  {format(currentDate, 'MMMM d, yyyy')}
                </button>
                <button
                  onClick={() => handleDateChange(getTomorrow(currentDate))}
                  className="text-white/70 hover:text-white transition-colors px-3 py-1 text-xl"
                >
                  &rarr;
                </button>
              </>
            )}
          </div>
          {showDatePicker && activeView === 'daily' && (
            <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 z-50 rounded-lg shadow-lg p-2 bg-gray-800 border border-gray-700">
              <input
                type="date"
                value={format(currentDate, 'yyyy-MM-dd')}
                onChange={(e) => {
                  handleDateChange(parseDate(e.target.value))
                  setShowDatePicker(false)
                }}
                className="px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-700 border-gray-600 text-white"
                autoFocus
              />
            </div>
          )}
        </div>
      </div>

      {/* Task list */}
      <div className="flex-1 pb-12 relative z-0">
        <div className="max-w-5xl mx-auto py-4 px-6">
          {activeView === 'daily' ? (
            // Daily tasks view
            loading ? (
              <div
                className="rounded-2xl p-8 text-center"
                style={{
                  background: 'linear-gradient(135deg, rgba(30,41,59,0.6), rgba(15,23,42,0.8))',
                  border: '1px solid rgba(255,255,255,0.1)',
                }}
              >
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-t-transparent mb-4" style={{ borderColor: `${colors.main} transparent ${colors.main} ${colors.main}` }} />
                <p className="text-gray-400">Loading tasks...</p>
              </div>
            ) : tasks.length === 0 ? (
              <div
                className="rounded-2xl p-8 text-center"
                style={{
                  background: 'linear-gradient(135deg, rgba(30,41,59,0.6), rgba(15,23,42,0.8))',
                  border: '1px solid rgba(255,255,255,0.1)',
                }}
              >
                <p className="text-gray-400">No tasks scheduled for this day.</p>
              </div>
            ) : (
              <>
                {/* Incomplete tasks */}
                {incompleteTasks.length > 0 && (
                  <div
                    className="rounded-2xl overflow-hidden"
                    style={{
                      background: 'linear-gradient(135deg, rgba(30,41,59,0.6), rgba(15,23,42,0.8))',
                      boxShadow: '0 25px 50px -12px rgba(0,0,0,0.3)',
                      border: '1px solid rgba(255,255,255,0.1)',
                    }}
                  >
                    {incompleteTasks.map((task) => (
                      <TaskRow
                        key={task.activity.id}
                        task={task}
                        isPastDate={isPastDate}
                        isExpanded={selectedTaskId === task.activity.id || task.completion?.status === 'started'}
                        onRowClick={() => handleRowClick(task)}
                        onStart={() => handleStart(task)}
                        onStop={() => handleStop(task)}
                        onResume={() => handleResume(task)}
                        onDone={() => handleDone(task)}
                        onSkip={() => handleSkip(task)}
                        onUndo={() => handleUndo(task)}
                        onReset={() => handleReset(task)}
                        darkMode
                      />
                    ))}
                  </div>
                )}

                {/* Completed tasks */}
                {completedTasks.length > 0 && (() => {
                  const totalEstimatedMs = completedTasks.reduce((sum, t) => sum + (t.activity.default_minutes * 60 * 1000), 0)
                  const totalActualMs = completedTasks.reduce((sum, t) => sum + (t.completion?.elapsed_ms || t.activity.default_minutes * 60 * 1000), 0)
                  const percentDiff = totalEstimatedMs > 0 ? ((totalEstimatedMs - totalActualMs) / totalEstimatedMs) * 100 : 0
                  const formatTime = (ms: number) => {
                    const mins = Math.round(ms / 60000)
                    if (mins >= 60) {
                      const h = Math.floor(mins / 60)
                      const m = mins % 60
                      return m > 0 ? `${h}h ${m}m` : `${h}h`
                    }
                    return `${mins}m`
                  }
                  return (
                  <div
                    className={`rounded-2xl overflow-hidden ${incompleteTasks.length > 0 ? 'mt-6' : ''}`}
                    style={{
                      background: 'linear-gradient(135deg, rgba(30,41,59,0.4), rgba(15,23,42,0.6))',
                      boxShadow: '0 15px 30px -12px rgba(0,0,0,0.2)',
                      border: '1px solid rgba(255,255,255,0.05)',
                    }}
                  >
                    <div className="px-4 py-2 flex items-center justify-between" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                      <span className="text-sm text-slate-400">Completed</span>
                      <span className="text-sm text-slate-400">
                        {formatTime(totalActualMs)} / {formatTime(totalEstimatedMs)}
                        {percentDiff !== 0 && (
                          <span className={percentDiff > 0 ? 'text-green-400' : 'text-orange-400'}>
                            {' '}({percentDiff > 0 ? '' : '+'}{Math.abs(Math.round(percentDiff))}% {percentDiff > 0 ? 'faster' : 'slower'})
                          </span>
                        )}
                      </span>
                    </div>
                    {completedTasks.map((task) => (
                      <TaskRow
                        key={task.activity.id}
                        task={task}
                        isPastDate={isPastDate}
                        isExpanded={selectedTaskId === task.activity.id}
                        onRowClick={() => handleRowClick(task)}
                        onStart={() => handleStart(task)}
                        onStop={() => handleStop(task)}
                        onResume={() => handleResume(task)}
                        onDone={() => handleDone(task)}
                        onSkip={() => handleSkip(task)}
                        onUndo={() => handleUndo(task)}
                        onReset={() => handleReset(task)}
                        onEditDuration={() => handleEditDuration(task)}
                        darkMode
                      />
                    ))}
                  </div>
                  )
                })()}
              </>
            )
          ) : (
            // Long Term tasks view
            <LongTermTaskList person={person} colors={colors} />
          )}
        </div>
      </div>

      {/* Duration Modal */}
      <DurationModal
        isOpen={durationModal.isOpen}
        initialMinutes={durationModal.elapsedMinutes}
        activityName={durationModal.task?.activity.name || ''}
        onConfirm={handleDurationConfirm}
        onCancel={handleDurationCancel}
      />

      {/* Bottom gradient fade */}
      <div
        className="pointer-events-none fixed bottom-4 left-0 right-0 h-8"
        style={{
          background: 'linear-gradient(to top, rgba(17,24,39,1), transparent)',
        }}
      />

      {/* Bottom accent bar */}
      <div
        className="h-4 fixed bottom-0 left-0 right-0 z-20 rounded-t-full"
        style={{
          background: `linear-gradient(90deg, ${colors.gradient[0]}, ${colors.main}, ${colors.gradient[2]})`,
        }}
      />
    </div>
  )
}
