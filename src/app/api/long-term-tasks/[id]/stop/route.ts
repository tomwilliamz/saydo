import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// POST /api/long-term-tasks/[id]/stop
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { id } = await params
  const now = new Date().toISOString()

  // Get current task state
  const { data: task, error: fetchError } = await supabase
    .from('long_term_tasks')
    .select('*')
    .eq('id', id)
    .single()

  if (fetchError || !task) {
    return NextResponse.json({ error: 'Task not found' }, { status: 404 })
  }

  if (!task.current_session_started_at) {
    return NextResponse.json({ error: 'No active session' }, { status: 400 })
  }

  // Calculate duration in ms (like daily tasks)
  const startedAt = new Date(task.current_session_started_at).getTime()
  const endedAt = new Date(now).getTime()
  const sessionMs = endedAt - startedAt
  const newElapsedMs = (task.elapsed_ms || 0) + sessionMs
  const durationMinutes = Math.round(sessionMs / 60000)
  const newTotalMinutes = Math.round(newElapsedMs / 60000)

  // Update the open session
  const { error: sessionError } = await supabase
    .from('long_term_task_sessions')
    .update({
      ended_at: now,
      duration_minutes: durationMinutes,
    })
    .eq('task_id', id)
    .is('ended_at', null)

  if (sessionError) {
    return NextResponse.json({ error: sessionError.message }, { status: 500 })
  }

  // Update task: clear session start, update elapsed_ms and total_time_spent_minutes
  const { data: updatedTask, error: taskError } = await supabase
    .from('long_term_tasks')
    .update({
      current_session_started_at: null,
      elapsed_ms: newElapsedMs,
      total_time_spent_minutes: newTotalMinutes,
    })
    .eq('id', id)
    .select()
    .single()

  if (taskError) {
    return NextResponse.json({ error: taskError.message }, { status: 500 })
  }

  return NextResponse.json(updatedTask)
}
