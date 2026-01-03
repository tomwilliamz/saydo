'use client'

import { useState } from 'react'
import { Activity, ActivityType } from '@/lib/types'

interface ActivityFormProps {
  activity?: Activity | null
  onSave: (data: { name: string; type: ActivityType; default_minutes: number; description?: string }) => void
  onCancel: () => void
  onDelete?: () => void
}

const ACTIVITY_TYPES: ActivityType[] = ['Home', 'Brain', 'Body', 'Downtime']

export default function ActivityForm({
  activity,
  onSave,
  onCancel,
  onDelete,
}: ActivityFormProps) {
  const [name, setName] = useState(activity?.name || '')
  const [type, setType] = useState<ActivityType>(activity?.type || 'Home')
  const [defaultMinutes, setDefaultMinutes] = useState(
    activity?.default_minutes || 15
  )
  const [description, setDescription] = useState(activity?.description || '')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave({
      name,
      type,
      default_minutes: defaultMinutes,
      description: description || undefined,
    })
  }

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50">
      <div
        className="rounded-2xl p-6 w-full max-w-md"
        style={{
          background: 'linear-gradient(135deg, rgba(30,41,59,0.95), rgba(15,23,42,0.98))',
          boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.1)',
          border: '1px solid rgba(255,255,255,0.1)',
        }}
      >
        <h2 className="text-xl font-bold text-white mb-4">
          {activity ? 'Edit Activity' : 'Add Activity'}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-2 bg-gray-700/50 border border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-white placeholder-gray-400"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Type
            </label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as ActivityType)}
              className="w-full px-4 py-2 bg-gray-700/50 border border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-white"
            >
              {ACTIVITY_TYPES.map((t) => (
                <option key={t} value={t} className="bg-gray-800">
                  {t}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Default Minutes
            </label>
            <input
              type="number"
              value={defaultMinutes}
              onChange={(e) => setDefaultMinutes(parseInt(e.target.value) || 0)}
              className="w-full px-4 py-2 bg-gray-700/50 border border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-white"
              min={1}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Description (optional)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-4 py-2 bg-gray-700/50 border border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-white placeholder-gray-400"
              rows={3}
            />
          </div>

          <div className="flex justify-between pt-4">
            <div>
              {activity && onDelete && (
                <button
                  type="button"
                  onClick={onDelete}
                  className="px-4 py-2 text-red-400 hover:text-red-300 font-medium transition-colors"
                >
                  Delete
                </button>
              )}
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onCancel}
                className="px-4 py-2 text-gray-400 hover:text-white font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-6 py-2 text-white rounded-xl font-bold
                  bg-gradient-to-r from-blue-500 to-purple-600
                  hover:from-blue-600 hover:to-purple-700
                  shadow-lg shadow-blue-500/30 transition-all"
              >
                {activity ? 'Save' : 'Add'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
