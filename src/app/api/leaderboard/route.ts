import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { parseDate, getWeekOfCycle, getDayOfWeek, getDatesInMonth } from '@/lib/utils'
import { PersonStats, Person, ALL_PERSONS } from '@/lib/types'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const monthParam = searchParams.get('month') // YYYY-MM format

  if (!monthParam) {
    return NextResponse.json({ error: 'month parameter required' }, { status: 400 })
  }

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

  // Get all schedule entries
  const { data: scheduleData, error: scheduleError } = await supabase
    .from('schedule')
    .select('*')

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

  // For each day in the month, calculate what was scheduled
  const datesInMonth = getDatesInMonth(monthParam)

  for (const date of datesInMonth) {
    // Only count up to today
    if (date > new Date()) break

    const weekOfCycle = getWeekOfCycle(date, cycleStartDate)
    const dayOfWeek = getDayOfWeek(date)

    // Find all schedule entries for this day
    const daySchedule = scheduleData.filter(
      (s) => s.week_of_cycle === weekOfCycle && s.day_of_week === dayOfWeek
    )

    for (const scheduleItem of daySchedule) {
      if (scheduleItem.person === 'Everyone') {
        // Add to all persons
        for (const person of ALL_PERSONS) {
          stats[person].total++
        }
      } else {
        stats[scheduleItem.person as Person].total++
      }
    }
  }

  // Count completions
  for (const completion of completions) {
    if (stats[completion.person as Person]) {
      stats[completion.person as Person].done++
    }
  }

  // Build response with ratios, sorted by ratio descending
  const result: PersonStats[] = ALL_PERSONS.map((person) => ({
    person,
    done: stats[person].done,
    total: stats[person].total,
    ratio: stats[person].total > 0 ? stats[person].done / stats[person].total : 0,
  })).sort((a, b) => b.ratio - a.ratio)

  return NextResponse.json({
    month: monthParam,
    stats: result,
  })
}
