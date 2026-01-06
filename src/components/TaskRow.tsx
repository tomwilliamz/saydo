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
  onDefer?: () => void
  onDelete?: () => void
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
  onDefer,
  onDelete,
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
    // Button styles
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

    const doneButtonClass = `px-8 py-4 text-white rounded-2xl text-xl font-bold
      bg-gradient-to-r from-emerald-500 to-green-600
      hover:from-emerald-600 hover:to-green-700
      shadow-lg shadow-emerald-500/30 hover:shadow-xl hover:shadow-emerald-500/40
      hover:scale-105 transition-all active:scale-95`

    const doneButtonSmallClass = `px-6 py-3 text-white rounded-2xl text-lg font-semibold
      bg-gradient-to-r from-emerald-500 to-green-600
      hover:from-emerald-600 hover:to-green-700
      shadow-md shadow-emerald-500/20 hover:shadow-lg
      transition-all active:scale-95`

    const skipButtonClass = darkMode
      ? `px-6 py-3 rounded-2xl text-lg font-semibold
          bg-gray-700/50 text-gray-300 border border-gray-600/50
          hover:bg-gray-600/50 transition-all`
      : `px-6 py-3 bg-gray-200 text-gray-600 rounded-2xl text-lg font-semibold
          hover:bg-gray-300 transition-colors`

    const deferButtonClass = darkMode
      ? `px-6 py-3 rounded-2xl text-lg font-semibold
          bg-amber-500/20 text-amber-300 border border-amber-500/50
          hover:bg-amber-500/30 transition-all`
      : `px-6 py-3 bg-amber-100 text-amber-700 rounded-2xl text-lg font-semibold
          hover:bg-amber-200 transition-colors`

    const deleteButtonClass = darkMode
      ? `px-6 py-3 rounded-2xl text-lg font-semibold
          bg-red-500/20 text-red-300 border border-red-500/50
          hover:bg-red-500/30 transition-all`
      : `px-6 py-3 bg-red-100 text-red-700 rounded-2xl text-lg font-semibold
          hover:bg-red-200 transition-colors`

    const resetLinkClass = darkMode
      ? 'text-sm text-gray-400 hover:text-gray-200 underline transition-colors'
      : 'text-sm text-gray-500 hover:text-gray-700 underline'

    // Started - show timer, Pause, Done, and Reset
    if (status === 'started' && completion?.started_at) {
      return (
        <div className="flex items-center gap-4">
          <Timer startedAt={completion.started_at} elapsedMs={completion.elapsed_ms || 0} />
          <button
            onClick={(e) => { e.stopPropagation(); onStop(); }}
            className={pauseButtonClass}
          >
            Pause
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onDone(); }}
            className={doneButtonSmallClass}
          >
            Done
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onReset(); }}
            className={resetLinkClass}
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
          <span className={`font-mono text-2xl font-semibold ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
            {formatDuration(completion?.elapsed_ms || 0)} paused
          </span>
          <button
            onClick={(e) => { e.stopPropagation(); onResume(); }}
            className={startButtonClass}
          >
            Resume
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onDone(); }}
            className={doneButtonSmallClass}
          >
            Done
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onReset(); }}
            className={resetLinkClass}
          >
            Reset
          </button>
        </div>
      )
    }

    // Not started - show Start and Skip (or Done and Skip for past dates)
    if (isPastDate) {
      return (
        <div className="flex gap-3">
          <button
            onClick={(e) => { e.stopPropagation(); onDone(); }}
            className={doneButtonClass}
          >
            Done
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onSkip(); }}
            className={skipButtonClass}
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
          className={startButtonClass}
        >
          Start
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onSkip(); }}
          className={skipButtonClass}
        >
          Skip
        </button>
        {onDefer && (
          <button
            onClick={(e) => { e.stopPropagation(); onDefer(); }}
            className={deferButtonClass}
          >
            Defer
          </button>
        )}
        {onDelete && task.isAdHoc && (
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
            className={deleteButtonClass}
          >
            Remove
          </button>
        )}
      </div>
    )
  }

  const renderCompactStatus = () => {
    const linkClass = darkMode
      ? 'text-sm text-gray-400 hover:text-gray-200 underline transition-colors'
      : 'text-sm text-gray-500 hover:text-gray-700 underline'

    if (status === 'done') {
      const hasDuration = completion?.elapsed_ms && completion.elapsed_ms > 0
      const deleteLinkClass = darkMode
        ? 'text-sm text-red-400 hover:text-red-300 underline transition-colors'
        : 'text-sm text-red-500 hover:text-red-700 underline'
      return (
        <div className="flex items-center gap-3">
          <span className={darkMode ? 'text-emerald-400 font-medium' : 'text-green-700 font-medium'}>
            {getDoneMessage()}
          </span>
          {onEditDuration && (
            <button
              onClick={(e) => { e.stopPropagation(); onEditDuration(); }}
              className={linkClass}
            >
              {hasDuration ? 'Edit duration' : 'Add duration'}
            </button>
          )}
          <button
            onClick={(e) => { e.stopPropagation(); onUndo(); }}
            className={linkClass}
          >
            Undo
          </button>
          {onDelete && task.isAdHoc && (
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(); }}
              className={deleteLinkClass}
            >
              Remove
            </button>
          )}
        </div>
      )
    }

    if (status === 'skipped') {
      return (
        <div className="flex items-center gap-3">
          <span className={darkMode ? 'text-gray-400 font-medium' : 'text-gray-600 font-medium'}>
            Skipped
          </span>
          <button
            onClick={(e) => { e.stopPropagation(); onUndo(); }}
            className={linkClass}
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
        <span className={`font-mono text-lg font-semibold ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
          {formatDuration(completion?.elapsed_ms || 0)} paused
        </span>
      )
    }

    return (
      <span className={darkMode ? 'text-gray-500 text-sm' : 'text-gray-400 text-sm'}>
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
          {task.isDeferred && (
            <span className={`ml-2 text-xs px-2 py-0.5 rounded-full ${darkMode ? 'bg-amber-500/20 text-amber-300' : 'bg-amber-100 text-amber-700'}`}>
              deferred
            </span>
          )}
          {task.isAdHoc && (
            <span className={`ml-2 text-xs px-2 py-0.5 rounded-full ${darkMode ? 'bg-purple-500/20 text-purple-300' : 'bg-purple-100 text-purple-700'}`}>
              extra
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
