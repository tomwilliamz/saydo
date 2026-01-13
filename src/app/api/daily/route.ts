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
  const dayOfWeek = getDayOfWeek(targetDate)

  // Get family memberships with family rota settings FIRST (needed for rota week calculation)
  const { data: familyMemberships } = await supabase
    .from('family_members')
    .select('family_id, families(rota_cycle_weeks, rota_start_date)')
    .eq('user_id', targetUserId)

  // Calculate the rota week from primary family (for rota activities assigned to this user)
  const primaryFamilyData = (familyMemberships?.[0]?.families as { rota_cycle_weeks?: number; rota_start_date?: string }) || {}
  const rotaCycleWeeks = primaryFamilyData.rota_cycle_weeks || 4
  const rotaStartDate = primaryFamilyData.rota_start_date ? parseDate(primaryFamilyData.rota_start_date) : parseDate('2025-01-06')
  const rotaWeekOfCycle = getWeekOfCycle(targetDate, rotaStartDate, rotaCycleWeeks)

  // Personal (non-rota) schedules always use week 1
  const personalWeekOfCycle = 1

  // Get personal schedule for this user - non-rota activities (week 1)
  const { data: personalScheduleData, error: personalError } = await supabase
    .from('schedule')
    .select(`*, activity:activities!inner(*)`)
    .eq('user_id', targetUserId)
    .eq('week_of_cycle', personalWeekOfCycle)
    .eq('day_of_week', dayOfWeek)
    .eq('activity.is_rota', false)

  if (personalError) {
    return NextResponse.json({ error: personalError.message }, { status: 500 })
  }

  // Get rota schedule for this user - rota activities use family's calculated week
  const { data: rotaScheduleData, error: rotaError } = await supabase
    .from('schedule')
    .select(`*, activity:activities!inner(*)`)
    .eq('user_id', targetUserId)
    .eq('week_of_cycle', rotaWeekOfCycle)
    .eq('day_of_week', dayOfWeek)
    .eq('activity.is_rota', true)

  if (rotaError) {
    return NextResponse.json({ error: rotaError.message }, { status: 500 })
  }

  // Combine personal and rota schedules
  const scheduleData = [...(personalScheduleData || []), ...(rotaScheduleData || [])]

  let familyActivitySchedule: Array<{ activity: Activity }> = []

  // For each family, also get family-wide activities (user_id = NULL)
  for (const membership of familyMemberships || []) {
    const familyId = membership.family_id
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const familyData = membership.families as any
    const famRotaCycleWeeks = familyData?.rota_cycle_weeks || 4
    const famRotaStartDate = familyData?.rota_start_date ? parseDate(familyData.rota_start_date) : parseDate('2025-01-06')
    const familyWeekOfCycle = getWeekOfCycle(targetDate, famRotaStartDate, famRotaCycleWeeks)

    // Get family activities with user_id = NULL (cascade to all family members)
    const { data: familySchedule } = await supabase
      .from('schedule')
      .select(`*, activity:activities!inner(*)`)
      .is('user_id', null)
      .eq('week_of_cycle', familyWeekOfCycle)
      .eq('day_of_week', dayOfWeek)
      .eq('activity.family_id', familyId)

    if (familySchedule) {
      familyActivitySchedule.push(...(familySchedule as Array<{ activity: Activity }>))
    }
  }

  // Combine personal schedules, rota schedules, and family-wide activities
  // Deduplicate by activity_id (user-specific entries take priority over family-wide)
  const combinedSchedule = [...(scheduleData || []), ...familyActivitySchedule]
  const seenActivityIds = new Set<string>()
  const allScheduleData = combinedSchedule.filter((s) => {
    const activityId = (s.activity as Activity).id
    if (seenActivityIds.has(activityId)) {
      return false
    }
    seenActivityIds.add(activityId)
    return true
  })

  // Get completions for this date and user
  const { data: completions, error: completionsError } = await supabase
    .from('completions')
    .select('*')
    .eq('date', dateParam)
    .eq('user_id', targetUserId)

  if (completionsError) {
    return NextResponse.json({ error: completionsError.message }, { status: 500 })
  }

  // Get deferred tasks that were deferred TO this date
  const { data: deferredCompletions, error: deferredError } = await supabase
    .from('completions')
    .select('*, activity:activities(*)')
    .eq('deferred_to', dateParam)
    .eq('user_id', targetUserId)
    .eq('status', 'deferred')

  console.log('Deferred query:', { dateParam, targetUserId, deferredCompletions, deferredError })

  // Get ad-hoc completions (completions for activities not in today's schedule)
  // These are completions for this date where the activity wasn't scheduled
  const scheduledActivityIds = new Set(allScheduleData.map((s) => (s.activity as Activity).id))
  const { data: allCompletionsWithActivities } = await supabase
    .from('completions')
    .select('*, activity:activities(*)')
    .eq('date', dateParam)
    .eq('user_id', targetUserId)
    .not('status', 'eq', 'deferred')

  const adHocCompletions = allCompletionsWithActivities?.filter(
    (c) => c.activity && !scheduledActivityIds.has(c.activity_id)
  ) || []

  // Build daily tasks array
  const tasks: DailyTask[] = []

  // Add scheduled tasks
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

  // Add deferred tasks (these don't have a completion for TODAY yet)
  for (const deferred of deferredCompletions || []) {
    const activity = deferred.activity as Activity
    if (!activity) continue

    // Check if this activity is already in today's scheduled tasks
    const alreadyScheduled = tasks.some((t) => t.activity.id === activity.id)

    // Check if there's already a completion for this activity today (meaning user already acted on it)
    const hasCompletionToday = completions?.some((c: Completion) => c.activity_id === activity.id)

    if (!alreadyScheduled && !hasCompletionToday) {
      tasks.push({
        activity: {
          ...activity,
          owner_type: activity.family_id ? 'family' : 'personal',
        },
        user: targetUser as User,
        completion: null, // Fresh task for today
        isDeferred: true,
      })
    }
  }

  // Add ad-hoc tasks (already have completions)
  for (const adHoc of adHocCompletions) {
    const activity = adHoc.activity as Activity
    if (!activity) continue

    // Don't add if already in tasks (from schedule or deferred)
    const alreadyInTasks = tasks.some((t) => t.activity.id === activity.id)
    if (alreadyInTasks) continue

    tasks.push({
      activity: {
        ...activity,
        owner_type: activity.family_id ? 'family' : 'personal',
      },
      user: targetUser as User,
      completion: adHoc as Completion,
      isAdHoc: true,
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
    weekOfCycle: rotaWeekOfCycle,
    dayOfWeek,
    tasks,
    user: targetUser,
  })
}
