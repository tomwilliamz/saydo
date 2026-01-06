import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// Set a specific schedule assignment (not toggle)
// This explicitly sets who is assigned to a specific activity/day/week
export async function PUT(request: Request) {
  const supabase = await createClient()
  const body = await request.json()

  console.log('Schedule set request:', body)
  console.log('user_id value:', body.user_id, 'type:', typeof body.user_id, 'is null:', body.user_id === null, 'is undefined:', body.user_id === undefined)

  const { activity_id, day_of_week, week_of_cycle, user_id } = body

  if (!activity_id || day_of_week === undefined || week_of_cycle === undefined) {
    return NextResponse.json(
      { error: 'Missing required fields: activity_id, day_of_week, week_of_cycle' },
      { status: 400 }
    )
  }

  // First, delete ALL existing assignments for this activity/day/week
  const { error: deleteError } = await supabase
    .from('schedule')
    .delete()
    .eq('activity_id', activity_id)
    .eq('day_of_week', day_of_week)
    .eq('week_of_cycle', week_of_cycle)

  if (deleteError) {
    return NextResponse.json({ error: deleteError.message }, { status: 500 })
  }

  // If user_id is provided (including null for "everyone"), create the new assignment
  if (user_id !== undefined) {
    console.log('Inserting schedule with user_id:', user_id)
    const insertPayload = {
      activity_id,
      user_id: user_id, // null means "everyone"
      day_of_week,
      week_of_cycle,
    }
    console.log('Insert payload:', insertPayload)

    const { data, error: insertError } = await supabase
      .from('schedule')
      .insert(insertPayload)
      .select()
      .single()

    console.log('Insert result:', { data, error: insertError })

    if (insertError) {
      console.error('Insert error:', insertError)
      return NextResponse.json({ error: insertError.message }, { status: 500 })
    }

    return NextResponse.json({ schedule: data })
  } else {
    console.log('Skipping insert, user_id is undefined')
  }

  // No user_id means "skip" - we already deleted, so just return success
  return NextResponse.json({ success: true, cleared: true })
}
