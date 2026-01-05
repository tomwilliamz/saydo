'use client'

import { LongTermTask, TYPE_COLORS, ActivityType } from '@/lib/types'
import Timer from './Timer'

interface LongTermTaskRowProps {
  task: LongTermTask
  isExpanded: boolean
  onRowClick: () => void
  onStart: () => void
  onStop: () => void
  onComplete: () => void
  onEdit: () => void
  onReopen: () => void
  onDelete: () => void
  darkMode?: boolean
}

export default function LongTermTaskRow({
  task,
  isExpanded,
  onRowClick,
  onStart,
  onStop,
  onComplete,
  onEdit,
  onReopen,
  onDelete,
  darkMode = false,
}: LongTermTaskRowProps) {
  const isRunning = !!task.current_session_started_at
  const isCompleted = task.status === 'completed'

  // Format total time (in minutes)
  const formatTotalTime = (minutes: number) => {
    if (minutes < 60) return `${minutes}m`
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    if (mins === 0) return `${hours}h`
    return `${hours}h ${mins}m`
  }

  // Format elapsed time (in ms) - same format as Timer component
  const formatElapsedTime = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000)
    const mins = Math.floor(totalSeconds / 60)
    const secs = totalSeconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  // Format due date
  const formatDueDate = (dateStr: string) => {
    // Parse the date string as local date (YYYY-MM-DD format)
    const [year, month, day] = dateStr.split('-').map(Number)
    const dueDate = new Date(year, month - 1, day) // month is 0-indexed

    const today = new Date()
    today.setHours(0, 0, 0, 0)
    dueDate.setHours(0, 0, 0, 0)

    const diffMs = dueDate.getTime() - today.getTime()
    const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24))

    if (diffDays < 0) return 'Overdue'
    if (diffDays === 0) return 'Due today'
    if (diffDays === 1) return 'Due tomorrow'
    if (diffDays <= 7) return `Due in ${diffDays} days`
    return `Due ${dueDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
  }

  const renderExpandedActions = () => {
    const startButtonClass = `px-10 py-4 text-white rounded-2xl text-xl font-bold
      bg-gradient-to-r from-blue-500 to-indigo-600
      hover:from-blue-600 hover:to-indigo-700
      shadow-lg shadow-blue-500/30 hover:shadow-xl hover:shadow-blue-500/40
      hover:scale-105 transition-all active:scale-95`

    const pauseButtonClass = darkMode
      ? `px-6 py-3 rounded-2xl text-lg font-semibold
          bg-gray-700/50 text-gray-200 border border-gray-600/50
          hover:bg-gray-600/50 transition-all`
      : `px-6 py-3 bg-gray-200 text-gray-700 rounded-2xl text-lg font-semibold
          hover:bg-gray-300 transition-colors`

    const completeButtonClass = `px-8 py-4 text-white rounded-2xl text-xl font-bold
      bg-gradient-to-r from-emerald-500 to-green-600
      hover:from-emerald-600 hover:to-green-700
      shadow-lg shadow-emerald-500/30 hover:shadow-xl hover:shadow-emerald-500/40
      hover:scale-105 transition-all active:scale-95`

    const completeButtonSmallClass = `px-6 py-3 text-white rounded-2xl text-lg font-semibold
      bg-gradient-to-r from-emerald-500 to-green-600
      hover:from-emerald-600 hover:to-green-700
      shadow-md shadow-emerald-500/20 hover:shadow-lg
      transition-all active:scale-95`

    const editLinkClass = darkMode
      ? 'text-sm text-gray-400 hover:text-gray-200 underline transition-colors'
      : 'text-sm text-gray-500 hover:text-gray-700 underline'

    const deleteLinkClass = 'text-sm text-red-400 hover:text-red-300 underline transition-colors'

    if (isCompleted) {
      return (
        <div className="flex items-center gap-4">
          <span className={darkMode ? 'text-emerald-400 font-medium' : 'text-green-700 font-medium'}>
            Completed
          </span>
          <button
            onClick={(e) => { e.stopPropagation(); onReopen(); }}
            className={editLinkClass}
          >
            Reopen
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
            className={deleteLinkClass}
          >
            Delete
          </button>
        </div>
      )
    }

    // Running - show timer, Pause, Complete
    if (isRunning && task.current_session_started_at) {
      // Use elapsed_ms for accumulated time (like daily tasks)
      const previousElapsedMs = task.elapsed_ms || 0
      return (
        <div className="flex items-center gap-4">
          <Timer startedAt={task.current_session_started_at} elapsedMs={previousElapsedMs} />
          <button
            onClick={(e) => { e.stopPropagation(); onStop(); }}
            className={pauseButtonClass}
          >
            Pause
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onComplete(); }}
            className={completeButtonSmallClass}
          >
            Complete
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onEdit(); }}
            className={editLinkClass}
          >
            Edit
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
            className={deleteLinkClass}
          >
            Delete
          </button>
        </div>
      )
    }

    // Not running - show paused time if any, then Start and Complete
    const hasPausedTime = (task.elapsed_ms || 0) > 0

    return (
      <div className="flex items-center gap-4">
        {hasPausedTime && (
          <span className="font-mono text-2xl font-semibold text-gray-400">
            {formatElapsedTime(task.elapsed_ms || 0)} paused
          </span>
        )}
        <button
          onClick={(e) => { e.stopPropagation(); onStart(); }}
          className={startButtonClass}
        >
          {hasPausedTime ? 'Resume' : 'Start'}
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onComplete(); }}
          className={hasPausedTime ? completeButtonSmallClass : completeButtonClass}
        >
          Complete
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onEdit(); }}
          className={editLinkClass}
        >
          Edit
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          className={deleteLinkClass}
        >
          Delete
        </button>
      </div>
    )
  }

  const renderCompactStatus = () => {
    if (isCompleted) {
      return (
        <span className={darkMode ? 'text-emerald-400 font-medium' : 'text-green-700 font-medium'}>
          Completed
        </span>
      )
    }

    if (isRunning && task.current_session_started_at) {
      const previousElapsedMs = task.elapsed_ms || 0
      return <Timer startedAt={task.current_session_started_at} elapsedMs={previousElapsedMs} />
    }

    // Show paused time if any (in timer format)
    if ((task.elapsed_ms || 0) > 0) {
      return (
        <span className={`font-mono text-lg font-semibold ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
          {formatElapsedTime(task.elapsed_ms || 0)} paused
        </span>
      )
    }

    // Show total time if any (legacy, for tasks without elapsed_ms)
    if (task.total_time_spent_minutes > 0) {
      return (
        <span className={darkMode ? 'text-gray-400 text-sm' : 'text-gray-500 text-sm'}>
          {formatTotalTime(task.total_time_spent_minutes)} spent
        </span>
      )
    }

    // Show estimate if set
    if (task.default_estimate_minutes) {
      return (
        <span className={darkMode ? 'text-gray-500 text-sm' : 'text-gray-400 text-sm'}>
          ~{formatTotalTime(task.default_estimate_minutes)}
        </span>
      )
    }

    return null
  }

  // Determine row background
  let rowBg = darkMode ? 'bg-transparent hover:bg-white/5' : 'bg-white hover:bg-gray-50'
  if (isCompleted) {
    rowBg = darkMode ? 'bg-green-500/10' : 'bg-green-50'
  } else if (isRunning) {
    rowBg = darkMode ? 'bg-blue-500/10' : 'bg-blue-50'
  }

  const rowHeight = isExpanded ? 'min-h-[140px] py-6' : 'min-h-[80px] py-4'
  const borderColor = darkMode ? 'border-white/10' : 'border-gray-200'
  const textColor = darkMode ? 'text-white' : 'text-gray-900'

  return (
    <div
      onClick={onRowClick}
      className={`flex items-center justify-between px-6 border-b ${borderColor}
        cursor-pointer transition-all duration-200 ${rowBg} ${rowHeight}`}
    >
      <div className="flex items-center gap-4 flex-1">
        {/* Color indicator */}
        <div
          className={`w-3 h-12 rounded-full ${TYPE_COLORS[task.category as ActivityType]}`}
        />

        <div className="flex-1">
          <span className={`font-semibold ${textColor} ${isExpanded ? 'text-2xl' : 'text-lg'}`}>
            {task.title}
          </span>
          {/* Due date badge */}
          {task.due_date && !isCompleted && (
            <span className={`ml-3 text-xs px-2 py-0.5 rounded-full ${
              darkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-200 text-gray-600'
            }`}>
              {formatDueDate(task.due_date)}
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center">
        {isExpanded ? renderExpandedActions() : renderCompactStatus()}
      </div>
    </div>
  )
}
