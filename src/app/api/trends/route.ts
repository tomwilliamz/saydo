import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { parseDate, getWeekOfCycle, getDayOfWeek, formatDateForDB } from '@/lib/utils'

export interface TrendDataPoint {
  label: string
  date: string
  ratio: number
  done: number
  total: number
}

export interface UserTrend {
  user_id: string
  display_name: string
  avatar_url: string | null
  data: TrendDataPoint[]
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const granularity = searchParams.get('granularity') || 'day'
  const familyId = searchParams.get('family_id')

  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Get users to calculate trends for
  let userIds: string[] = []
  let userMap: Map<string, { display_name: string; avatar_url: string | null; cycle_weeks: number; cycle_start_date: string }> = new Map()

  if (familyId) {
    const { data: members } = await supabase
      .from('family_members')
      .select('user_id, users(id, display_name, avatar_url, cycle_weeks, cycle_start_date)')
      .eq('family_id', familyId)

    if (members) {
      for (const m of members) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const userData = m.users as any
        if (userData) {
          userIds.push(m.user_id)
          userMap.set(m.user_id, {
            display_name: userData.display_name,
            avatar_url: userData.avatar_url,
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
        .select('user_id, users(id, display_name, avatar_url, cycle_weeks, cycle_start_date)')
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
                avatar_url: userData.avatar_url,
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
        .select('id, display_name, avatar_url, cycle_weeks, cycle_start_date')
        .eq('id', user.id)
        .single()

      if (currentUser) {
        userIds.push(currentUser.id)
        userMap.set(currentUser.id, {
          display_name: currentUser.display_name,
          avatar_url: currentUser.avatar_url,
          cycle_weeks: currentUser.cycle_weeks,
          cycle_start_date: currentUser.cycle_start_date,
        })
      }
    }
  }

  if (userIds.length === 0) {
    return NextResponse.json({ granularity, trends: [] })
  }

  const today = new Date()
  // Start from 30 days ago
  const startDate = new Date(today)
  startDate.setDate(startDate.getDate() - 30)

  // Get all schedule entries for these users
  const { data: scheduleData, error: scheduleError } = await supabase
    .from('schedule')
    .select('*')
    .in('user_id', userIds)

  if (scheduleError) {
    return NextResponse.json({ error: scheduleError.message }, { status: 500 })
  }

  // Get all completions in range
  const { data: completions, error: completionsError } = await supabase
    .from('completions')
    .select('*')
    .in('user_id', userIds)
    .gte('date', formatDateForDB(startDate))
    .lte('date', formatDateForDB(today))
    .eq('status', 'done')

  if (completionsError) {
    return NextResponse.json({ error: completionsError.message }, { status: 500 })
  }

  // Count completions per date/user
  const completionCounts = new Map<string, number>()
  for (const c of completions || []) {
    const key = `${c.date}:${c.user_id}`
    completionCounts.set(key, (completionCounts.get(key) || 0) + 1)
  }

  // Calculate scheduled tasks per date/user
  const scheduledCounts = new Map<string, number>()
  const currentDate = new Date(startDate)

  while (currentDate <= today) {
    const dateStr = formatDateForDB(currentDate)

    for (const userId of userIds) {
      const userData = userMap.get(userId)
      if (!userData) continue

      const cycleStartDate = parseDate(userData.cycle_start_date)
      const weekOfCycle = getWeekOfCycle(currentDate, cycleStartDate, userData.cycle_weeks)
      const dayOfWeek = getDayOfWeek(currentDate)

      const daySchedule = scheduleData?.filter(
        (s) => s.user_id === userId && s.week_of_cycle === weekOfCycle && s.day_of_week === dayOfWeek
      )

      if (daySchedule && daySchedule.length > 0) {
        const key = `${dateStr}:${userId}`
        scheduledCounts.set(key, (scheduledCounts.get(key) || 0) + daySchedule.length)
      }
    }

    currentDate.setDate(currentDate.getDate() + 1)
  }

  // Build trend data for each user
  const trends: UserTrend[] = []

  for (const userId of userIds) {
    const userData = userMap.get(userId)
    if (!userData) continue

    const data: TrendDataPoint[] = []

    if (granularity === 'day') {
      const date = new Date(startDate)
      while (date <= today) {
        const dateStr = formatDateForDB(date)
        const key = `${dateStr}:${userId}`
        const done = completionCounts.get(key) || 0
        const total = scheduledCounts.get(key) || 0

        data.push({
          label: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          date: dateStr,
          ratio: total > 0 ? done / total : 0,
          done,
          total,
        })

        date.setDate(date.getDate() + 1)
      }
    } else {
      // Weekly aggregation
      const date = new Date(startDate)
      const dayOfWeek = date.getDay()
      const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1
      date.setDate(date.getDate() - daysFromMonday)

      while (date <= today) {
        const weekStart = new Date(date)
        const weekEnd = new Date(date)
        weekEnd.setDate(weekEnd.getDate() + 6)
        const effectiveEnd = weekEnd > today ? today : weekEnd

        let weekDone = 0
        let weekTotal = 0

        const dayInWeek = new Date(weekStart)
        while (dayInWeek <= effectiveEnd) {
          const dateStr = formatDateForDB(dayInWeek)
          const key = `${dateStr}:${userId}`
          weekDone += completionCounts.get(key) || 0
          weekTotal += scheduledCounts.get(key) || 0
          dayInWeek.setDate(dayInWeek.getDate() + 1)
        }

        data.push({
          label: weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          date: formatDateForDB(weekStart),
          ratio: weekTotal > 0 ? weekDone / weekTotal : 0,
          done: weekDone,
          total: weekTotal,
        })

        date.setDate(date.getDate() + 7)
      }
    }

    trends.push({
      user_id: userId,
      display_name: userData.display_name,
      avatar_url: userData.avatar_url,
      data,
    })
  }

  return NextResponse.json({
    granularity,
    trends,
  })
}
