'use client'

import { formatDateForDisplay, isToday as checkIsToday } from '@/lib/utils'

interface DateNavProps {
  currentDate: Date
  onPrevious: () => void
  onNext: () => void
  onToday: () => void
}

export default function DateNav({
  currentDate,
  onPrevious,
  onNext,
  onToday,
}: DateNavProps) {
  const isToday = checkIsToday(currentDate)

  return (
    <div className="flex items-center justify-center gap-4 py-4">
      <button
        onClick={onPrevious}
        className="flex items-center gap-1 px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
      >
        <span className="text-xl">&larr;</span>
        <span>Yesterday</span>
      </button>

      <button
        onClick={onToday}
        className={`px-6 py-2 rounded-lg font-medium transition-colors ${
          isToday
            ? 'bg-yellow-100 text-yellow-800'
            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
        }`}
      >
        {isToday ? '★ Today ★' : 'Go to Today'}
      </button>

      <button
        onClick={onNext}
        className="flex items-center gap-1 px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
      >
        <span>Tomorrow</span>
        <span className="text-xl">&rarr;</span>
      </button>

      <div className="ml-4 text-lg font-medium text-gray-700">
        {formatDateForDisplay(currentDate)}
      </div>
    </div>
  )
}
