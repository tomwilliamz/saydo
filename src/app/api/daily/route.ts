import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { parseDate, getWeekOfCycle, getDayOfWeek } from '@/lib/utils'
import { DailyTask, Person, ALL_PERSONS } from '@/lib/types'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const dateParam = searchParams.get('date')

  if (!dateParam) {
    return NextResponse.json({ error: 'date parameter required' }, { status: 400 })
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

  const targetDate = parseDate(dateParam)
  const cycleStartDate = parseDate(settings.value)
  const weekOfCycle = getWeekOfCycle(targetDate, cycleStartDate)
  const dayOfWeek = getDayOfWeek(targetDate)

  // Get schedule for this day
  const { data: scheduleData, error: scheduleError } = await supabase
    .from('schedule')
    .select(`
      *,
      activity:activities(*)
    `)
    .eq('week_of_cycle', weekOfCycle)
    .eq('day_of_week', dayOfWeek)

  if (scheduleError) {
    return NextResponse.json({ error: scheduleError.message }, { status: 500 })
  }

  // Get completions for this date
  const { data: completions, error: completionsError } = await supabase
    .from('completions')
    .select('*')
    .eq('date', dateParam)

  if (completionsError) {
    return NextResponse.json({ error: completionsError.message }, { status: 500 })
  }

  // Build daily tasks array
  const tasks: DailyTask[] = []

  for (const scheduleItem of scheduleData) {
    const activity = scheduleItem.activity

    if (scheduleItem.person === 'Everyone') {
      // Create a task for each person
      for (const person of ALL_PERSONS) {
        const completion = completions.find(
          (c) => c.activity_id === activity.id && c.person === person
        ) || null

        tasks.push({
          activity,
          person,
          completion,
        })
      }
    } else {
      const person = scheduleItem.person as Person
      const completion = completions.find(
        (c) => c.activity_id === activity.id && c.person === person
      ) || null

      tasks.push({
        activity,
        person,
        completion,
      })
    }
  }

  // Sort tasks: by type, then by activity name, then by person
  tasks.sort((a, b) => {
    if (a.activity.type !== b.activity.type) {
      const typeOrder = ['Home', 'Brain', 'Body', 'Downtime']
      return typeOrder.indexOf(a.activity.type) - typeOrder.indexOf(b.activity.type)
    }
    if (a.activity.name !== b.activity.name) {
      return a.activity.name.localeCompare(b.activity.name)
    }
    return ALL_PERSONS.indexOf(a.person) - ALL_PERSONS.indexOf(b.person)
  })

  return NextResponse.json({
    date: dateParam,
    weekOfCycle,
    dayOfWeek,
    tasks,
  })
}
