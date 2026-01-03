'use client'

import { DailyTask, TYPE_COLORS } from '@/lib/types'
import Timer from './Timer'

interface TaskRowProps {
  task: DailyTask
  isPastDate: boolean
  isExpanded: boolean
  onRowClick: () => void
  onStart: () => void
  onStop: () => void
  onResume: () => void
  onDone: () => void
  onSkip: () => void
  onUndo: () => void
  onReset: () => void
  onEditDuration?: () => void
  darkMode?: boolean
}

export default function TaskRow({
  task,
  isPastDate,
  isExpanded,
  onRowClick,
  onStart,
  onStop,
  onResume,
  onDone,
  onSkip,
  onUndo,
  onReset,
  onEditDuration,
  darkMode = false,
}: TaskRowProps) {
  const { activity, completion } = task
  const status = completion?.status

  // Calculate duration for display
  const formatDuration = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000)
    const mins = Math.floor(totalSeconds / 60)
    const secs = totalSeconds % 60
    if (mins === 0) return `${secs}s`
    return `${mins}m ${secs}s`
  }

  const formatCompletedTime = (isoString: string) => {
    const date = new Date(isoString)
    const hours = date.getHours()
    const minutes = date.getMinutes()
    const ampm = hours >= 12 ? 'pm' : 'am'
    const hour12 = hours % 12 || 12
    return `${hour12}:${minutes.toString().padStart(2, '0')}${ampm}`
  }

  const getDoneMessage = () => {
    let durationPart = ''
    if (completion?.elapsed_ms) {
      durationPart = formatDuration(completion.elapsed_ms)
    } else if (completion?.started_at && completion?.completed_at) {
      const start = new Date(completion.started_at).getTime()
      const end = new Date(completion.completed_at).getTime()
      durationPart = formatDuration(end - start)
    }

    const timePart = completion?.completed_at ? ` at ${formatCompletedTime(completion.completed_at)}` : ''

    if (durationPart) {
      return `Done in ${durationPart}${timePart}`
    }
    return `Done${timePart}`
  }

  const renderExpandedActions = () => {
    // Started - show timer, Pause, Done, and Reset
    if (status === 'started' && completion?.started_at) {
      return (
        <div className="flex items-center gap-4">
          <Timer startedAt={completion.started_at} elapsedMs={completion.elapsed_ms || 0} />
          <button
            onClick={(e) => { e.stopPropagation(); onStop(); }}
            className="px-6 py-3 bg-gray-200 text-gray-700 rounded-2xl text-lg font-semibold
              hover:bg-gray-300 transition-colors"
          >
            Pause
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onDone(); }}
            className="px-6 py-3 bg-green-500 text-white rounded-2xl text-lg font-semibold
              hover:bg-green-600 transition-colors"
          >
            Done
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onReset(); }}
            className="text-sm text-gray-500 hover:text-gray-700 underline"
          >
            Reset
          </button>
        </div>
      )
    }

    // Stopped/Paused - show elapsed time, Resume, Done, and Reset
    if (status === 'stopped') {
      return (
        <div className="flex items-center gap-4">
          <span className="font-mono text-2xl font-semibold text-gray-500">
            {formatDuration(completion?.elapsed_ms || 0)} paused
          </span>
          <button
            onClick={(e) => { e.stopPropagation(); onResume(); }}
            className="px-8 py-4 text-white rounded-2xl text-xl font-bold
              bg-gradient-to-r from-blue-500 to-blue-600
              hover:from-blue-600 hover:to-blue-700
              shadow-lg hover:shadow-xl transition-all"
          >
            Resume
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onDone(); }}
            className="px-6 py-3 bg-green-500 text-white rounded-2xl text-lg font-semibold
              hover:bg-green-600 transition-colors"
          >
            Done
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onReset(); }}
            className="text-sm text-gray-500 hover:text-gray-700 underline"
          >
            Reset
          </button>
        </div>
      )
    }

    // Not started - show Start and Skip
    if (isPastDate) {
      return (
        <div className="flex gap-3">
          <button
            onClick={(e) => { e.stopPropagation(); onDone(); }}
            className="px-8 py-4 bg-green-500 text-white rounded-2xl text-xl font-bold
              hover:bg-green-600 transition-colors shadow-lg"
          >
            Done
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onSkip(); }}
            className="px-6 py-3 bg-gray-200 text-gray-600 rounded-2xl text-lg font-semibold
              hover:bg-gray-300 transition-colors"
          >
            Skip
          </button>
        </div>
      )
    }

    return (
      <div className="flex gap-3">
        <button
          onClick={(e) => { e.stopPropagation(); onStart(); }}
          className="px-10 py-4 text-white rounded-2xl text-xl font-bold
            bg-gradient-to-r from-blue-500 to-blue-600
            hover:from-blue-600 hover:to-blue-700
            shadow-lg hover:shadow-xl hover:scale-105 transition-all"
        >
          Start
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onSkip(); }}
          className="px-6 py-3 bg-gray-200 text-gray-600 rounded-2xl text-lg font-semibold
            hover:bg-gray-300 transition-colors"
        >
          Skip
        </button>
      </div>
    )
  }

  const renderCompactStatus = () => {
    if (status === 'done') {
      const hasDuration = completion?.elapsed_ms && completion.elapsed_ms > 0
      return (
        <div className="flex items-center gap-3">
          <span className="text-green-700 font-medium">{getDoneMessage()}</span>
          {onEditDuration && (
            <button
              onClick={(e) => { e.stopPropagation(); onEditDuration(); }}
              className="text-sm text-gray-500 hover:text-gray-700 underline"
            >
              {hasDuration ? 'Edit duration' : 'Add duration'}
            </button>
          )}
          <button
            onClick={(e) => { e.stopPropagation(); onUndo(); }}
            className="text-sm text-gray-500 hover:text-gray-700 underline"
          >
            Undo
          </button>
        </div>
      )
    }

    if (status === 'skipped') {
      return (
        <div className="flex items-center gap-3">
          <span className="text-gray-600 font-medium">Skipped</span>
          <button
            onClick={(e) => { e.stopPropagation(); onUndo(); }}
            className="text-sm text-gray-500 hover:text-gray-700 underline"
          >
            Undo
          </button>
        </div>
      )
    }

    if (status === 'started' && completion?.started_at) {
      return <Timer startedAt={completion.started_at} elapsedMs={completion.elapsed_ms || 0} />
    }

    if (status === 'stopped') {
      return (
        <span className="font-mono text-lg font-semibold text-gray-500">
          {formatDuration(completion?.elapsed_ms || 0)} paused
        </span>
      )
    }

    return (
      <span className="text-gray-400 text-sm">
        {activity.default_minutes} min
      </span>
    )
  }

  // Determine row background based on status
  let rowBg = darkMode ? 'bg-transparent hover:bg-white/5' : 'bg-white hover:bg-gray-50'
  if (status === 'done') {
    rowBg = darkMode ? 'bg-green-500/10' : 'bg-green-50'
  } else if (status === 'skipped') {
    rowBg = darkMode ? 'bg-gray-500/10' : 'bg-gray-100'
  } else if (status === 'started') {
    rowBg = darkMode ? 'bg-blue-500/10' : 'bg-blue-50'
  }

  // Determine row height
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
        {/* Color indicator (no icon) */}
        <div
          className={`w-3 h-12 rounded-full ${TYPE_COLORS[activity.type]}`}
        />

        <div className="flex-1">
          <span className={`font-semibold ${textColor} ${isExpanded ? 'text-2xl' : 'text-lg'}`}>
            {activity.name}
          </span>
        </div>
      </div>

      <div className="flex items-center">
        {isExpanded ? renderExpandedActions() : renderCompactStatus()}
      </div>
    </div>
  )
}
