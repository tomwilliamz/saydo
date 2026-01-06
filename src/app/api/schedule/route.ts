import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const searchParams = request.nextUrl.searchParams

  const userId = searchParams.get('user_id')
  const familyId = searchParams.get('family_id')

  // Get all schedules for a family (all members + family activities)
  if (familyId) {
    // Get all user_ids in this family
    const { data: members, error: membersError } = await supabase
      .from('family_members')
      .select('user_id')
      .eq('family_id', familyId)

    if (membersError) {
      return NextResponse.json({ error: membersError.message }, { status: 500 })
    }

    const memberIds = members.map((m) => m.user_id)

    // Get schedules for family members + family activities (user_id is null)
    const { data, error } = await supabase
      .from('schedule')
      .select(`
        *,
        activity:activities(*),
        user:users(id, display_name, avatar_url, cycle_weeks)
      `)
      .or(`user_id.in.(${memberIds.join(',')}),user_id.is.null`)
      .order('week_of_cycle')
      .order('day_of_week')

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Filter to only include schedules for activities that belong to family members or family
    const filteredData = data.filter((s) => {
      const activity = s.activity
      if (!activity) return false
      // Activity belongs to a family member or is a family activity for this family
      return memberIds.includes(activity.user_id) || activity.family_id === familyId
    })

    // Debug: Log all family activity schedules (user_id = null)
    const familySchedules = filteredData.filter(s => s.user_id === null)
    console.log('Family activity schedules count:', familySchedules.length, 'out of', filteredData.length, 'total')
    if (familySchedules.length > 0) {
      console.log('Family activity schedules (Everyone):', familySchedules.map(s => ({
        activity: (s.activity as {name: string}).name,
        day: s.day_of_week,
        week: s.week_of_cycle,
        user_id: s.user_id
      })))
    }

    return NextResponse.json(filteredData)
  }

  // Get schedules for a specific user
  if (userId) {
    const { data, error } = await supabase
      .from('schedule')
      .select(`
        *,
        activity:activities(*),
        user:users(id, display_name, avatar_url, cycle_weeks)
      `)
      .eq('user_id', userId)
      .order('week_of_cycle')
      .order('day_of_week')

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data)
  }

  // Default: return all schedules (backwards compatibility)
  const { data, error } = await supabase
    .from('schedule')
    .select(`
      *,
      activity:activities(*),
      user:users(id, display_name, avatar_url, cycle_weeks)
    `)
    .order('week_of_cycle')
    .order('day_of_week')

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}

// Toggle a single schedule entry on/off
// Special case: day_of_week = -1 means "placeholder" (in swimlane but not scheduled)
export async function POST(request: Request) {
  const supabase = await createClient()
  const body = await request.json()

  const { activity_id, user_id, day_of_week, week_of_cycle } = body

  if (!activity_id || day_of_week === undefined || week_of_cycle === undefined) {
    return NextResponse.json(
      { error: 'Missing required fields: activity_id, day_of_week, week_of_cycle' },
      { status: 400 }
    )
  }

  // Handle placeholder entries (day_of_week = -1)
  // These just add the activity to the swimlane without scheduling any day
  if (day_of_week === -1) {
    const { data, error: insertError } = await supabase
      .from('schedule')
      .insert({
        activity_id,
        user_id: user_id || null,
        day_of_week: -1,
        week_of_cycle: 0,
      })
      .select()
      .single()

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 })
    }

    return NextResponse.json({ toggled: true, created: true, schedule: data })
  }

  // Check if entry exists
  let query = supabase
    .from('schedule')
    .select('id')
    .eq('activity_id', activity_id)
    .eq('day_of_week', day_of_week)
    .eq('week_of_cycle', week_of_cycle)

  // user_id can be null for family activities
  if (user_id) {
    query = query.eq('user_id', user_id)
  } else {
    query = query.is('user_id', null)
  }

  const { data: existing, error: selectError } = await query.maybeSingle()

  if (selectError) {
    return NextResponse.json({ error: selectError.message }, { status: 500 })
  }

  if (existing) {
    // Delete the entry (toggle off)
    const { error: deleteError } = await supabase
      .from('schedule')
      .delete()
      .eq('id', existing.id)

    if (deleteError) {
      return NextResponse.json({ error: deleteError.message }, { status: 500 })
    }

    return NextResponse.json({ toggled: false, deleted: true })
  } else {
    // Insert the entry (toggle on)
    const { data, error: insertError } = await supabase
      .from('schedule')
      .insert({
        activity_id,
        user_id: user_id || null,
        day_of_week,
        week_of_cycle,
      })
      .select()
      .single()

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 })
    }

    return NextResponse.json({ toggled: true, created: true, schedule: data })
  }
}

// Bulk update schedule entries (legacy support)
export async function PUT(request: Request) {
  const supabase = await createClient()
  const body = await request.json()

  // Body should be an array of schedule entries to upsert
  // Each entry: { activity_id, user_id, day_of_week, week_of_cycle }

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

  // Filter out entries without activity_id (invalid)
  const entriesToInsert = body.filter(
    (s: { activity_id: string; user_id?: string | null }) => s.activity_id
  )

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

// Bulk delete schedule entries for a family
export async function DELETE(request: NextRequest) {
  const supabase = await createClient()
  const searchParams = request.nextUrl.searchParams

  const familyId = searchParams.get('family_id')

  if (!familyId) {
    return NextResponse.json({ error: 'family_id is required' }, { status: 400 })
  }

  // Get all user_ids in this family
  const { data: members, error: membersError } = await supabase
    .from('family_members')
    .select('user_id')
    .eq('family_id', familyId)

  if (membersError) {
    return NextResponse.json({ error: membersError.message }, { status: 500 })
  }

  const memberIds = members.map((m) => m.user_id)

  // Delete all schedule entries for family members
  const { error: deleteError } = await supabase
    .from('schedule')
    .delete()
    .in('user_id', memberIds)

  if (deleteError) {
    return NextResponse.json({ error: deleteError.message }, { status: 500 })
  }

  // Also delete family-level schedule entries (user_id = null) for activities in this family
  const { error: deleteFamilyError } = await supabase
    .from('schedule')
    .delete()
    .is('user_id', null)

  if (deleteFamilyError) {
    return NextResponse.json({ error: deleteFamilyError.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
