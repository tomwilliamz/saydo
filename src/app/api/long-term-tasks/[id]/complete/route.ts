import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// POST /api/long-term-tasks/[id]/complete
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

  let elapsedMs = task.elapsed_ms || 0

  // If session is running, stop it first
  if (task.current_session_started_at) {
    const startedAt = new Date(task.current_session_started_at).getTime()
    const endedAt = new Date(now).getTime()
    const sessionMs = endedAt - startedAt
    elapsedMs += sessionMs
    const durationMinutes = Math.round(sessionMs / 60000)

    // Update the open session
    await supabase
      .from('long_term_task_sessions')
      .update({
        ended_at: now,
        duration_minutes: durationMinutes,
      })
      .eq('task_id', id)
      .is('ended_at', null)
  }

  const totalMinutes = Math.round(elapsedMs / 60000)

  // Mark task as completed
  const { data: updatedTask, error: taskError } = await supabase
    .from('long_term_tasks')
    .update({
      status: 'completed',
      completed_at: now,
      current_session_started_at: null,
      elapsed_ms: elapsedMs,
      total_time_spent_minutes: totalMinutes,
    })
    .eq('id', id)
    .select()
    .single()

  if (taskError) {
    return NextResponse.json({ error: taskError.message }, { status: 500 })
  }

  return NextResponse.json(updatedTask)
}
