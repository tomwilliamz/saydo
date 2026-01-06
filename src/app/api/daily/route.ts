import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { parseDate, getWeekOfCycle, getDayOfWeek } from '@/lib/utils'
import { DailyTask, User, Activity, Completion } from '@/lib/types'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const dateParam = searchParams.get('date')
  const userIdParam = searchParams.get('user_id')

  if (!dateParam) {
    return NextResponse.json({ error: 'date parameter required' }, { status: 400 })
  }

  const supabase = await createClient()

  // Get the authenticated user
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser()

  if (!authUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Determine which user's tasks to fetch
  const targetUserId = userIdParam || authUser.id

  // Get the target user's profile (for cycle settings)
  const { data: targetUser, error: userError } = await supabase
    .from('users')
    .select('*')
    .eq('id', targetUserId)
    .single()

  if (userError || !targetUser) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  // Check if requesting user has permission to view this user's tasks
  // (must be same user or in same family)
  if (targetUserId !== authUser.id) {
    const [{ data: myFamilies }, { data: theirFamilies }] = await Promise.all([
      supabase.from('family_members').select('family_id').eq('user_id', authUser.id),
      supabase.from('family_members').select('family_id').eq('user_id', targetUserId),
    ])

    const myFamilyIds = new Set(myFamilies?.map((f) => f.family_id) || [])
    const hasSharedFamily = theirFamilies?.some((f) => myFamilyIds.has(f.family_id))

    if (!hasSharedFamily) {
      return NextResponse.json({ error: 'Not authorized to view this user' }, { status: 403 })
    }
  }

  const targetDate = parseDate(dateParam)
  const cycleStartDate = parseDate(targetUser.cycle_start_date)
  const weekOfCycle = getWeekOfCycle(targetDate, cycleStartDate, targetUser.cycle_weeks)
  const dayOfWeek = getDayOfWeek(targetDate)

  // Get schedule for this user, day, and week
  const { data: scheduleData, error: scheduleError } = await supabase
    .from('schedule')
    .select(
      `
      *,
      activity:activities(*)
    `
    )
    .eq('user_id', targetUserId)
    .eq('week_of_cycle', weekOfCycle)
    .eq('day_of_week', dayOfWeek)

  if (scheduleError) {
    return NextResponse.json({ error: scheduleError.message }, { status: 500 })
  }

  // Also get family activities that cascade to everyone (user_id = NULL in schedule)
  const { data: familyMemberships } = await supabase
    .from('family_members')
    .select('family_id')
    .eq('user_id', targetUserId)

  const familyIds = familyMemberships?.map((m) => m.family_id) || []

  let familyActivitySchedule: Array<{ activity: Activity }> = []
  if (familyIds.length > 0) {
    // Get family activities with user_id = NULL (cascade to all family members)
    const { data: familySchedule } = await supabase
      .from('schedule')
      .select(
        `
        *,
        activity:activities!inner(*)
      `
      )
      .is('user_id', null)
      .eq('week_of_cycle', weekOfCycle)
      .eq('day_of_week', dayOfWeek)
      .in('activity.family_id', familyIds)

    familyActivitySchedule = (familySchedule || []) as Array<{ activity: Activity }>
  }

  // Combine personal schedules and cascading family activities
  const allScheduleData = [...(scheduleData || []), ...familyActivitySchedule]

  // Get completions for this date and user
  const { data: completions, error: completionsError } = await supabase
    .from('completions')
    .select('*')
    .eq('date', dateParam)
    .eq('user_id', targetUserId)

  if (completionsError) {
    return NextResponse.json({ error: completionsError.message }, { status: 500 })
  }

  // Build daily tasks array
  const tasks: DailyTask[] = []

  for (const scheduleItem of allScheduleData) {
    const activity = scheduleItem.activity as Activity
    const completion =
      (completions?.find((c: Completion) => c.activity_id === activity.id) as Completion | undefined) || null

    tasks.push({
      activity: {
        ...activity,
        owner_type: activity.family_id ? 'family' : 'personal',
      },
      user: targetUser as User,
      completion,
    })
  }

  // Sort tasks: by type, then by activity name
  tasks.sort((a, b) => {
    if (a.activity.type !== b.activity.type) {
      const typeOrder = ['Home', 'Brain', 'Body', 'Downtime']
      return typeOrder.indexOf(a.activity.type) - typeOrder.indexOf(b.activity.type)
    }
    return a.activity.name.localeCompare(b.activity.name)
  })

  return NextResponse.json({
    date: dateParam,
    weekOfCycle,
    dayOfWeek,
    tasks,
    user: targetUser,
  })
}
