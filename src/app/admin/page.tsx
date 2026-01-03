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
      <div className="max-w-7xl mx-auto py-8 px-4">
        <div className="text-center text-gray-500">Loading...</div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto py-8 px-4">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Schedule Editor</h1>
        <button
          onClick={() => setShowActivityForm(true)}
          className="px-4 py-2 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600"
        >
          + Add Activity
        </button>
      </div>

      {/* Cycle Start Date */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <label className="flex items-center gap-4">
          <span className="font-medium text-gray-700">Cycle Start Date:</span>
          <input
            type="date"
            value={cycleStartDate}
            onChange={(e) => handleCycleStartDateChange(e.target.value)}
            className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
          />
          <span className="text-sm text-gray-500">(Must be a Monday)</span>
        </label>
      </div>

      {/* Activities List */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <h2 className="font-semibold text-gray-800 mb-3">Activities</h2>
        <div className="flex flex-wrap gap-2">
          {activities.map((activity) => (
            <button
              key={activity.id}
              onClick={() => setEditingActivity(activity)}
              className="px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded text-sm text-gray-700"
            >
              {activity.name}
            </button>
          ))}
        </div>
      </div>

      {/* Schedule Grid */}
      <ScheduleGrid
        activities={activities}
        schedule={schedule}
        onScheduleChange={handleScheduleChange}
      />

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
  )
}
