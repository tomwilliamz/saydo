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
  const dayOfWeek = getDayOfWeek(targetDate)

  // Personal schedules are always week 1
  const personalWeekOfCycle = 1

  // Get personal schedule for this user (always week 1)
  const { data: scheduleData, error: scheduleError } = await supabase
    .from('schedule')
    .select(
      `
      *,
      activity:activities(*)
    `
    )
    .eq('user_id', targetUserId)
    .eq('week_of_cycle', personalWeekOfCycle)
    .eq('day_of_week', dayOfWeek)

  if (scheduleError) {
    return NextResponse.json({ error: scheduleError.message }, { status: 500 })
  }

  // Get family memberships with family rota_cycle_weeks
  const { data: familyMemberships } = await supabase
    .from('family_members')
    .select('family_id, families(rota_cycle_weeks)')
    .eq('user_id', targetUserId)

  let familyActivitySchedule: Array<{ activity: Activity }> = []

  // For each family, calculate the correct week based on that family's rota_cycle_weeks
  for (const membership of familyMemberships || []) {
    const familyId = membership.family_id
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const familyData = membership.families as any
    const rotaCycleWeeks = familyData?.rota_cycle_weeks || 4

    // Calculate week of cycle for this family's rota
    const familyWeekOfCycle = getWeekOfCycle(targetDate, cycleStartDate, rotaCycleWeeks)

    console.log('Family query:', { familyId, rotaCycleWeeks, familyWeekOfCycle, dayOfWeek, targetDate: dateParam })

    // Debug: Get ALL family schedules to see what exists
    const { data: allFamilySchedule } = await supabase
      .from('schedule')
      .select('*, activity:activities!inner(name, family_id)')
      .is('user_id', null)
      .eq('activity.family_id', familyId)
    console.log('All family schedules:', allFamilySchedule?.map(s => ({
      activity: (s.activity as {name: string}).name,
      day: s.day_of_week,
      week: s.week_of_cycle
    })))

    // Get family activities with user_id = NULL (cascade to all family members)
    const { data: familySchedule, error: familyError } = await supabase
      .from('schedule')
      .select(
        `
        *,
        activity:activities!inner(*)
      `
      )
      .is('user_id', null)
      .eq('week_of_cycle', familyWeekOfCycle)
      .eq('day_of_week', dayOfWeek)
      .eq('activity.family_id', familyId)

    console.log('Family schedule result:', { count: familySchedule?.length, error: familyError, data: familySchedule })

    if (familySchedule) {
      familyActivitySchedule.push(...(familySchedule as Array<{ activity: Activity }>))
    }
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

  // Get primary family's week for display (use first family or default to 1)
  const primaryFamilyData = (familyMemberships?.[0]?.families as { rota_cycle_weeks?: number }) || {}
  const primaryRotaCycleWeeks = primaryFamilyData.rota_cycle_weeks || 4
  const displayWeekOfCycle = getWeekOfCycle(targetDate, cycleStartDate, primaryRotaCycleWeeks)

  return NextResponse.json({
    date: dateParam,
    weekOfCycle: displayWeekOfCycle,
    dayOfWeek,
    tasks,
    user: targetUser,
  })
}
