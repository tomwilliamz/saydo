import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('schedule')
    .select(`
      *,
      activity:activities(*)
    `)
    .order('week_of_cycle')
    .order('day_of_week')

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}

export async function PUT(request: Request) {
  const supabase = await createClient()
  const body = await request.json()

  // Body should be an array of schedule entries to upsert
  // Each entry: { activity_id, person, day_of_week, week_of_cycle }

  // First, delete all existing schedule entries for the affected activity
  // Then insert the new ones
  const activityIds = [...new Set(body.map((s: { activity_id: string }) => s.activity_id))]

  // Delete existing entries for these activities
  const { error: deleteError } = await supabase
    .from('schedule')
    .delete()
    .in('activity_id', activityIds)

  if (deleteError) {
    return NextResponse.json({ error: deleteError.message }, { status: 500 })
  }

  // Filter out entries with no person (represents unscheduled slots)
  const entriesToInsert = body.filter((s: { person: string | null }) => s.person && s.person !== '-')

  if (entriesToInsert.length > 0) {
    const { error: insertError } = await supabase
      .from('schedule')
      .insert(entriesToInsert)

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 })
    }
  }

  return NextResponse.json({ success: true })
}
