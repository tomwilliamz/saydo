import { format, parseISO, differenceInDays, addDays, subDays, getDay, startOfMonth, endOfMonth, eachDayOfInterval } from 'date-fns'

/**
 * Calculate the week of cycle for a given date
 * @param targetDate - The date to calculate for
 * @param cycleStartDate - When the cycle started
 * @param cycleWeeks - How many weeks in the cycle (1-4, default 4)
 */
export function getWeekOfCycle(targetDate: Date, cycleStartDate: Date, cycleWeeks: number = 4): number {
  const daysSinceStart = differenceInDays(targetDate, cycleStartDate)
  const weekNumber = Math.floor(daysSinceStart / 7) % cycleWeeks
  // Handle negative weeks for dates before cycle start
  return weekNumber >= 0 ? weekNumber + 1 : (cycleWeeks + weekNumber + 1)
}

/**
 * Get day of week (0=Monday, 6=Sunday)
 * JavaScript's getDay() returns 0=Sunday, so we convert
 */
export function getDayOfWeek(date: Date): number {
  const jsDay = getDay(date) // 0=Sunday, 1=Monday, etc.
  // Convert to 0=Monday, 6=Sunday
  return jsDay === 0 ? 6 : jsDay - 1
}

/**
 * Format date as YYYY-MM-DD for database queries
 */
export function formatDateForDB(date: Date): string {
  return format(date, 'yyyy-MM-dd')
}

/**
 * Format date for display (e.g., "Mon, Jan 6")
 */
export function formatDateForDisplay(date: Date): string {
  return format(date, 'EEE, MMM d')
}

/**
 * Format date for full display (e.g., "Monday, January 6, 2025")
 */
export function formatDateFull(date: Date): string {
  return format(date, 'EEEE, MMMM d, yyyy')
}

/**
 * Get tomorrow's date
 */
export function getTomorrow(date: Date): Date {
  return addDays(date, 1)
}

/**
 * Get yesterday's date
 */
export function getYesterday(date: Date): Date {
  return subDays(date, 1)
}

/**
 * Check if a date is today
 */
export function isToday(date: Date): boolean {
  return formatDateForDB(date) === formatDateForDB(new Date())
}

/**
 * Check if a date is in the past
 */
export function isPast(date: Date): boolean {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  date.setHours(0, 0, 0, 0)
  return date < today
}

/**
 * Parse a YYYY-MM-DD string to a Date
 */
export function parseDate(dateString: string): Date {
  return parseISO(dateString)
}

/**
 * Format month for leaderboard (e.g., "January 2025")
 */
export function formatMonth(date: Date): string {
  return format(date, 'MMMM yyyy')
}

/**
 * Get current month in YYYY-MM format
 */
export function getCurrentMonth(): string {
  return format(new Date(), 'yyyy-MM')
}

/**
 * Get all dates in a given month
 */
export function getDatesInMonth(yearMonth: string): Date[] {
  const [year, month] = yearMonth.split('-').map(Number)
  const start = startOfMonth(new Date(year, month - 1))
  const end = endOfMonth(new Date(year, month - 1))
  return eachDayOfInterval({ start, end })
}

/**
 * Calculate duration in minutes between two timestamps
 */
export function calculateDurationMinutes(startedAt: string, completedAt: string): number {
  const start = parseISO(startedAt)
  const end = parseISO(completedAt)
  return Math.round((end.getTime() - start.getTime()) / (1000 * 60))
}

/**
 * Format timer display (mm:ss)
 */
export function formatTimer(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

/**
 * Day names for schedule grid
 */
export const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

/**
 * Person abbreviations for schedule grid
 */
export const PERSON_ABBREV: Record<string, string> = {
  Thomas: 'T',
  Ivor: 'I',
  Axel: 'A',
  Everyone: 'E',
}
