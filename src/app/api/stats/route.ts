import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { parseDate, getWeekOfCycle, getDayOfWeek, formatDateForDB } from '@/lib/utils'
import { PersonStats, Person, ALL_PERSONS } from '@/lib/types'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const period = searchParams.get('period') || 'today' // today, week, all

  const supabase = await createClient()

  // Get cycle start date from settings
  const { data: settings, error: settingsError } = await supabase
    .from('settings')
    .select('value')
    .eq('key', 'cycle_start_date')
    .single()

  if (settingsError) {
    return NextResponse.json({ error: settingsError.message }, { status: 500 })
  }

  const cycleStartDate = parseDate(settings.value)
  const today = new Date()

  // Determine date range based on period
  let startDate: string
  let endDate: string = formatDateForDB(today)

  if (period === 'today') {
    startDate = formatDateForDB(today)
  } else if (period === 'week') {
    // Get start of current week (Monday)
    const dayOfWeek = today.getDay()
    const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1
    const monday = new Date(today)
    monday.setDate(today.getDate() - daysFromMonday)
    startDate = formatDateForDB(monday)
  } else if (period === 'month') {
    // Get start of current month
    const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)
    startDate = formatDateForDB(firstOfMonth)
  } else {
    // 'all' - get all completions
    startDate = '2000-01-01'
  }

  // Get all schedule entries
  const { data: scheduleData, error: scheduleError } = await supabase
    .from('schedule')
    .select('*')

  if (scheduleError) {
    return NextResponse.json({ error: scheduleError.message }, { status: 500 })
  }

  // Get completions for the date range
  const { data: completions, error: completionsError } = await supabase
    .from('completions')
    .select('*')
    .gte('date', startDate)
    .lte('date', endDate)
    .eq('status', 'done')

  if (completionsError) {
    return NextResponse.json({ error: completionsError.message }, { status: 500 })
  }

  // Calculate totals for each person
  const stats: Record<Person, { done: number; total: number }> = {
    Thomas: { done: 0, total: 0 },
    Ivor: { done: 0, total: 0 },
    Axel: { done: 0, total: 0 },
  }

  // For each day in the range, calculate what was scheduled
  const start = parseDate(startDate)
  const end = parseDate(endDate)
  const currentDate = new Date(start)

  while (currentDate <= end && currentDate <= today) {
    const weekOfCycle = getWeekOfCycle(currentDate, cycleStartDate)
    const dayOfWeek = getDayOfWeek(currentDate)

    // Find all schedule entries for this day
    const daySchedule = scheduleData.filter(
      (s) => s.week_of_cycle === weekOfCycle && s.day_of_week === dayOfWeek
    )

    for (const scheduleItem of daySchedule) {
      if (scheduleItem.person === 'Everyone') {
        for (const person of ALL_PERSONS) {
          stats[person].total++
        }
      } else {
        stats[scheduleItem.person as Person].total++
      }
    }

    currentDate.setDate(currentDate.getDate() + 1)
  }

  // Count completions
  for (const completion of completions) {
    if (stats[completion.person as Person]) {
      stats[completion.person as Person].done++
    }
  }

  // Build response with ratios
  const result: PersonStats[] = ALL_PERSONS.map((person) => ({
    person,
    done: stats[person].done,
    total: stats[person].total,
    ratio: stats[person].total > 0 ? stats[person].done / stats[person].total : 0,
  }))

  return NextResponse.json({
    period,
    startDate,
    endDate,
    stats: result,
  })
}
