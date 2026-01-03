'use client'

import { useState } from 'react'
import { Activity, Schedule, PersonOrEveryone } from '@/lib/types'
import { DAY_NAMES, PERSON_ABBREV } from '@/lib/utils'

interface ScheduleGridProps {
  activities: Activity[]
  schedule: Schedule[]
  onScheduleChange: (
    activityId: string,
    weekOfCycle: number,
    dayOfWeek: number,
    person: PersonOrEveryone | null
  ) => void
}

const PERSON_CYCLE: (PersonOrEveryone | null)[] = [null, 'Thomas', 'Ivor', 'Axel', 'Everyone']

const PERSON_COLORS: Record<string, string> = {
  T: 'bg-blue-500/30 text-blue-300 border border-blue-500/40',
  I: 'bg-green-500/30 text-green-300 border border-green-500/40',
  A: 'bg-orange-500/30 text-orange-300 border border-orange-500/40',
  E: 'bg-purple-500/30 text-purple-300 border border-purple-500/40',
  '-': 'bg-gray-700/30 text-gray-500 border border-gray-600/30',
}

export default function ScheduleGrid({
  activities,
  schedule,
  onScheduleChange,
}: ScheduleGridProps) {
  const [selectedWeek, setSelectedWeek] = useState(1)

  const getScheduleValue = (
    activityId: string,
    weekOfCycle: number,
    dayOfWeek: number
  ): string => {
    const entry = schedule.find(
      (s) =>
        s.activity_id === activityId &&
        s.week_of_cycle === weekOfCycle &&
        s.day_of_week === dayOfWeek
    )
    return entry ? PERSON_ABBREV[entry.person] : '-'
  }

  const handleCellClick = (
    activityId: string,
    weekOfCycle: number,
    dayOfWeek: number
  ) => {
    const currentValue = getScheduleValue(activityId, weekOfCycle, dayOfWeek)
    const currentIndex = PERSON_CYCLE.findIndex(
      (p) => (p ? PERSON_ABBREV[p] : '-') === currentValue
    )
    const nextIndex = (currentIndex + 1) % PERSON_CYCLE.length
    const nextPerson = PERSON_CYCLE[nextIndex]
    onScheduleChange(activityId, weekOfCycle, dayOfWeek, nextPerson)
  }

  // Group activities by type
  const activityGroups = activities.reduce(
    (acc, activity) => {
      if (!acc[activity.type]) {
        acc[activity.type] = []
      }
      acc[activity.type].push(activity)
      return acc
    },
    {} as Record<string, Activity[]>
  )

  return (
    <div className="overflow-x-auto">
      {/* Week selector */}
      <div className="flex gap-2 mb-6">
        {[1, 2, 3, 4].map((week) => (
          <button
            key={week}
            onClick={() => setSelectedWeek(week)}
            className={`px-5 py-2 rounded-xl font-medium transition-all ${
              selectedWeek === week
                ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg shadow-blue-500/30'
                : 'bg-gray-700/50 text-gray-400 hover:text-white hover:bg-gray-600/50 border border-gray-600/50'
            }`}
          >
            Week {week}
          </button>
        ))}
      </div>

      {/* Grid */}
      <table className="w-full border-collapse">
        <thead>
          <tr className="border-b border-white/10">
            <th className="text-left p-3 font-medium text-gray-300 w-48">
              Activity
            </th>
            {DAY_NAMES.map((day, index) => (
              <th
                key={day}
                className="p-3 font-medium text-gray-300 text-center w-14"
              >
                {day}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Object.entries(activityGroups).map(([type, typeActivities]) => (
            <>
              <tr key={type} className="bg-white/5">
                <td
                  colSpan={8}
                  className="p-2 font-semibold text-gray-400 text-sm"
                >
                  {type}
                </td>
              </tr>
              {typeActivities.map((activity) => (
                <tr key={activity.id} className="border-b border-white/5">
                  <td className="p-3 text-sm text-gray-200">{activity.name}</td>
                  {DAY_NAMES.map((_, dayIndex) => {
                    const value = getScheduleValue(
                      activity.id,
                      selectedWeek,
                      dayIndex
                    )
                    return (
                      <td key={dayIndex} className="p-1 text-center">
                        <button
                          onClick={() =>
                            handleCellClick(activity.id, selectedWeek, dayIndex)
                          }
                          className={`w-10 h-10 rounded-lg font-medium text-sm transition-all hover:scale-110 hover:shadow-lg ${PERSON_COLORS[value]}`}
                        >
                          {value}
                        </button>
                      </td>
                    )
                  })}
                </tr>
              ))}
            </>
          ))}
        </tbody>
      </table>

      {/* Legend */}
      <div className="mt-6 flex gap-4 text-sm text-gray-400">
        <span className="flex items-center gap-2">
          <span className="w-6 h-6 rounded-lg bg-blue-500/30 text-blue-300 border border-blue-500/40 flex items-center justify-center text-xs font-medium">
            T
          </span>
          Thomas
        </span>
        <span className="flex items-center gap-2">
          <span className="w-6 h-6 rounded-lg bg-green-500/30 text-green-300 border border-green-500/40 flex items-center justify-center text-xs font-medium">
            I
          </span>
          Ivor
        </span>
        <span className="flex items-center gap-2">
          <span className="w-6 h-6 rounded-lg bg-orange-500/30 text-orange-300 border border-orange-500/40 flex items-center justify-center text-xs font-medium">
            A
          </span>
          Axel
        </span>
        <span className="flex items-center gap-2">
          <span className="w-6 h-6 rounded-lg bg-purple-500/30 text-purple-300 border border-purple-500/40 flex items-center justify-center text-xs font-medium">
            E
          </span>
          Everyone
        </span>
        <span className="flex items-center gap-2">
          <span className="w-6 h-6 rounded-lg bg-gray-700/30 text-gray-500 border border-gray-600/30 flex items-center justify-center text-xs font-medium">
            -
          </span>
          Not scheduled
        </span>
      </div>
    </div>
  )
}
