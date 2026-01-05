import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { parseDate, getWeekOfCycle, getDayOfWeek, formatDateForDB } from '@/lib/utils'
import { ActivityType } from '@/lib/types'

interface HoursBreakdown {
  user_id: string
  display_name: string
  totalHours: number
  hoursPerWeek: number
  hoursPerDay: number
  byType: {
    type: ActivityType
    hours: number
    percentage: number
  }[]
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const period = searchParams.get('period') || 'month'
  const doneOnly = searchParams.get('doneOnly') === 'true'
  const familyId = searchParams.get('family_id')

  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Get users to calculate hours for
  let userIds: string[] = []
  let userMap: Map<string, { display_name: string; cycle_weeks: number; cycle_start_date: string }> = new Map()

  if (familyId) {
    const { data: members } = await supabase
      .from('family_members')
      .select('user_id, users(id, display_name, cycle_weeks, cycle_start_date)')
      .eq('family_id', familyId)

    if (members) {
      for (const m of members) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const userData = m.users as any
        if (userData) {
          userIds.push(m.user_id)
          userMap.set(m.user_id, {
            display_name: userData.display_name,
            cycle_weeks: userData.cycle_weeks,
            cycle_start_date: userData.cycle_start_date,
          })
        }
      }
    }
  } else {
    const { data: myFamilies } = await supabase
      .from('family_members')
      .select('family_id')
      .eq('user_id', user.id)

    if (myFamilies && myFamilies.length > 0) {
      const familyIds = myFamilies.map((f) => f.family_id)
      const { data: allMembers } = await supabase
        .from('family_members')
        .select('user_id, users(id, display_name, cycle_weeks, cycle_start_date)')
        .in('family_id', familyIds)

      if (allMembers) {
        const seenUsers = new Set<string>()
        for (const m of allMembers) {
          if (!seenUsers.has(m.user_id)) {
            seenUsers.add(m.user_id)
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const userData = m.users as any
            if (userData) {
              userIds.push(m.user_id)
              userMap.set(m.user_id, {
                display_name: userData.display_name,
                cycle_weeks: userData.cycle_weeks,
                cycle_start_date: userData.cycle_start_date,
              })
            }
          }
        }
      }
    } else {
      const { data: currentUser } = await supabase
        .from('users')
        .select('id, display_name, cycle_weeks, cycle_start_date')
        .eq('id', user.id)
        .single()

      if (currentUser) {
        userIds.push(currentUser.id)
        userMap.set(currentUser.id, {
          display_name: currentUser.display_name,
          cycle_weeks: currentUser.cycle_weeks,
          cycle_start_date: currentUser.cycle_start_date,
        })
      }
    }
  }

  if (userIds.length === 0) {
    return NextResponse.json({ period, doneOnly, days: 0, weeks: 0, breakdown: [], totals: {} })
  }

  const today = new Date()
  let startDate: Date

  if (period === 'week') {
    startDate = new Date(today)
    startDate.setDate(startDate.getDate() - 7)
  } else if (period === 'month') {
    startDate = new Date(today)
    startDate.setDate(startDate.getDate() - 30)
  } else {
    startDate = new Date(today)
    startDate.setDate(startDate.getDate() - 365)
  }

  const daysDiff = Math.ceil((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1
  const weeksDiff = daysDiff / 7

  // Get all activities
  const { data: activities, error: activitiesError } = await supabase
    .from('activities')
    .select('id, name, default_minutes, type')

  if (activitiesError) {
    return NextResponse.json({ error: activitiesError.message }, { status: 500 })
  }

  const activityMap = new Map(activities?.map((a) => [a.id, a]) || [])

  // Get schedule and completions
  const { data: scheduleData } = await supabase.from('schedule').select('*').in('user_id', userIds)

  const { data: completions } = await supabase
    .from('completions')
    .select('*')
    .in('user_id', userIds)
    .gte('date', formatDateForDB(startDate))
    .lte('date', formatDateForDB(today))

  // Build completion map
  const completionMap = new Map<string, { elapsed_ms: number | null; status: string }>()
  for (const c of completions || []) {
    const key = `${c.date}:${c.user_id}:${c.activity_id}`
    completionMap.set(key, { elapsed_ms: c.elapsed_ms, status: c.status })
  }

  // Calculate hours for each user
  const breakdown: HoursBreakdown[] = []

  for (const userId of userIds) {
    const userData = userMap.get(userId)
    if (!userData) continue

    const hoursByType: Record<ActivityType, number> = {
      Home: 0,
      Brain: 0,
      Body: 0,
      Downtime: 0,
    }

    let totalMinutes = 0

    if (doneOnly) {
      const userCompletions = (completions || []).filter(
        (c) => c.user_id === userId && c.status === 'done'
      )

      for (const completion of userCompletions) {
        const activity = activityMap.get(completion.activity_id)
        if (!activity) continue

        let minutes: number
        if (completion.elapsed_ms && completion.elapsed_ms > 0) {
          minutes = completion.elapsed_ms / 60000
        } else {
          minutes = activity.default_minutes
        }

        totalMinutes += minutes
        hoursByType[activity.type as ActivityType] += minutes
      }
    } else {
      const currentDate = new Date(startDate)
      const cycleStartDate = parseDate(userData.cycle_start_date)

      while (currentDate <= today) {
        const dateStr = formatDateForDB(currentDate)
        const weekOfCycle = getWeekOfCycle(currentDate, cycleStartDate, userData.cycle_weeks)
        const dayOfWeek = getDayOfWeek(currentDate)

        const daySchedule = (scheduleData || []).filter(
          (s) =>
            s.user_id === userId && s.week_of_cycle === weekOfCycle && s.day_of_week === dayOfWeek
        )

        for (const scheduleItem of daySchedule) {
          const activity = activityMap.get(scheduleItem.activity_id)
          if (!activity) continue

          const completionKey = `${dateStr}:${userId}:${scheduleItem.activity_id}`
          const completion = completionMap.get(completionKey)

          let minutes: number
          if (completion?.elapsed_ms && completion.elapsed_ms > 0) {
            minutes = completion.elapsed_ms / 60000
          } else {
            minutes = activity.default_minutes
          }

          totalMinutes += minutes
          hoursByType[activity.type as ActivityType] += minutes
        }

        currentDate.setDate(currentDate.getDate() + 1)
      }
    }

    const totalHours = totalMinutes / 60
    const hoursPerWeek = totalHours / weeksDiff
    const hoursPerDay = totalHours / daysDiff

    const byType = (['Home', 'Brain', 'Body', 'Downtime'] as ActivityType[]).map((type) => ({
      type,
      hours: Math.round((hoursByType[type] / 60) * 10) / 10,
      percentage: totalMinutes > 0 ? Math.round((hoursByType[type] / totalMinutes) * 100) : 0,
    }))

    breakdown.push({
      user_id: userId,
      display_name: userData.display_name,
      totalHours: Math.round(totalHours * 10) / 10,
      hoursPerWeek: Math.round(hoursPerWeek * 10) / 10,
      hoursPerDay: Math.round(hoursPerDay * 10) / 10,
      byType,
    })
  }

  // Calculate totals
  const totals = {
    totalHours: Math.round(breakdown.reduce((sum, b) => sum + b.totalHours, 0) * 10) / 10,
    hoursPerWeek: Math.round(breakdown.reduce((sum, b) => sum + b.hoursPerWeek, 0) * 10) / 10,
    hoursPerDay: Math.round(breakdown.reduce((sum, b) => sum + b.hoursPerDay, 0) * 10) / 10,
    byType: (['Home', 'Brain', 'Body', 'Downtime'] as ActivityType[]).map((type) => ({
      type,
      hours:
        Math.round(
          breakdown.reduce((sum, b) => sum + (b.byType.find((t) => t.type === type)?.hours || 0), 0) *
            10
        ) / 10,
      percentage: 0,
    })),
  }

  const totalTypeHours = totals.byType.reduce((sum, t) => sum + t.hours, 0)
  totals.byType.forEach((t) => {
    t.percentage = totalTypeHours > 0 ? Math.round((t.hours / totalTypeHours) * 100) : 0
  })

  return NextResponse.json({
    period,
    doneOnly,
    days: daysDiff,
    weeks: Math.round(weeksDiff * 10) / 10,
    breakdown,
    totals,
  })
}
