'use client'

import { useState, useEffect, useCallback } from 'react'
import { LongTermTask, Person, ActivityType } from '@/lib/types'
import LongTermTaskRow from './LongTermTaskRow'
import LongTermTaskForm from './LongTermTaskForm'

interface LongTermTaskListProps {
  person: Person
  colors: { main: string; gradient: string[] }
}

export default function LongTermTaskList({ person, colors }: LongTermTaskListProps) {
  const [tasks, setTasks] = useState<LongTermTask[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [editingTask, setEditingTask] = useState<LongTermTask | null>(null)

  const fetchTasks = useCallback(async () => {
    try {
      const response = await fetch(`/api/long-term-tasks?person=${person}`)
      const data = await response.json()
      setTasks(data)
    } catch (error) {
      console.error('Failed to fetch long term tasks:', error)
    } finally {
      setLoading(false)
    }
  }, [person])

  useEffect(() => {
    fetchTasks()
  }, [fetchTasks])

  // Optimistic update helper
  const updateTaskLocally = (taskId: string, updates: Partial<LongTermTask>) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, ...updates } : t))
    )
  }

  const handleStart = async (task: LongTermTask) => {
    const now = new Date().toISOString()
    updateTaskLocally(task.id, { current_session_started_at: now })

    try {
      await fetch(`/api/long-term-tasks/${task.id}/start`, { method: 'POST' })
    } catch (error) {
      console.error('Failed to start task:', error)
      fetchTasks()
    }
  }

  const handleStop = async (task: LongTermTask) => {
    if (!task.current_session_started_at) return

    // Calculate elapsed_ms optimistically (like daily tasks)
    const startedAt = new Date(task.current_session_started_at).getTime()
    const stoppedAt = Date.now()
    const sessionMs = stoppedAt - startedAt
    const newElapsedMs = (task.elapsed_ms || 0) + sessionMs

    updateTaskLocally(task.id, {
      current_session_started_at: null,
      elapsed_ms: newElapsedMs,
      total_time_spent_minutes: Math.round(newElapsedMs / 60000),
    })

    try {
      const response = await fetch(`/api/long-term-tasks/${task.id}/stop`, { method: 'POST' })
      const updatedTask = await response.json()
      // Update with the server's calculated time
      updateTaskLocally(task.id, {
        elapsed_ms: updatedTask.elapsed_ms,
        total_time_spent_minutes: updatedTask.total_time_spent_minutes,
      })
    } catch (error) {
      console.error('Failed to stop task:', error)
      fetchTasks()
    }
  }

  const handleComplete = async (task: LongTermTask) => {
    const now = new Date().toISOString()

    // Calculate final time optimistically
    let totalTime = task.total_time_spent_minutes
    if (task.current_session_started_at) {
      const startedAt = new Date(task.current_session_started_at).getTime()
      const stoppedAt = Date.now()
      totalTime += Math.round((stoppedAt - startedAt) / 60000)
    }

    updateTaskLocally(task.id, {
      status: 'completed',
      completed_at: now,
      current_session_started_at: null,
      total_time_spent_minutes: totalTime,
    })
    setSelectedTaskId(null)

    try {
      await fetch(`/api/long-term-tasks/${task.id}/complete`, { method: 'POST' })
    } catch (error) {
      console.error('Failed to complete task:', error)
      fetchTasks()
    }
  }

  const handleReopen = async (task: LongTermTask) => {
    updateTaskLocally(task.id, {
      status: 'active',
      completed_at: null,
    })

    try {
      await fetch(`/api/long-term-tasks/${task.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'active' }),
      })
    } catch (error) {
      console.error('Failed to reopen task:', error)
      fetchTasks()
    }
  }

  const handleCreate = async (data: {
    title: string
    category: ActivityType
    due_date?: string
    default_estimate_minutes?: number
  }) => {
    setShowForm(false)

    try {
      const response = await fetch('/api/long-term-tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, person }),
      })
      const newTask = await response.json()
      setTasks((prev) => [newTask, ...prev])
    } catch (error) {
      console.error('Failed to create task:', error)
    }
  }

  const handleUpdate = async (data: {
    title: string
    category: ActivityType
    due_date?: string
    default_estimate_minutes?: number
  }) => {
    if (!editingTask) return
    setEditingTask(null)

    updateTaskLocally(editingTask.id, {
      title: data.title,
      category: data.category,
      due_date: data.due_date || null,
      default_estimate_minutes: data.default_estimate_minutes || null,
    })

    try {
      await fetch(`/api/long-term-tasks/${editingTask.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
    } catch (error) {
      console.error('Failed to update task:', error)
      fetchTasks()
    }
  }

  const handleDelete = async () => {
    if (!editingTask) return
    const taskId = editingTask.id
    setEditingTask(null)

    setTasks((prev) => prev.filter((t) => t.id !== taskId))

    try {
      await fetch(`/api/long-term-tasks/${taskId}`, { method: 'DELETE' })
    } catch (error) {
      console.error('Failed to delete task:', error)
      fetchTasks()
    }
  }

  // Direct delete from row (not from edit modal)
  const handleDeleteDirect = async (taskId: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== taskId))
    setSelectedTaskId(null)

    try {
      await fetch(`/api/long-term-tasks/${taskId}`, { method: 'DELETE' })
    } catch (error) {
      console.error('Failed to delete task:', error)
      fetchTasks()
    }
  }

  const activeTasks = tasks.filter((t) => t.status === 'active')
  const activeWithDueDate = activeTasks.filter((t) => t.due_date)
  const activeWithoutDueDate = activeTasks.filter((t) => !t.due_date)
  const completedTasks = tasks.filter((t) => t.status === 'completed')

  if (loading) {
    return (
      <div
        className="rounded-2xl p-8 text-center"
        style={{
          background: 'linear-gradient(135deg, rgba(30,41,59,0.6), rgba(15,23,42,0.8))',
          border: '1px solid rgba(255,255,255,0.1)',
        }}
      >
        <div
          className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-t-transparent mb-4"
          style={{ borderColor: `${colors.main} transparent ${colors.main} ${colors.main}` }}
        />
        <p className="text-gray-400">Loading tasks...</p>
      </div>
    )
  }

  const handleBackgroundClick = (e: React.MouseEvent) => {
    // Only close if clicking directly on the container (not on task rows)
    if (e.target === e.currentTarget) {
      setSelectedTaskId(null)
    }
  }

  return (
    <div onClick={handleBackgroundClick} className="min-h-[200px]">
      {tasks.length === 0 ? (
        <div
          className="rounded-2xl p-8 text-center"
          style={{
            background: 'linear-gradient(135deg, rgba(30,41,59,0.6), rgba(15,23,42,0.8))',
            border: '1px solid rgba(255,255,255,0.1)',
          }}
        >
          <p className="text-gray-400 mb-4">No long term tasks yet.</p>
          <button
            onClick={() => setShowForm(true)}
            className="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-500 transition-colors font-semibold"
          >
            Create Your First Task
          </button>
        </div>
      ) : (
        <>
          {/* Active tasks with due date */}
          {activeWithDueDate.length > 0 && (
            <div
              className="rounded-2xl overflow-hidden"
              style={{
                background: 'linear-gradient(135deg, rgba(30,41,59,0.6), rgba(15,23,42,0.8))',
                boxShadow: '0 25px 50px -12px rgba(0,0,0,0.3)',
                border: '1px solid rgba(255,255,255,0.1)',
              }}
            >
              <div className="px-6 py-3 border-b border-white/10">
                <span className="text-sm text-gray-400 font-medium">With Due Date</span>
              </div>
              {activeWithDueDate.map((task) => (
                <LongTermTaskRow
                  key={task.id}
                  task={task}
                  isExpanded={selectedTaskId === task.id || !!task.current_session_started_at}
                  onRowClick={() => setSelectedTaskId(selectedTaskId === task.id ? null : task.id)}
                  onStart={() => handleStart(task)}
                  onStop={() => handleStop(task)}
                  onComplete={() => handleComplete(task)}
                  onEdit={() => setEditingTask(task)}
                  onReopen={() => handleReopen(task)}
                  onDelete={() => handleDeleteDirect(task.id)}
                  darkMode
                />
              ))}
            </div>
          )}

          {/* Active tasks without due date */}
          {activeWithoutDueDate.length > 0 && (
            <div
              className={`rounded-2xl overflow-hidden ${activeWithDueDate.length > 0 ? 'mt-6' : ''}`}
              style={{
                background: 'linear-gradient(135deg, rgba(30,41,59,0.6), rgba(15,23,42,0.8))',
                boxShadow: '0 25px 50px -12px rgba(0,0,0,0.3)',
                border: '1px solid rgba(255,255,255,0.1)',
              }}
            >
              <div className="px-6 py-3 border-b border-white/10">
                <span className="text-sm text-gray-400 font-medium">No Due Date</span>
              </div>
              {activeWithoutDueDate.map((task) => (
                <LongTermTaskRow
                  key={task.id}
                  task={task}
                  isExpanded={selectedTaskId === task.id || !!task.current_session_started_at}
                  onRowClick={() => setSelectedTaskId(selectedTaskId === task.id ? null : task.id)}
                  onStart={() => handleStart(task)}
                  onStop={() => handleStop(task)}
                  onComplete={() => handleComplete(task)}
                  onEdit={() => setEditingTask(task)}
                  onReopen={() => handleReopen(task)}
                  onDelete={() => handleDeleteDirect(task.id)}
                  darkMode
                />
              ))}
            </div>
          )}

          {/* Completed tasks */}
          {completedTasks.length > 0 && (
            <div
              className={`rounded-2xl overflow-hidden ${activeWithDueDate.length > 0 || activeWithoutDueDate.length > 0 ? 'mt-6' : ''}`}
              style={{
                background: 'linear-gradient(135deg, rgba(30,41,59,0.4), rgba(15,23,42,0.6))',
                boxShadow: '0 15px 30px -12px rgba(0,0,0,0.2)',
                border: '1px solid rgba(255,255,255,0.05)',
              }}
            >
              <div className="px-6 py-3 border-b border-white/10">
                <span className="text-sm text-gray-400 font-medium">Completed</span>
              </div>
              {completedTasks.map((task) => (
                <LongTermTaskRow
                  key={task.id}
                  task={task}
                  isExpanded={selectedTaskId === task.id}
                  onRowClick={() => setSelectedTaskId(selectedTaskId === task.id ? null : task.id)}
                  onStart={() => handleStart(task)}
                  onStop={() => handleStop(task)}
                  onComplete={() => handleComplete(task)}
                  onEdit={() => setEditingTask(task)}
                  onReopen={() => handleReopen(task)}
                  onDelete={() => handleDeleteDirect(task.id)}
                  darkMode
                />
              ))}
            </div>
          )}
        </>
      )}

      {/* Floating add button */}
      <button
        onClick={() => setShowForm(true)}
        className="fixed bottom-20 right-6 w-14 h-14 rounded-full text-white text-3xl shadow-lg hover:scale-110 transition-transform z-20"
        style={{
          background: `linear-gradient(135deg, ${colors.gradient[0]}, ${colors.gradient[2]})`,
          boxShadow: `0 10px 30px ${colors.main}44`,
        }}
      >
        +
      </button>

      {/* Create form modal */}
      {showForm && (
        <LongTermTaskForm
          onSave={handleCreate}
          onCancel={() => setShowForm(false)}
        />
      )}

      {/* Edit form modal */}
      {editingTask && (
        <LongTermTaskForm
          task={editingTask}
          onSave={handleUpdate}
          onCancel={() => setEditingTask(null)}
          onDelete={handleDelete}
        />
      )}
    </div>
  )
}
