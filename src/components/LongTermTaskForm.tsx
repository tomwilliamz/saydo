'use client'

import { useState } from 'react'
import { LongTermTask, ActivityType, TYPE_EMOJI } from '@/lib/types'

interface LongTermTaskFormProps {
  task?: LongTermTask
  onSave: (data: {
    title: string
    category: ActivityType
    due_date?: string
    default_estimate_minutes?: number
  }) => void
  onCancel: () => void
  onDelete?: () => void
}

const CATEGORIES: ActivityType[] = ['Home', 'Brain', 'Body', 'Downtime']

export default function LongTermTaskForm({
  task,
  onSave,
  onCancel,
  onDelete,
}: LongTermTaskFormProps) {
  const [title, setTitle] = useState(task?.title || '')
  const [category, setCategory] = useState<ActivityType>(task?.category || 'Home')
  const [dueDate, setDueDate] = useState(task?.due_date || '')
  const [estimateInput, setEstimateInput] = useState(() => {
    if (!task?.default_estimate_minutes) return ''
    const mins = task.default_estimate_minutes
    const h = Math.floor(mins / 60)
    const m = mins % 60
    if (h > 0 && m > 0) return `${h}h ${m}m`
    if (h > 0) return `${h}h`
    return `${m}m`
  })

  // Parse duration string like "8h 2m", "2h", "30m", "90" (minutes)
  const parseDuration = (input: string): number | undefined => {
    if (!input.trim()) return undefined

    const normalized = input.toLowerCase().trim()

    // Match patterns like "8h 2m", "8h2m", "8h 2", "8 h 2 m"
    const hourMinMatch = normalized.match(/(\d+)\s*h\s*(\d+)\s*m?/)
    if (hourMinMatch) {
      return parseInt(hourMinMatch[1]) * 60 + parseInt(hourMinMatch[2])
    }

    // Match hours only: "8h", "8 h"
    const hourMatch = normalized.match(/^(\d+)\s*h$/)
    if (hourMatch) {
      return parseInt(hourMatch[1]) * 60
    }

    // Match minutes only: "30m", "30 m"
    const minMatch = normalized.match(/^(\d+)\s*m$/)
    if (minMatch) {
      return parseInt(minMatch[1])
    }

    // Plain number = minutes
    const plainNum = normalized.match(/^(\d+)$/)
    if (plainNum) {
      return parseInt(plainNum[1])
    }

    return undefined
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return

    onSave({
      title: title.trim(),
      category,
      due_date: dueDate || undefined,
      default_estimate_minutes: parseDuration(estimateInput),
    })
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-2xl w-full max-w-md shadow-2xl border border-gray-700">
        <form onSubmit={handleSubmit}>
          <div className="p-6 space-y-4">
            <h2 className="text-xl font-bold text-white">
              {task ? 'Edit Task' : 'New Long Term Task'}
            </h2>

            {/* Title */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Title
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="What do you need to do?"
                autoFocus
              />
            </div>

            {/* Category */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Category
              </label>
              <div className="grid grid-cols-4 gap-2">
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setCategory(cat)}
                    className={`px-3 py-2 rounded-xl text-sm font-medium transition-all ${
                      category === cat
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}
                  >
                    {TYPE_EMOJI[cat]} {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Due Date */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Due Date (optional)
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Time Estimate */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Time Estimate (optional)
              </label>
              <input
                type="text"
                value={estimateInput}
                onChange={(e) => setEstimateInput(e.target.value)}
                className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., 8h 2m, 2h, 30m, or 90"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="px-6 py-4 border-t border-gray-700 flex justify-between">
            <div>
              {task && onDelete && (
                <button
                  type="button"
                  onClick={onDelete}
                  className="px-4 py-2 text-red-400 hover:text-red-300 transition-colors"
                >
                  Delete
                </button>
              )}
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={onCancel}
                className="px-6 py-2 bg-gray-700 text-gray-300 rounded-xl hover:bg-gray-600 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!title.trim()}
                className="px-6 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {task ? 'Save' : 'Create'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
