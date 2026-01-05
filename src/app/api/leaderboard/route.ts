import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { parseDate, getWeekOfCycle, getDayOfWeek, getDatesInMonth } from '@/lib/utils'

interface UserStats {
  user_id: string
  display_name: string
  done: number
  total: number
  ratio: number
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const monthParam = searchParams.get('month') // YYYY-MM format
  const familyId = searchParams.get('family_id') // optional: filter by family

  if (!monthParam) {
    return NextResponse.json({ error: 'month parameter required' }, { status: 400 })
  }

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
    return NextResponse.json({ month: monthParam, stats: [] })
  }

  // Get all schedule entries for these users
  const { data: scheduleData, error: scheduleError } = await supabase
    .from('schedule')
    .select('*')
    .in('user_id', userIds)

  if (scheduleError) {
    return NextResponse.json({ error: scheduleError.message }, { status: 500 })
  }

  // Get all completions for this month
  const [year, month] = monthParam.split('-')
  const startDate = `${year}-${month}-01`
  const endDate = `${year}-${month}-31` // Will work for all months

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

  // For each day in the month, calculate what was scheduled for each user
  const datesInMonth = getDatesInMonth(monthParam)
  const today = new Date()

  for (const date of datesInMonth) {
    // Only count up to today
    if (date > today) break

    for (const userId of userIds) {
      const userData = userMap.get(userId)
      if (!userData) continue

      const cycleStartDate = parseDate(userData.cycle_start_date)
      const weekOfCycle = getWeekOfCycle(date, cycleStartDate, userData.cycle_weeks)
      const dayOfWeek = getDayOfWeek(date)

      // Find schedule entries for this user on this day
      const daySchedule = scheduleData?.filter(
        (s) => s.user_id === userId && s.week_of_cycle === weekOfCycle && s.day_of_week === dayOfWeek
      )

      if (daySchedule) {
        stats[userId].total += daySchedule.length
      }
    }
  }

  // Count completions
  for (const completion of completions || []) {
    if (stats[completion.user_id]) {
      stats[completion.user_id].done++
    }
  }

  // Build response with ratios, sorted by ratio descending
  const result: UserStats[] = userIds
    .map((userId) => ({
      user_id: userId,
      display_name: userMap.get(userId)?.display_name || 'Unknown',
      done: stats[userId].done,
      total: stats[userId].total,
      ratio: stats[userId].total > 0 ? stats[userId].done / stats[userId].total : 0,
    }))
    .sort((a, b) => b.ratio - a.ratio)

  return NextResponse.json({
    month: monthParam,
    stats: result,
  })
}
