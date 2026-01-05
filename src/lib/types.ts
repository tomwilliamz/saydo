export type ActivityType = 'Home' | 'Brain' | 'Body' | 'Downtime'

export type CompletionStatus = 'started' | 'stopped' | 'done' | 'skipped'

// ============================================
// User & Family Types
// ============================================

export interface User {
  id: string
  email: string
  display_name: string
  avatar_url: string | null
  cycle_weeks: number // 1-4
  cycle_start_date: string // YYYY-MM-DD
  is_superadmin: boolean
  created_at: string
}

export interface Family {
  id: string
  name: string
  invite_code: string
  created_at: string
}

export interface FamilyMember {
  family_id: string
  user_id: string
  joined_at: string
  // Joined fields
  user?: User
}

export interface FamilyWithMembers extends Family {
  members: (FamilyMember & { user: User })[]
}

// ============================================
// Activity Types
// ============================================

export interface Activity {
  id: string
  name: string
  type: ActivityType
  default_minutes: number
  description: string | null
  user_id: string | null // NULL for family activities
  family_id: string | null // NULL for personal activities
  is_active: boolean
  created_at: string
  // Computed/joined
  owner_type?: 'personal' | 'family'
}

export interface Schedule {
  id: string
  activity_id: string
  user_id: string
  day_of_week: number // 0=Monday, 6=Sunday
  week_of_cycle: number // 1, 2, 3, or 4
}

export interface Completion {
  id: string
  activity_id: string
  user_id: string
  date: string // YYYY-MM-DD
  status: CompletionStatus
  label: string | null // Optional override label (e.g., "Squash" instead of "Exercise")
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

// ============================================
// Combined/View Types
// ============================================

// Combined type for daily view
export interface DailyTask {
  activity: Activity
  user: User
  completion: Completion | null
}

// User stats for leaderboard
export interface UserStats {
  user: User
  done: number
  total: number
  ratio: number
}

// Long Term Task status
export type LongTermTaskStatus = 'active' | 'completed'

// Long Term Task
export interface LongTermTask {
  id: string
  user_id: string
  title: string
  category: ActivityType
  due_date: string | null // YYYY-MM-DD format
  default_estimate_minutes: number | null
  total_time_spent_minutes: number
  elapsed_ms: number // Accumulated time in milliseconds (for pause/resume)
  status: LongTermTaskStatus
  created_at: string
  completed_at: string | null
  current_session_started_at: string | null
  // Joined
  user?: User
}

// ============================================
// Device & Alert Types (unchanged)
// ============================================

export interface Device {
  id: string
  name: string
  fcm_token: string | null
  last_active_at: string
  created_at: string
}

export type AlertStatus = 'active' | 'dismissed' | 'expired'

export interface Alert {
  id: string
  from_device_id: string | null
  to_device_id: string | null
  message: string
  status: AlertStatus
  created_at: string
  expires_at: string
  dismissed_at: string | null
  dismissed_by_device_id: string | null
  from_device?: Device
}

// ============================================
// Constants
// ============================================

// Type emoji mapping
export const TYPE_EMOJI: Record<ActivityType, string> = {
  Home: '🏠',
  Brain: '🧠',
  Body: '💪',
  Downtime: '🎮',
}

// Activity type colors (Tailwind classes)
export const TYPE_COLORS: Record<ActivityType, string> = {
  Home: 'bg-purple-100',
  Brain: 'bg-yellow-100',
  Body: 'bg-red-100',
  Downtime: 'bg-teal-100',
}

// Default user colors (for users without custom colors)
export const DEFAULT_USER_COLORS = [
  { bg: 'bg-blue-500', text: 'text-blue-700', border: 'border-blue-500', gradient: 'from-blue-500 to-blue-700' },
  { bg: 'bg-green-500', text: 'text-green-700', border: 'border-green-500', gradient: 'from-green-500 to-green-700' },
  { bg: 'bg-orange-500', text: 'text-orange-700', border: 'border-orange-500', gradient: 'from-orange-500 to-orange-700' },
  { bg: 'bg-purple-500', text: 'text-purple-700', border: 'border-purple-500', gradient: 'from-purple-500 to-purple-700' },
  { bg: 'bg-pink-500', text: 'text-pink-700', border: 'border-pink-500', gradient: 'from-pink-500 to-pink-700' },
  { bg: 'bg-cyan-500', text: 'text-cyan-700', border: 'border-cyan-500', gradient: 'from-cyan-500 to-cyan-700' },
]

// Get color for user based on index (consistent across app)
export function getUserColor(index: number) {
  return DEFAULT_USER_COLORS[index % DEFAULT_USER_COLORS.length]
}

// ============================================
// Legacy Types (deprecated, for migration only)
// ============================================

/** @deprecated Use User instead */
export type Person = 'Thomas' | 'Ivor' | 'Axel'

/** @deprecated Use User instead */
export type PersonOrEveryone = Person | 'Everyone'

/** @deprecated Use UserStats instead */
export interface PersonStats {
  person: Person
  done: number
  total: number
  ratio: number
}

/** @deprecated Will be removed */
export const PERSON_COLORS: Record<Person, { bg: string; text: string; border: string }> = {
  Thomas: { bg: 'bg-blue-500', text: 'text-blue-700', border: 'border-blue-500' },
  Ivor: { bg: 'bg-green-500', text: 'text-green-700', border: 'border-green-500' },
  Axel: { bg: 'bg-orange-500', text: 'text-orange-700', border: 'border-orange-500' },
}

/** @deprecated Will be removed */
export const ALL_PERSONS: Person[] = ['Thomas', 'Ivor', 'Axel']

/** @deprecated Will be removed */
export const PERSON_AVATARS: Record<Person, string> = {
  Thomas: '/avatar/tom.jpg',
  Ivor: '/avatar/ivor.jpg',
  Axel: '/avatar/axel.jpg',
}
