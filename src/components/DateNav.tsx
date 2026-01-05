'use client'

import { useState } from 'react'
import { format } from 'date-fns'
import { isToday as checkIsToday, parseDate } from '@/lib/utils'

interface DateNavProps {
  currentDate: Date
  onPrevious: () => void
  onNext: () => void
  onToday: () => void
  onDateSelect: (date: Date) => void
  darkMode?: boolean
}

export default function DateNav({
  currentDate,
  onPrevious,
  onNext,
  onToday,
  onDateSelect,
  darkMode = false,
}: DateNavProps) {
  const [showDatePicker, setShowDatePicker] = useState(false)
  const isToday = checkIsToday(currentDate)

  const dayOfWeek = format(currentDate, 'EEEE') // "Monday", "Tuesday", etc.
  const dateDisplay = format(currentDate, 'MMMM d, yyyy') // "January 3, 2025"

  const handleDateInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedDate = parseDate(e.target.value)
    onDateSelect(selectedDate)
    setShowDatePicker(false)
  }

  return (
    <div className="flex items-center justify-between py-4">
      {/* Left side: big day display */}
      <div>
        {/* TODAY button - centered above day of week, hidden when on today */}
        {!isToday && (
          <div className="flex justify-center mb-1">
            <button
              onClick={onToday}
              className={`px-3 py-1 text-sm rounded-lg font-medium transition-colors ${
                darkMode
                  ? 'bg-gray-700/50 text-gray-300 hover:bg-gray-600/50'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Go to Today
            </button>
          </div>
        )}
        <div className={`text-5xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>{dayOfWeek}</div>
        <div className={`text-lg mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>{dateDisplay}</div>
      </div>

      {/* Right side: nav buttons */}
      <div className="flex items-center gap-2">
        <button
          onClick={onPrevious}
          className={`flex items-center gap-1 px-4 py-2 rounded-lg transition-colors ${
            darkMode
              ? 'text-gray-300 hover:bg-gray-700/50'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          <span className="text-xl">&larr;</span>
          <span>{isToday ? 'Yesterday' : 'Prior Day'}</span>
        </button>

        <button
          onClick={onNext}
          className={`flex items-center gap-1 px-4 py-2 rounded-lg transition-colors ${
            darkMode
              ? 'text-gray-300 hover:bg-gray-700/50'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          <span>{isToday ? 'Tomorrow' : 'Next Day'}</span>
          <span className="text-xl">&rarr;</span>
        </button>

        {/* Date picker button */}
        <div className="relative ml-2">
          <button
            onClick={() => setShowDatePicker(!showDatePicker)}
            className={`px-3 py-2 rounded-lg transition-colors ${
              darkMode
                ? 'text-gray-400 hover:bg-gray-700/50'
                : 'text-gray-500 hover:bg-gray-100'
            }`}
            title="Jump to date"
          >
            •••
          </button>
          {showDatePicker && (
            <div className={`absolute top-full right-0 mt-1 z-50 rounded-lg shadow-lg p-2 ${
              darkMode
                ? 'bg-gray-800 border border-gray-700'
                : 'bg-white border'
            }`}>
              <input
                type="date"
                value={format(currentDate, 'yyyy-MM-dd')}
                onChange={handleDateInputChange}
                className={`px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  darkMode
                    ? 'bg-gray-700 border-gray-600 text-white'
                    : 'bg-white text-gray-900'
                }`}
                autoFocus
              />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
