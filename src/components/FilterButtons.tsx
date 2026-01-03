'use client'

import { Person, ALL_PERSONS, PERSON_COLORS } from '@/lib/types'

interface FilterButtonsProps {
  selectedPerson: Person | null
  onSelect: (person: Person | null) => void
  completedCount: number
  totalCount: number
}

export default function FilterButtons({
  selectedPerson,
  onSelect,
  completedCount,
  totalCount,
}: FilterButtonsProps) {
  return (
    <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b">
      <div className="flex gap-2">
        <button
          onClick={() => onSelect(null)}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            selectedPerson === null
              ? 'bg-gray-900 text-white'
              : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
          }`}
        >
          All
        </button>

        {ALL_PERSONS.map((person) => {
          const colors = PERSON_COLORS[person]
          const isSelected = selectedPerson === person

          return (
            <button
              key={person}
              onClick={() => onSelect(person)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                isSelected
                  ? `${colors.bg} text-white`
                  : `bg-white ${colors.text} hover:bg-gray-100 border ${colors.border}`
              }`}
            >
              {person}
            </button>
          )
        })}
      </div>

      <div className="text-gray-600 font-medium">
        {completedCount}/{totalCount} done
      </div>
    </div>
  )
}
