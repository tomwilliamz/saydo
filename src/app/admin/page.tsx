'use client'

import { useState, useEffect, useCallback } from 'react'
import ScheduleGrid from '@/components/ScheduleGrid'
import ActivityForm from '@/components/ActivityForm'
import { Activity, Schedule, PersonOrEveryone, ActivityType } from '@/lib/types'

export default function AdminPage() {
  const [activities, setActivities] = useState<Activity[]>([])
  const [schedule, setSchedule] = useState<Schedule[]>([])
  const [cycleStartDate, setCycleStartDate] = useState('')
  const [loading, setLoading] = useState(true)
  const [showActivityForm, setShowActivityForm] = useState(false)
  const [editingActivity, setEditingActivity] = useState<Activity | null>(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const [activitiesRes, scheduleRes, settingsRes] = await Promise.all([
        fetch('/api/activities'),
        fetch('/api/schedule'),
        fetch('/api/settings'),
      ])

      const activitiesData = await activitiesRes.json()
      const scheduleData = await scheduleRes.json()
      const settingsData = await settingsRes.json()

      setActivities(activitiesData)
      setSchedule(scheduleData)
      setCycleStartDate(settingsData.cycle_start_date || '')
    } catch (error) {
      console.error('Failed to fetch data:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleScheduleChange = async (
    activityId: string,
    weekOfCycle: number,
    dayOfWeek: number,
    person: PersonOrEveryone | null
  ) => {
    // Optimistic update
    setSchedule((prev) => {
      const filtered = prev.filter(
        (s) =>
          !(
            s.activity_id === activityId &&
            s.week_of_cycle === weekOfCycle &&
            s.day_of_week === dayOfWeek
          )
      )
      if (person) {
        return [
          ...filtered,
          {
            id: `temp-${Date.now()}`,
            activity_id: activityId,
            person,
            week_of_cycle: weekOfCycle,
            day_of_week: dayOfWeek,
          },
        ]
      }
      return filtered
    })

    // Build the full schedule for this activity to send to API
    const activitySchedule = schedule
      .filter((s) => s.activity_id === activityId)
      .filter(
        (s) =>
          !(s.week_of_cycle === weekOfCycle && s.day_of_week === dayOfWeek)
      )
      .map((s) => ({
        activity_id: s.activity_id,
        person: s.person,
        day_of_week: s.day_of_week,
        week_of_cycle: s.week_of_cycle,
      }))

    if (person) {
      activitySchedule.push({
        activity_id: activityId,
        person,
        day_of_week: dayOfWeek,
        week_of_cycle: weekOfCycle,
      })
    }

    try {
      await fetch('/api/schedule', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(activitySchedule),
      })
    } catch (error) {
      console.error('Failed to update schedule:', error)
      // Revert on error
      fetchData()
    }
  }

  const handleCycleStartDateChange = async (newDate: string) => {
    setCycleStartDate(newDate)
    try {
      await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: 'cycle_start_date', value: newDate }),
      })
    } catch (error) {
      console.error('Failed to update cycle start date:', error)
    }
  }

  const handleAddActivity = async (data: {
    name: string
    type: ActivityType
    default_minutes: number
    description?: string
  }) => {
    try {
      await fetch('/api/activities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      setShowActivityForm(false)
      fetchData()
    } catch (error) {
      console.error('Failed to add activity:', error)
    }
  }

  const handleEditActivity = async (data: {
    name: string
    type: ActivityType
    default_minutes: number
    description?: string
  }) => {
    if (!editingActivity) return
    try {
      await fetch(`/api/activities/${editingActivity.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      setEditingActivity(null)
      fetchData()
    } catch (error) {
      console.error('Failed to update activity:', error)
    }
  }

  const handleDeleteActivity = async () => {
    if (!editingActivity) return
    if (!confirm(`Delete "${editingActivity.name}"? This cannot be undone.`)) {
      return
    }
    try {
      await fetch(`/api/activities/${editingActivity.id}`, {
        method: 'DELETE',
      })
      setEditingActivity(null)
      fetchData()
    } catch (error) {
      console.error('Failed to delete activity:', error)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
        <div className="max-w-7xl mx-auto py-8 px-4">
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-blue-500 border-t-transparent mb-4" />
            <p className="text-gray-400">Loading...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      {/* Animated background particles */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute top-1/2 right-1/3 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }} />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto py-8 px-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-black bg-gradient-to-r from-purple-400 via-blue-400 to-emerald-400 bg-clip-text text-transparent">
              Schedule Editor
            </h1>
            <p className="text-gray-400 mt-1">Manage activities and weekly schedules</p>
          </div>
          <button
            onClick={() => setShowActivityForm(true)}
            className="px-6 py-3 text-white rounded-xl font-bold
              bg-gradient-to-r from-blue-500 to-purple-600
              hover:from-blue-600 hover:to-purple-700
              shadow-lg shadow-blue-500/30 hover:shadow-xl hover:scale-105 transition-all"
          >
            + Add Activity
          </button>
        </div>

        {/* Cycle Start Date */}
        <div
          className="rounded-2xl p-6 mb-6"
          style={{
            background: 'linear-gradient(135deg, rgba(30,41,59,0.6), rgba(15,23,42,0.8))',
            boxShadow: '0 25px 50px -12px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.1)',
            border: '1px solid rgba(255,255,255,0.1)',
          }}
        >
          <label className="flex items-center gap-4">
            <span className="font-medium text-gray-300">Cycle Start Date:</span>
            <input
              type="date"
              value={cycleStartDate}
              onChange={(e) => handleCycleStartDateChange(e.target.value)}
              className="px-4 py-2 bg-gray-700/50 border border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 text-white"
            />
            <span className="text-sm text-gray-500">(Must be a Monday)</span>
          </label>
        </div>

        {/* Activities List */}
        <div
          className="rounded-2xl p-6 mb-6"
          style={{
            background: 'linear-gradient(135deg, rgba(30,41,59,0.6), rgba(15,23,42,0.8))',
            boxShadow: '0 25px 50px -12px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.1)',
            border: '1px solid rgba(255,255,255,0.1)',
          }}
        >
          <h2 className="font-bold text-white text-lg mb-4">Activities</h2>
          <div className="flex flex-wrap gap-2">
            {activities.map((activity) => (
              <button
                key={activity.id}
                onClick={() => setEditingActivity(activity)}
                className="px-4 py-2 bg-gray-700/50 hover:bg-gray-600/50 rounded-xl text-sm text-gray-300 hover:text-white border border-gray-600/50 hover:border-gray-500 transition-all"
              >
                {activity.name}
              </button>
            ))}
          </div>
        </div>

        {/* Schedule Grid */}
        <div
          className="rounded-2xl p-6"
          style={{
            background: 'linear-gradient(135deg, rgba(30,41,59,0.6), rgba(15,23,42,0.8))',
            boxShadow: '0 25px 50px -12px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.1)',
            border: '1px solid rgba(255,255,255,0.1)',
          }}
        >
          <ScheduleGrid
            activities={activities}
            schedule={schedule}
            onScheduleChange={handleScheduleChange}
          />
        </div>

        {/* Activity Form Modal */}
        {showActivityForm && (
          <ActivityForm
            onSave={handleAddActivity}
            onCancel={() => setShowActivityForm(false)}
          />
        )}

        {editingActivity && (
          <ActivityForm
            activity={editingActivity}
            onSave={handleEditActivity}
            onCancel={() => setEditingActivity(null)}
            onDelete={handleDeleteActivity}
          />
        )}
      </div>
    </div>
  )
}
