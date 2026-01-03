'use client'

import { DailyTask, TYPE_EMOJI, TYPE_COLORS } from '@/lib/types'
import PersonBadge from './PersonBadge'
import Timer from './Timer'
import { calculateDurationMinutes } from '@/lib/utils'

interface TaskRowProps {
  task: DailyTask
  isPastDate: boolean
  onStart: () => void
  onDone: () => void
  onBlocked: () => void
  onSkip: () => void
  onUndo: () => void
}

export default function TaskRow({
  task,
  isPastDate,
  onStart,
  onDone,
  onBlocked,
  onSkip,
  onUndo,
}: TaskRowProps) {
  const { activity, person, completion } = task
  const status = completion?.status

  const renderActions = () => {
    // Completed states
    if (status === 'done') {
      const duration =
        completion?.started_at && completion?.completed_at
          ? calculateDurationMinutes(completion.started_at, completion.completed_at)
          : null

      return (
        <div className="flex items-center gap-3">
          <span className="text-green-700 font-medium">
            Done{duration !== null ? ` in ${duration} mins` : ''}
          </span>
          <button
            onClick={onUndo}
            className="text-sm text-gray-500 hover:text-gray-700 underline"
          >
            Undo
          </button>
        </div>
      )
    }

    if (status === 'blocked') {
      return (
        <div className="flex items-center gap-3">
          <span className="text-red-700 font-medium">Blocked</span>
          <button
            onClick={onUndo}
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
            onClick={onUndo}
            className="text-sm text-gray-500 hover:text-gray-700 underline"
          >
            Undo
          </button>
        </div>
      )
    }

    // In progress (started)
    if (status === 'started' && completion?.started_at) {
      return (
        <div className="flex items-center gap-3">
          <Timer startedAt={completion.started_at} />
          <button
            onClick={onDone}
            className="px-4 py-2 bg-green-500 text-white rounded-lg font-medium hover:bg-green-600 transition-colors"
          >
            Done
          </button>
        </div>
      )
    }

    // Not started
    if (isPastDate) {
      // Past date - no timer, just direct status buttons
      return (
        <div className="flex gap-2">
          <button
            onClick={onDone}
            className="px-4 py-2 bg-green-500 text-white rounded-lg font-medium hover:bg-green-600 transition-colors"
          >
            Done
          </button>
          <button
            onClick={onBlocked}
            className="px-3 py-2 bg-red-100 text-red-700 rounded-lg font-medium hover:bg-red-200 transition-colors"
          >
            Blocked
          </button>
          <button
            onClick={onSkip}
            className="px-3 py-2 bg-gray-100 text-gray-600 rounded-lg font-medium hover:bg-gray-200 transition-colors"
          >
            Skip
          </button>
        </div>
      )
    }

    // Today or future - show Start button
    return (
      <div className="flex gap-2">
        <button
          onClick={onStart}
          className="px-4 py-2 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 transition-colors"
        >
          Start
        </button>
        <button
          onClick={onBlocked}
          className="px-3 py-2 bg-red-100 text-red-700 rounded-lg font-medium hover:bg-red-200 transition-colors"
        >
          Blocked
        </button>
        <button
          onClick={onSkip}
          className="px-3 py-2 bg-gray-100 text-gray-600 rounded-lg font-medium hover:bg-gray-200 transition-colors"
        >
          Skip
        </button>
      </div>
    )
  }

  // Determine row background based on status
  let rowBg = ''
  if (status === 'done') {
    rowBg = 'bg-green-50'
  } else if (status === 'blocked') {
    rowBg = 'bg-red-50'
  } else if (status === 'skipped') {
    rowBg = 'bg-gray-100'
  }

  return (
    <div
      className={`flex items-center justify-between px-4 py-3 border-b border-gray-200 ${rowBg}`}
    >
      <div className="flex items-center gap-4 flex-1">
        <div
          className={`w-10 h-10 flex items-center justify-center rounded-lg ${TYPE_COLORS[activity.type]}`}
        >
          <span className="text-xl">{TYPE_EMOJI[activity.type]}</span>
        </div>

        <div className="flex-1">
          <span className="font-medium text-gray-900">{activity.name}</span>
          <span className="ml-2 text-sm text-gray-500">
            ({activity.default_minutes} min)
          </span>
        </div>
      </div>

      <div className="flex items-center gap-6">
        <PersonBadge person={person} />
        <div className="w-64 flex justify-end">{renderActions()}</div>
      </div>
    </div>
  )
}
