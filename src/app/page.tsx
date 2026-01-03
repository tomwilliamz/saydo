'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import DateNav from '@/components/DateNav'
import FilterButtons from '@/components/FilterButtons'
import TaskRow from '@/components/TaskRow'
import { DailyTask, Person } from '@/lib/types'
import {
  formatDateForDB,
  getTomorrow,
  getYesterday,
  isPast,
  parseDate,
} from '@/lib/utils'

interface DailyResponse {
  date: string
  weekOfCycle: number
  dayOfWeek: number
  tasks: DailyTask[]
}

export default function DailyPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const dateParam = searchParams.get('date')

  const [currentDate, setCurrentDate] = useState<Date>(() => {
    if (dateParam) {
      return parseDate(dateParam)
    }
    return new Date()
  })

  const [tasks, setTasks] = useState<DailyTask[]>([])
  const [selectedPerson, setSelectedPerson] = useState<Person | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchTasks = useCallback(async (date: Date) => {
    setLoading(true)
    try {
      const response = await fetch(`/api/daily?date=${formatDateForDB(date)}`)
      const data: DailyResponse = await response.json()
      setTasks(data.tasks)
    } catch (error) {
      console.error('Failed to fetch tasks:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchTasks(currentDate)
  }, [currentDate, fetchTasks])

  const handleDateChange = (newDate: Date) => {
    setCurrentDate(newDate)
    router.push(`/?date=${formatDateForDB(newDate)}`, { scroll: false })
  }

  const handleStart = async (task: DailyTask) => {
    const now = new Date().toISOString()
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
    fetchTasks(currentDate)
  }

  const handleDone = async (task: DailyTask) => {
    const now = new Date().toISOString()
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
      }),
    })
    fetchTasks(currentDate)
  }

  const handleBlocked = async (task: DailyTask) => {
    await fetch('/api/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        activity_id: task.activity.id,
        person: task.person,
        date: formatDateForDB(currentDate),
        status: 'blocked',
      }),
    })
    fetchTasks(currentDate)
  }

  const handleSkip = async (task: DailyTask) => {
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
    fetchTasks(currentDate)
  }

  const handleUndo = async (task: DailyTask) => {
    if (task.completion?.id) {
      await fetch(`/api/completions/${task.completion.id}`, {
        method: 'DELETE',
      })
      fetchTasks(currentDate)
    }
  }

  // Filter tasks by selected person
  const filteredTasks = selectedPerson
    ? tasks.filter((t) => t.person === selectedPerson)
    : tasks

  // Calculate counts
  const completedCount = filteredTasks.filter(
    (t) => t.completion?.status === 'done'
  ).length
  const totalCount = filteredTasks.length

  const isPastDate = isPast(currentDate)

  return (
    <div className="max-w-5xl mx-auto">
      <DateNav
        currentDate={currentDate}
        onPrevious={() => handleDateChange(getYesterday(currentDate))}
        onNext={() => handleDateChange(getTomorrow(currentDate))}
        onToday={() => handleDateChange(new Date())}
      />

      <FilterButtons
        selectedPerson={selectedPerson}
        onSelect={setSelectedPerson}
        completedCount={completedCount}
        totalCount={totalCount}
      />

      <div className="bg-white rounded-lg shadow mt-4">
        {loading ? (
          <div className="p-8 text-center text-gray-500">Loading...</div>
        ) : filteredTasks.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            No tasks scheduled for this day.
          </div>
        ) : (
          <div>
            {filteredTasks.map((task) => (
              <TaskRow
                key={`${task.activity.id}-${task.person}`}
                task={task}
                isPastDate={isPastDate}
                onStart={() => handleStart(task)}
                onDone={() => handleDone(task)}
                onBlocked={() => handleBlocked(task)}
                onSkip={() => handleSkip(task)}
                onUndo={() => handleUndo(task)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
