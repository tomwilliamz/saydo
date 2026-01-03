import { Person, PERSON_COLORS } from '@/lib/types'

interface PersonBadgeProps {
  person: Person
  size?: 'sm' | 'md' | 'lg'
}

export default function PersonBadge({ person, size = 'md' }: PersonBadgeProps) {
  const colors = PERSON_COLORS[person]

  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-3 py-1 text-sm',
    lg: 'px-4 py-2 text-base',
  }

  return (
    <span
      className={`inline-flex items-center font-medium rounded-full text-white ${colors.bg} ${sizeClasses[size]}`}
    >
      {person}
    </span>
  )
}
