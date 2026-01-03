import Link from 'next/link'
import { PersonStats, PERSON_COLORS } from '@/lib/types'

interface LeaderboardCardProps {
  stats: PersonStats
  rank: number
}

const MEDALS = ['🥇', '🥈', '🥉']

export default function LeaderboardCard({ stats, rank }: LeaderboardCardProps) {
  const colors = PERSON_COLORS[stats.person]
  const percentage = Math.round(stats.ratio * 100)

  return (
    <div className="bg-white rounded-xl shadow-lg p-6 flex items-center gap-6">
      <div className="text-4xl">{MEDALS[rank] || ''}</div>

      <div className="flex-1">
        <Link href={`/${stats.person.toLowerCase()}`} className={`text-2xl font-bold ${colors.text} hover:underline`}>
          {stats.person}
        </Link>

        <div className="mt-3 flex items-center gap-4">
          <div className="flex-1 h-6 bg-gray-200 rounded-full overflow-hidden">
            <div
              className={`h-full ${colors.bg} transition-all duration-500`}
              style={{ width: `${percentage}%` }}
            />
          </div>

          <div className="text-2xl font-bold text-gray-800 w-16 text-right">
            {percentage}%
          </div>
        </div>

        <div className="mt-2 text-gray-500">
          {stats.done} / {stats.total} completed
        </div>
      </div>
    </div>
  )
}
