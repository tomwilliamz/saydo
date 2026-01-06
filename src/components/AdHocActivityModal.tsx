'use client'

import { useState, useEffect } from 'react'
import { Activity, TYPE_COLORS } from '@/lib/types'

interface AdHocActivityModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (activity: Activity) => Promise<void>
  userId: string
}

export default function AdHocActivityModal({ isOpen, onClose, onSubmit, userId }: AdHocActivityModalProps) {
  const [activities, setActivities] = useState<Activity[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState<string | null>(null)
  const [search, setSearch] = useState('')

  useEffect(() => {
    if (!isOpen || !userId) return

    const fetchActivities = async () => {
      setLoading(true)
      try {
        // Get the user's family first
        const familyRes = await fetch(`/api/families?user_id=${userId}`)
        const familyData = await familyRes.json()
        const familyId = familyData.families?.[0]?.id

        if (familyId) {
          // Get all activities from family members' libraries + family activities
          const activitiesRes = await fetch(`/api/activities?family_id=${familyId}&family_members=true`)
          const data = await activitiesRes.json()
          setActivities(data || [])
        } else {
          // Just get user's own activities
          const activitiesRes = await fetch(`/api/activities?user_id=${userId}`)
          const data = await activitiesRes.json()
          setActivities(data || [])
        }
      } catch (error) {
        console.error('Failed to fetch activities:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchActivities()
  }, [isOpen, userId])

  if (!isOpen) return null

  const handleSelect = async (activity: Activity) => {
    setSubmitting(activity.id)
    try {
      await onSubmit(activity)
      setSearch('')
      onClose()
    } finally {
      setSubmitting(null)
    }
  }

  // Filter and group activities by type
  const filteredActivities = activities.filter((a) =>
    a.name.toLowerCase().includes(search.toLowerCase())
  )

  const groupedActivities = filteredActivities.reduce((acc, activity) => {
    if (!acc[activity.type]) acc[activity.type] = []
    acc[activity.type].push(activity)
    return acc
  }, {} as Record<string, Activity[]>)

  const typeOrder = ['Home', 'Brain', 'Body', 'Downtime']

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

      <div
        className="relative rounded-3xl p-6 max-w-md w-full mx-4 max-h-[80vh] flex flex-col"
        style={{
          background: 'linear-gradient(135deg, rgba(30,41,59,0.98), rgba(15,23,42,0.99))',
          boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)',
          border: '1px solid rgba(255,255,255,0.1)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-white">Add Extra Activity</h2>
          <button
            onClick={onClose}
            className="w-10 h-10 flex items-center justify-center text-gray-400 hover:text-white rounded-full hover:bg-gray-700/50 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Search */}
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search activities..."
          className="w-full px-4 py-3 mb-4 text-white bg-gray-700/50 rounded-xl border border-gray-600/50
            focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
            placeholder-gray-500"
          autoFocus
        />

        {/* Activity list */}
        <div className="flex-1 overflow-y-auto min-h-0">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent" />
            </div>
          ) : filteredActivities.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              {search ? 'No activities match your search' : 'No activities available'}
            </div>
          ) : (
            <div className="space-y-4">
              {typeOrder.map((type) => {
                const typeActivities = groupedActivities[type]
                if (!typeActivities?.length) return null

                return (
                  <div key={type}>
                    <div className="flex items-center gap-2 mb-2">
                      <div className={`w-3 h-3 rounded-full ${TYPE_COLORS[type as keyof typeof TYPE_COLORS]}`} />
                      <span className="text-sm font-medium text-gray-400">{type}</span>
                    </div>
                    <div className="space-y-1">
                      {typeActivities.map((activity) => (
                        <button
                          key={activity.id}
                          onClick={() => handleSelect(activity)}
                          disabled={submitting === activity.id}
                          className="w-full px-4 py-3 text-left text-white bg-gray-700/30 rounded-xl
                            hover:bg-gray-600/50 transition-colors flex items-center justify-between
                            disabled:opacity-50"
                        >
                          <span className="font-medium">{activity.name}</span>
                          <span className="text-sm text-gray-400">{activity.default_minutes}m</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
