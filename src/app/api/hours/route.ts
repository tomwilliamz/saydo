import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { parseDate, getWeekOfCycle, getDayOfWeek, formatDateForDB } from '@/lib/utils'
import { Person, ALL_PERSONS, ActivityType } from '@/lib/types'

interface HoursBreakdown {
  person: Person
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
  const period = searchParams.get('period') || 'month' // month, week, all
  const doneOnly = searchParams.get('doneOnly') === 'true' // false = scheduled, true = completed only

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
  let startDate: Date
  if (period === 'week') {
    startDate = new Date(today)
    startDate.setDate(startDate.getDate() - 7)
  } else if (period === 'month') {
    startDate = new Date(today)
    startDate.setDate(startDate.getDate() - 30)
  } else {
    startDate = new Date(cycleStartDate)
  }

  // Calculate number of days and weeks in the period
  const daysDiff = Math.ceil((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1
  const weeksDiff = daysDiff / 7

  // Get all activities to get default_minutes and type
  const { data: activities, error: activitiesError } = await supabase
    .from('activities')
    .select('id, name, default_minutes, type')

  if (activitiesError) {
    return NextResponse.json({ error: activitiesError.message }, { status: 500 })
  }

  const activityMap = new Map(activities.map(a => [a.id, a]))

  // Get all schedule entries
  const { data: scheduleData, error: scheduleError } = await supabase
    .from('schedule')
    .select('*')

  if (scheduleError) {
    return NextResponse.json({ error: scheduleError.message }, { status: 500 })
  }

  // Get all completions in range (for actual time tracking)
  const { data: completions, error: completionsError } = await supabase
    .from('completions')
    .select('*')
    .gte('date', formatDateForDB(startDate))
    .lte('date', formatDateForDB(today))

  if (completionsError) {
    return NextResponse.json({ error: completionsError.message }, { status: 500 })
  }

  // Build completion map for looking up actual times
  const completionMap = new Map<string, { elapsed_ms: number | null; status: string }>()
  for (const c of completions) {
    const key = `${c.date}:${c.person}:${c.activity_id}`
    completionMap.set(key, { elapsed_ms: c.elapsed_ms, status: c.status })
  }

  // Calculate hours for each person
  const breakdown: HoursBreakdown[] = []

  for (const person of ALL_PERSONS) {
    // Track hours by type
    const hoursByType: Record<ActivityType, number> = {
      Home: 0,
      Brain: 0,
      Body: 0,
      Downtime: 0,
    }

    let totalMinutes = 0

    if (doneOnly) {
      // Only count completed tasks - use actual elapsed time or default
      const personCompletions = completions.filter(c => c.person === person && c.status === 'done')

      for (const completion of personCompletions) {
        const activity = activityMap.get(completion.activity_id)
        if (!activity) continue

        // Use elapsed_ms if recorded, otherwise use default_minutes
        let minutes: number
        if (completion.elapsed_ms && completion.elapsed_ms > 0) {
          minutes = completion.elapsed_ms / 60000 // Convert ms to minutes
        } else {
          minutes = activity.default_minutes
        }

        totalMinutes += minutes
        hoursByType[activity.type as ActivityType] += minutes
      }
    } else {
      // Count all scheduled tasks - for planning view
      // Walk through each day and find scheduled tasks for this person
      const currentDate = new Date(startDate)

      while (currentDate <= today) {
        const dateStr = formatDateForDB(currentDate)
        const weekOfCycle = getWeekOfCycle(currentDate, cycleStartDate)
        const dayOfWeek = getDayOfWeek(currentDate)

        const daySchedule = scheduleData.filter(
          (s) => s.week_of_cycle === weekOfCycle && s.day_of_week === dayOfWeek
        )

        for (const scheduleItem of daySchedule) {
          // Check if this task is for this person (or Everyone)
          if (scheduleItem.person !== person && scheduleItem.person !== 'Everyone') {
            continue
          }

          const activity = activityMap.get(scheduleItem.activity_id)
          if (!activity) continue

          // Check if there's a completion with actual time
          const completionKey = `${dateStr}:${person}:${scheduleItem.activity_id}`
          const completion = completionMap.get(completionKey)

          let minutes: number
          if (completion?.elapsed_ms && completion.elapsed_ms > 0) {
            // Use actual recorded time
            minutes = completion.elapsed_ms / 60000
          } else {
            // Use default time
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

    // Calculate percentages and convert to hours
    const byType = (Object.keys(hoursByType) as ActivityType[]).map(type => ({
      type,
      hours: hoursByType[type] / 60,
      percentage: totalMinutes > 0 ? Math.round((hoursByType[type] / totalMinutes) * 100) : 0,
    }))

    breakdown.push({
      person,
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
    byType: (Object.keys({ Home: 0, Brain: 0, Body: 0, Downtime: 0 }) as ActivityType[]).map(type => ({
      type,
      hours: Math.round(breakdown.reduce((sum, b) => sum + (b.byType.find(t => t.type === type)?.hours || 0), 0) * 10) / 10,
      percentage: 0, // Will calculate below
    })),
  }

  // Calculate total percentage
  const totalTypeHours = totals.byType.reduce((sum, t) => sum + t.hours, 0)
  totals.byType.forEach(t => {
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
