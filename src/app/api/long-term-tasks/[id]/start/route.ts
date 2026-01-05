import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// POST /api/long-term-tasks/[id]/start
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { id } = await params
  const now = new Date().toISOString()

  // Start the session on the task
  const { data: task, error: taskError } = await supabase
    .from('long_term_tasks')
    .update({ current_session_started_at: now })
    .eq('id', id)
    .select()
    .single()

  if (taskError) {
    return NextResponse.json({ error: taskError.message }, { status: 500 })
  }

  // Create a session record
  const { error: sessionError } = await supabase
    .from('long_term_task_sessions')
    .insert({
      task_id: id,
      started_at: now,
    })

  if (sessionError) {
    return NextResponse.json({ error: sessionError.message }, { status: 500 })
  }

  return NextResponse.json(task)
}
