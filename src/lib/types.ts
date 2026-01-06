export type ActivityType = 'Home' | 'Brain' | 'Body' | 'Downtime'

export type CompletionStatus = 'started' | 'stopped' | 'done' | 'skipped'

// Repeat pattern for activities
// null = manual (no auto-scheduling)
// 'daily' = every day (Mon-Sun)
// 'weekdays' = Mon-Fri
// 'weekends' = Sat-Sun
// '0,2,4' = specific days (comma-separated indices where 0=Mon, 6=Sun)
export type RepeatPattern = 'daily' | 'weekdays' | 'weekends' | string | null

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
  rota_cycle_weeks: number
  week_nicknames: Record<string, string> // e.g. {"1": "Rabbit", "2": "Fox"}
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
  is_rota: boolean // true = rotating family chore, false = personal activity
  repeat_pattern: RepeatPattern // null = manual, 'daily', 'weekdays', 'weekends', or '0,2,4' for specific days
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
  isDeferred?: boolean
  isAdHoc?: boolean
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
  { bg: 'bg-blue-500', text: 'text-blue-700', border: 'border-blue-500', gradient: 'from-blue-500 to-blue-700', rgb: '59, 130, 246' },
  { bg: 'bg-green-500', text: 'text-green-700', border: 'border-green-500', gradient: 'from-green-500 to-green-700', rgb: '34, 197, 94' },
  { bg: 'bg-orange-500', text: 'text-orange-700', border: 'border-orange-500', gradient: 'from-orange-500 to-orange-700', rgb: '249, 115, 22' },
  { bg: 'bg-purple-500', text: 'text-purple-700', border: 'border-purple-500', gradient: 'from-purple-500 to-purple-700', rgb: '168, 85, 247' },
  { bg: 'bg-pink-500', text: 'text-pink-700', border: 'border-pink-500', gradient: 'from-pink-500 to-pink-700', rgb: '236, 72, 153' },
  { bg: 'bg-cyan-500', text: 'text-cyan-700', border: 'border-cyan-500', gradient: 'from-cyan-500 to-cyan-700', rgb: '6, 182, 212' },
]

// Get color for user based on index (consistent across app)
export function getUserColor(index: number) {
  return DEFAULT_USER_COLORS[index % DEFAULT_USER_COLORS.length]
}

// Get stable color index from user ID (consistent across the app)
export function getUserColorIndex(userId: string): number {
  return parseInt(userId.substring(0, 8), 16) % DEFAULT_USER_COLORS.length
}

// Get color for user by their ID (preferred - ensures consistency)
export function getUserColorById(userId: string) {
  const index = getUserColorIndex(userId)
  return DEFAULT_USER_COLORS[index]
}

// Convert repeat pattern to array of day indices (0=Mon, 6=Sun)
export function getRepeatDays(pattern: RepeatPattern): number[] {
  if (!pattern) return []
  if (pattern === 'daily') return [0, 1, 2, 3, 4, 5, 6]
  if (pattern === 'weekdays') return [0, 1, 2, 3, 4]
  if (pattern === 'weekends') return [5, 6]
  // Custom pattern like '0,2,4' for Mon/Wed/Fri
  return pattern.split(',').map((d) => parseInt(d.trim(), 10)).filter((d) => !isNaN(d) && d >= 0 && d <= 6)
}

// Convert day indices to repeat pattern string
export function daysToRepeatPattern(days: number[]): RepeatPattern {
  if (days.length === 0) return null
  const sorted = [...days].sort((a, b) => a - b)
  if (sorted.length === 7) return 'daily'
  if (sorted.length === 5 && sorted.join(',') === '0,1,2,3,4') return 'weekdays'
  if (sorted.length === 2 && sorted.join(',') === '5,6') return 'weekends'
  return sorted.join(',')
}

// Labels for repeat patterns
export const REPEAT_PATTERN_LABELS: Record<string, string> = {
  '': 'Manual',
  'daily': 'Daily',
  'weekdays': 'Weekdays',
  'weekends': 'Weekends',
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
