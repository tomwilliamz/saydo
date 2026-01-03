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
  T: 'bg-blue-100 text-blue-800',
  I: 'bg-green-100 text-green-800',
  A: 'bg-orange-100 text-orange-800',
  E: 'bg-purple-100 text-purple-800',
  '-': 'bg-gray-50 text-gray-400',
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
      <div className="flex gap-2 mb-4">
        {[1, 2, 3, 4].map((week) => (
          <button
            key={week}
            onClick={() => setSelectedWeek(week)}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              selectedWeek === week
                ? 'bg-gray-900 text-white'
                : 'bg-white text-gray-600 hover:bg-gray-100 border'
            }`}
          >
            Week {week}
          </button>
        ))}
      </div>

      {/* Grid */}
      <table className="w-full border-collapse bg-white rounded-lg shadow">
        <thead>
          <tr className="border-b">
            <th className="text-left p-3 font-medium text-gray-700 w-48">
              Activity
            </th>
            {DAY_NAMES.map((day, index) => (
              <th
                key={day}
                className="p-3 font-medium text-gray-700 text-center w-14"
              >
                {day}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Object.entries(activityGroups).map(([type, typeActivities]) => (
            <>
              <tr key={type} className="bg-gray-50">
                <td
                  colSpan={8}
                  className="p-2 font-semibold text-gray-600 text-sm"
                >
                  {type}
                </td>
              </tr>
              {typeActivities.map((activity) => (
                <tr key={activity.id} className="border-b border-gray-100">
                  <td className="p-3 text-sm text-gray-800">{activity.name}</td>
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
                          className={`w-10 h-10 rounded font-medium text-sm transition-colors hover:ring-2 hover:ring-gray-300 ${PERSON_COLORS[value]}`}
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
      <div className="mt-4 flex gap-4 text-sm text-gray-600">
        <span className="flex items-center gap-1">
          <span className="w-6 h-6 rounded bg-blue-100 text-blue-800 flex items-center justify-center text-xs font-medium">
            T
          </span>
          Thomas
        </span>
        <span className="flex items-center gap-1">
          <span className="w-6 h-6 rounded bg-green-100 text-green-800 flex items-center justify-center text-xs font-medium">
            I
          </span>
          Ivor
        </span>
        <span className="flex items-center gap-1">
          <span className="w-6 h-6 rounded bg-orange-100 text-orange-800 flex items-center justify-center text-xs font-medium">
            A
          </span>
          Axel
        </span>
        <span className="flex items-center gap-1">
          <span className="w-6 h-6 rounded bg-purple-100 text-purple-800 flex items-center justify-center text-xs font-medium">
            E
          </span>
          Everyone
        </span>
        <span className="flex items-center gap-1">
          <span className="w-6 h-6 rounded bg-gray-50 text-gray-400 flex items-center justify-center text-xs font-medium">
            -
          </span>
          Not scheduled
        </span>
      </div>
    </div>
  )
}
