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

        {/* Calendar picker button */}
        <div className="relative ml-2">
          <button
            onClick={() => setShowDatePicker(!showDatePicker)}
            className={`p-2 rounded-lg transition-colors ${
              darkMode
                ? 'text-gray-400 hover:bg-gray-700/50'
                : 'text-gray-500 hover:bg-gray-100'
            }`}
            title="Jump to date"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="w-6 h-6"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5"
              />
            </svg>
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
