export type ActivityType = 'Home' | 'Brain' | 'Body' | 'Downtime'

export type Person = 'Thomas' | 'Ivor' | 'Axel'

export type PersonOrEveryone = Person | 'Everyone'

export type CompletionStatus = 'started' | 'stopped' | 'done' | 'skipped'

export interface Activity {
  id: string
  name: string
  type: ActivityType
  default_minutes: number
  description: string | null
  created_at: string
}

export interface Schedule {
  id: string
  activity_id: string
  person: PersonOrEveryone
  day_of_week: number // 0=Monday, 6=Sunday
  week_of_cycle: number // 1, 2, 3, or 4
}

export interface Completion {
  id: string
  activity_id: string
  person: Person
  date: string // YYYY-MM-DD
  status: CompletionStatus
  started_at: string | null
  completed_at: string | null
  elapsed_ms: number | null // Accumulated time in milliseconds (for stop/resume)
  created_at: string
}

export interface Setting {
  id: string
  key: string
  value: string
}

// Combined type for daily view
export interface DailyTask {
  activity: Activity
  person: Person
  completion: Completion | null
}

// Leaderboard stats
export interface PersonStats {
  person: Person
  done: number
  total: number
  ratio: number
}

// Type emoji mapping
export const TYPE_EMOJI: Record<ActivityType, string> = {
  Home: '🏠',
  Brain: '🧠',
  Body: '💪',
  Downtime: '🎮',
}

// Person colors (Tailwind classes)
export const PERSON_COLORS: Record<Person, { bg: string; text: string; border: string }> = {
  Thomas: { bg: 'bg-blue-500', text: 'text-blue-700', border: 'border-blue-500' },
  Ivor: { bg: 'bg-green-500', text: 'text-green-700', border: 'border-green-500' },
  Axel: { bg: 'bg-orange-500', text: 'text-orange-700', border: 'border-orange-500' },
}

// Activity type colors (Tailwind classes)
export const TYPE_COLORS: Record<ActivityType, string> = {
  Home: 'bg-purple-100',
  Brain: 'bg-yellow-100',
  Body: 'bg-red-100',
  Downtime: 'bg-teal-100',
}

// All persons array for iteration
export const ALL_PERSONS: Person[] = ['Thomas', 'Ivor', 'Axel']

// Person avatars (stored in /public/avatar/)
export const PERSON_AVATARS: Record<Person, string> = {
  Thomas: '/avatar/tom.jpg',
  Ivor: '/avatar/ivor.jpg',
  Axel: '/avatar/axel.jpg',
}

// Device for multi-device communication
export interface Device {
  id: string
  name: string
  fcm_token: string | null
  last_active_at: string
  created_at: string
}

// Alert status
export type AlertStatus = 'active' | 'dismissed' | 'expired'

// Alert for device-to-device messaging
export interface Alert {
  id: string
  from_device_id: string | null
  to_device_id: string | null  // null = broadcast to all
  message: string
  status: AlertStatus
  created_at: string
  expires_at: string
  dismissed_at: string | null
  dismissed_by_device_id: string | null
  // Joined fields
  from_device?: Device
}
