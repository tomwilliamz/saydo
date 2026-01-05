import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { parseDate, getWeekOfCycle, getDayOfWeek, formatDateForDB } from '@/lib/utils'

interface UserStats {
  user_id: string
  display_name: string
  done: number
  total: number
  ratio: number
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const period = searchParams.get('period') || 'today' // today, week, month, all
  const familyId = searchParams.get('family_id') // optional: filter by family

  const supabase = await createClient()

  // Get authenticated user
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Get users to calculate stats for
  let userIds: string[] = []
  let userMap: Map<string, { display_name: string; cycle_weeks: number; cycle_start_date: string }> = new Map()

  if (familyId) {
    // Get family members
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
    // Get current user's families and all members
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
      // Just current user
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
    return NextResponse.json({ period, stats: [] })
  }

  const today = new Date()

  // Determine date range based on period
  let startDate: string
  let endDate: string = formatDateForDB(today)

  if (period === 'today') {
    startDate = formatDateForDB(today)
  } else if (period === 'week') {
    const dayOfWeek = today.getDay()
    const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1
    const monday = new Date(today)
    monday.setDate(today.getDate() - daysFromMonday)
    startDate = formatDateForDB(monday)
  } else if (period === 'month') {
    const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)
    startDate = formatDateForDB(firstOfMonth)
  } else {
    startDate = '2000-01-01'
  }

  // Get all schedule entries for these users
  const { data: scheduleData, error: scheduleError } = await supabase
    .from('schedule')
    .select('*')
    .in('user_id', userIds)

  if (scheduleError) {
    return NextResponse.json({ error: scheduleError.message }, { status: 500 })
  }

  // Get completions for the date range
  const { data: completions, error: completionsError } = await supabase
    .from('completions')
    .select('*')
    .in('user_id', userIds)
    .gte('date', startDate)
    .lte('date', endDate)
    .eq('status', 'done')

  if (completionsError) {
    return NextResponse.json({ error: completionsError.message }, { status: 500 })
  }

  // Calculate totals for each user
  const stats: Record<string, { done: number; total: number }> = {}
  for (const userId of userIds) {
    stats[userId] = { done: 0, total: 0 }
  }

  // For each day in the range, calculate what was scheduled for each user
  const start = parseDate(startDate)
  const end = parseDate(endDate)
  const currentDate = new Date(start)

  while (currentDate <= end && currentDate <= today) {
    for (const userId of userIds) {
      const userData = userMap.get(userId)
      if (!userData) continue

      const cycleStartDate = parseDate(userData.cycle_start_date)
      const weekOfCycle = getWeekOfCycle(currentDate, cycleStartDate, userData.cycle_weeks)
      const dayOfWeek = getDayOfWeek(currentDate)

      // Find schedule entries for this user on this day
      const daySchedule = scheduleData?.filter(
        (s) => s.user_id === userId && s.week_of_cycle === weekOfCycle && s.day_of_week === dayOfWeek
      )

      if (daySchedule) {
        stats[userId].total += daySchedule.length
      }
    }

    currentDate.setDate(currentDate.getDate() + 1)
  }

  // Count completions
  for (const completion of completions || []) {
    if (stats[completion.user_id]) {
      stats[completion.user_id].done++
    }
  }

  // Build response with ratios
  const result: UserStats[] = userIds.map((userId) => ({
    user_id: userId,
    display_name: userMap.get(userId)?.display_name || 'Unknown',
    done: stats[userId].done,
    total: stats[userId].total,
    ratio: stats[userId].total > 0 ? stats[userId].done / stats[userId].total : 0,
  }))

  return NextResponse.json({
    period,
    startDate,
    endDate,
    stats: result,
  })
}
