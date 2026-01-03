import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { parseDate, getWeekOfCycle, getDayOfWeek, formatDateForDB } from '@/lib/utils'
import { Person, ALL_PERSONS } from '@/lib/types'

export interface TrendDataPoint {
  label: string
  date: string // For day view: YYYY-MM-DD, for week view: start of week
  ratio: number
  done: number
  total: number
}

export interface PersonTrend {
  person: Person
  data: TrendDataPoint[]
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const granularity = searchParams.get('granularity') || 'day' // day or week
  const days = parseInt(searchParams.get('days') || '30') // How many days back to look

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

  // Start from cycle start date (not arbitrary days back)
  const startDate = new Date(cycleStartDate)

  // Get all schedule entries
  const { data: scheduleData, error: scheduleError } = await supabase
    .from('schedule')
    .select('*')

  if (scheduleError) {
    return NextResponse.json({ error: scheduleError.message }, { status: 500 })
  }

  // Get all completions in range
  const { data: completions, error: completionsError } = await supabase
    .from('completions')
    .select('*')
    .gte('date', formatDateForDB(startDate))
    .lte('date', formatDateForDB(today))
    .eq('status', 'done')

  if (completionsError) {
    return NextResponse.json({ error: completionsError.message }, { status: 500 })
  }

  // Build a map of completions by date and person
  const completionMap = new Map<string, Set<string>>()
  for (const c of completions) {
    const key = `${c.date}:${c.person}`
    if (!completionMap.has(c.date)) {
      completionMap.set(c.date, new Set())
    }
    completionMap.get(c.date)!.add(c.person)
  }

  // Count completions per date/person
  const completionCounts = new Map<string, number>()
  for (const c of completions) {
    const key = `${c.date}:${c.person}`
    completionCounts.set(key, (completionCounts.get(key) || 0) + 1)
  }

  // Calculate scheduled tasks per date/person
  const scheduledCounts = new Map<string, number>()
  const currentDate = new Date(startDate)

  while (currentDate <= today) {
    const dateStr = formatDateForDB(currentDate)
    const weekOfCycle = getWeekOfCycle(currentDate, cycleStartDate)
    const dayOfWeek = getDayOfWeek(currentDate)

    const daySchedule = scheduleData.filter(
      (s) => s.week_of_cycle === weekOfCycle && s.day_of_week === dayOfWeek
    )

    for (const scheduleItem of daySchedule) {
      if (scheduleItem.person === 'Everyone') {
        for (const person of ALL_PERSONS) {
          const key = `${dateStr}:${person}`
          scheduledCounts.set(key, (scheduledCounts.get(key) || 0) + 1)
        }
      } else {
        const key = `${dateStr}:${scheduleItem.person}`
        scheduledCounts.set(key, (scheduledCounts.get(key) || 0) + 1)
      }
    }

    currentDate.setDate(currentDate.getDate() + 1)
  }

  // Build trend data for each person
  const trends: PersonTrend[] = []

  for (const person of ALL_PERSONS) {
    const data: TrendDataPoint[] = []

    if (granularity === 'day') {
      // Daily data points
      const date = new Date(startDate)
      while (date <= today) {
        const dateStr = formatDateForDB(date)
        const key = `${dateStr}:${person}`
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
      // Align to Monday
      const dayOfWeek = date.getDay()
      const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1
      date.setDate(date.getDate() - daysFromMonday)

      while (date <= today) {
        const weekStart = new Date(date)
        const weekEnd = new Date(date)
        weekEnd.setDate(weekEnd.getDate() + 6)

        // Cap weekEnd to today
        const effectiveEnd = weekEnd > today ? today : weekEnd

        let weekDone = 0
        let weekTotal = 0

        const dayInWeek = new Date(weekStart)
        while (dayInWeek <= effectiveEnd) {
          const dateStr = formatDateForDB(dayInWeek)
          const key = `${dateStr}:${person}`
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

    trends.push({ person, data })
  }

  return NextResponse.json({
    granularity,
    days,
    trends,
  })
}
