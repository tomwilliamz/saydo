'use client'

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { Activity, User, ActivityType, TYPE_EMOJI, getUserColor, RepeatPattern, getRepeatDays } from '@/lib/types'

interface ScheduleEntry {
  id: string
  activity_id: string
  user_id: string | null
  day_of_week: number
  week_of_cycle: number
  activity?: Activity
  user?: Pick<User, 'id' | 'display_name' | 'avatar_url' | 'cycle_weeks'>
}

interface FamilyMember {
  user_id: string
  user: User
}

interface Props {
  currentUser: User
  familyId: string
  members: FamilyMember[]
  rotaCycleWeeks: number
  weekNicknames: Record<string, string>
  onUpdateWeekNicknames?: (nicknames: Record<string, string>) => void
}

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const ACTIVITY_TYPES: ActivityType[] = ['Home', 'Brain', 'Body', 'Downtime']

// Rotation symbols: member initials + Everyone + Skip
// We'll use single-letter initials from member display names + 'E' for everyone + '-' for skip

export default function ScheduleGrid({ currentUser, familyId, members, rotaCycleWeeks: rotaCycleWeeksProp, weekNicknames, onUpdateWeekNicknames }: Props) {
  // Default to 4 weeks if not set
  const rotaCycleWeeks = rotaCycleWeeksProp || 4

  // Week nickname editing
  const [editingWeek, setEditingWeek] = useState<number | null>(null)
  const [editingNickname, setEditingNickname] = useState('')
  const [activities, setActivities] = useState<Activity[]>([])
  const [schedules, setSchedules] = useState<ScheduleEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('')

  // Activity library
  const [showCreateActivityModal, setShowCreateActivityModal] = useState(false)
  const [newActivityName, setNewActivityName] = useState('')
  const [newActivityType, setNewActivityType] = useState<ActivityType>('Home')
  const [newActivityDuration, setNewActivityDuration] = useState(30)
  const [newActivityRepeat, setNewActivityRepeat] = useState<RepeatPattern>(null)
  const [newActivityIsRota, setNewActivityIsRota] = useState(false)
  const [creating, setCreating] = useState(false)

  // Edit activity modal
  const [editingActivity, setEditingActivity] = useState<Activity | null>(null)
  const [editActivityName, setEditActivityName] = useState('')
  const [editActivityType, setEditActivityType] = useState<ActivityType>('Home')
  const [editActivityDuration, setEditActivityDuration] = useState(30)
  const [editActivityRepeat, setEditActivityRepeat] = useState<RepeatPattern>(null)
  const [editActivityIsRota, setEditActivityIsRota] = useState(false)
  const [saving, setSaving] = useState(false)

  // Group edit modal
  const [showGroupEditModal, setShowGroupEditModal] = useState(false)
  const [selectedActivities, setSelectedActivities] = useState<Set<string>>(new Set())
  const [selectedMembers, setSelectedMembers] = useState<Set<string>>(new Set())
  const [groupEditSaving, setGroupEditSaving] = useState(false)

  // Clone week 1
  const [cloningWeek1, setCloningWeek1] = useState(false)

  // Keyboard navigation for rota cells
  const [hoveredCell, setHoveredCell] = useState<{
    activityId: string
    dayOfWeek: number
    weekOfCycle: number
  } | null>(null)

  // Drag and drop for reordering rows
  const [draggedItem, setDraggedItem] = useState<{ type: 'rota' | 'personal'; activityId: string; userId?: string } | null>(null)
  const [dragOverItem, setDragOverItem] = useState<{ type: 'rota' | 'personal'; activityId: string; userId?: string } | null>(null)
  const [rotaOrder, setRotaOrder] = useState<string[]>([])
  const [personalOrder, setPersonalOrder] = useState<Record<string, string[]>>({})

  // Track pending updates to prevent race conditions
  const pendingUpdates = useRef<Map<string, number>>(new Map())

  // Activity picker for adding to schedule (userId can be null for Family swimlane)
  const [showActivityPicker, setShowActivityPicker] = useState<{
    userId: string | null
    userName: string
  } | null>(null)
  const [pickerSearch, setPickerSearch] = useState('')

  // Rota uses family setting, Personal is always 1 week
  const PERSONAL_CYCLE_WEEKS = 1

  // Generate rotation options: member initials + 'E' for Everyone + '-' for Skip
  const rotationOptions = useMemo(() => {
    const options: { id: string | null; label: string; color: string }[] = []
    members.forEach((m, idx) => {
      const color = getUserColor(idx)
      options.push({
        id: m.user_id,
        label: m.user.display_name[0].toUpperCase(),
        color: color.bg,
      })
    })
    // Add "Everyone" option (null id but special marker 'everyone')
    options.push({ id: 'everyone', label: 'E', color: 'bg-purple-500' })
    // Add "Skip" option (no one assigned)
    options.push({ id: null, label: '-', color: 'bg-gray-600' })
    return options
  }, [members])

  // Get rota activities (is_rota = true), sorted by custom order
  const rotaActivities = useMemo(() => {
    const lowerFilter = filter.toLowerCase()
    const filtered = activities.filter((a) => {
      if (!a.is_rota) return false
      if (filter && !a.name.toLowerCase().includes(lowerFilter)) return false
      return true
    })

    // Sort by custom order if available
    if (rotaOrder.length > 0) {
      return filtered.sort((a, b) => {
        const aIdx = rotaOrder.indexOf(a.id)
        const bIdx = rotaOrder.indexOf(b.id)
        // Items not in order go to the end
        if (aIdx === -1 && bIdx === -1) return 0
        if (aIdx === -1) return 1
        if (bIdx === -1) return -1
        return aIdx - bIdx
      })
    }
    return filtered
  }, [activities, filter, rotaOrder])

  // Get personal activities (is_rota = false) that are scheduled for a user
  const getPersonalScheduledActivities = (userId: string) => {
    const activityIds = new Set(
      schedules
        .filter((s) => s.user_id === userId)
        .map((s) => s.activity_id)
    )
    const lowerFilter = filter.toLowerCase()
    return activities.filter((a) => {
      if (a.is_rota) return false // Exclude rota activities
      if (!activityIds.has(a.id)) return false
      if (filter && !a.name.toLowerCase().includes(lowerFilter)) return false
      return true
    })
  }

  // Get assignment for a rota activity on a specific day/week
  // Returns user_id, 'everyone', or null (skip)
  const getRotaAssignment = (activityId: string, dayOfWeek: number, weekOfCycle: number): string | null => {
    // Check if there's an 'everyone' entry (user_id = null for rota activities means everyone)
    const everyoneEntry = schedules.find(
      (s) =>
        s.activity_id === activityId &&
        s.user_id === null &&
        s.day_of_week === dayOfWeek &&
        s.week_of_cycle === weekOfCycle
    )
    if (everyoneEntry) return 'everyone'

    // Check for specific user assignment
    const userEntry = schedules.find(
      (s) =>
        s.activity_id === activityId &&
        s.user_id !== null &&
        s.day_of_week === dayOfWeek &&
        s.week_of_cycle === weekOfCycle
    )
    if (userEntry) return userEntry.user_id

    return null // Skip (no assignment)
  }

  // Set a rota assignment to a specific value (used by both click cycling and keyboard)
  const setRotaAssignment = useCallback(async (
    activityId: string,
    dayOfWeek: number,
    weekOfCycle: number,
    targetUserId: string | null | 'skip' // null = everyone, 'skip' = no assignment, string = user id
  ) => {
    // Create a unique key for this cell
    const cellKey = `${activityId}-${dayOfWeek}-${weekOfCycle}`
    const updateTime = Date.now()
    pendingUpdates.current.set(cellKey, updateTime)

    // Optimistic update for immediate feedback
    setSchedules((prev) => {
      const filtered = prev.filter(
        (s) =>
          !(
            s.activity_id === activityId &&
            s.day_of_week === dayOfWeek &&
            s.week_of_cycle === weekOfCycle
          )
      )
      if (targetUserId !== 'skip') {
        return [
          ...filtered,
          {
            id: `pending-${cellKey}`,
            activity_id: activityId,
            user_id: targetUserId,
            day_of_week: dayOfWeek,
            week_of_cycle: weekOfCycle,
          },
        ]
      }
      return filtered
    })

    // Update server
    try {
      const res = await fetch('/api/schedule/set', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          activity_id: activityId,
          day_of_week: dayOfWeek,
          week_of_cycle: weekOfCycle,
          user_id: targetUserId === 'skip' ? undefined : targetUserId,
        }),
      })

      // Check if this update is still the latest for this cell
      if (pendingUpdates.current.get(cellKey) !== updateTime) {
        return // A newer update supersedes this one
      }

      if (!res.ok) {
        console.error('Failed to set rota assignment:', await res.text())
        pendingUpdates.current.delete(cellKey)
        fetchData() // Refetch to get correct state
        return
      }

      const data = await res.json()

      // Replace optimistic update with real server data
      setSchedules((prev) => {
        const filtered = prev.filter(
          (s) =>
            !(
              s.activity_id === activityId &&
              s.day_of_week === dayOfWeek &&
              s.week_of_cycle === weekOfCycle
            )
        )
        if (data.schedule) {
          return [...filtered, data.schedule]
        }
        return filtered
      })

      pendingUpdates.current.delete(cellKey)
    } catch (err) {
      console.error('Failed to set rota assignment:', err)
      pendingUpdates.current.delete(cellKey)
      fetchData()
    }
  }, [])

  // Cycle through rotation options for a rota activity
  const cycleRotaAssignment = (activityId: string, dayOfWeek: number, weekOfCycle: number) => {
    const currentAssignment = getRotaAssignment(activityId, dayOfWeek, weekOfCycle)

    // Find current index in rotation options
    let currentIdx = rotationOptions.findIndex((opt) => {
      if (currentAssignment === 'everyone') return opt.id === 'everyone'
      if (currentAssignment === null) return opt.id === null && opt.label === '-'
      return opt.id === currentAssignment
    })

    // Get next option (cycle)
    const nextIdx = (currentIdx + 1) % rotationOptions.length
    const nextOption = rotationOptions[nextIdx]

    // Convert to the format setRotaAssignment expects
    let targetUserId: string | null | 'skip'
    if (nextOption.id === 'everyone') {
      targetUserId = null // null means everyone
    } else if (nextOption.id === null) {
      targetUserId = 'skip' // skip/clear
    } else {
      targetUserId = nextOption.id
    }

    setRotaAssignment(activityId, dayOfWeek, weekOfCycle, targetUserId)
  }

  // Keyboard handler for rota cells
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!hoveredCell) return

      // Ignore if typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return

      const key = e.key.toUpperCase()

      // Arrow key navigation
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight' || e.key === 'ArrowUp' || e.key === 'ArrowDown') {
        e.preventDefault()

        const currentActivityIdx = rotaActivities.findIndex(a => a.id === hoveredCell.activityId)
        if (currentActivityIdx === -1) return

        let newActivityIdx = currentActivityIdx
        let newDayOfWeek = hoveredCell.dayOfWeek
        let newWeekOfCycle = hoveredCell.weekOfCycle

        if (e.key === 'ArrowLeft') {
          newDayOfWeek--
          if (newDayOfWeek < 0) {
            newDayOfWeek = 6
            newWeekOfCycle--
            if (newWeekOfCycle < 1) {
              newWeekOfCycle = rotaCycleWeeks
            }
          }
        } else if (e.key === 'ArrowRight') {
          newDayOfWeek++
          if (newDayOfWeek > 6) {
            newDayOfWeek = 0
            newWeekOfCycle++
            if (newWeekOfCycle > rotaCycleWeeks) {
              newWeekOfCycle = 1
            }
          }
        } else if (e.key === 'ArrowUp') {
          newActivityIdx--
          if (newActivityIdx < 0) {
            newActivityIdx = rotaActivities.length - 1
          }
        } else if (e.key === 'ArrowDown') {
          newActivityIdx++
          if (newActivityIdx >= rotaActivities.length) {
            newActivityIdx = 0
          }
        }

        const newActivity = rotaActivities[newActivityIdx]
        if (newActivity) {
          setHoveredCell({
            activityId: newActivity.id,
            dayOfWeek: newDayOfWeek,
            weekOfCycle: newWeekOfCycle,
          })
        }
        return
      }

      // Check for member initials
      const member = members.find(
        (m) => m.user.display_name[0].toUpperCase() === key
      )
      if (member) {
        setRotaAssignment(hoveredCell.activityId, hoveredCell.dayOfWeek, hoveredCell.weekOfCycle, member.user_id)
        return
      }

      // E for Everyone
      if (key === 'E') {
        setRotaAssignment(hoveredCell.activityId, hoveredCell.dayOfWeek, hoveredCell.weekOfCycle, null)
        return
      }

      // - or Backspace or Delete for Skip
      if (key === '-' || e.key === 'Backspace' || e.key === 'Delete') {
        setRotaAssignment(hoveredCell.activityId, hoveredCell.dayOfWeek, hoveredCell.weekOfCycle, 'skip')
        return
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [hoveredCell, members, setRotaAssignment, rotaActivities, rotaCycleWeeks])

  // Fetch activities and schedules
  useEffect(() => {
    fetchData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [familyId])

  const fetchData = async () => {
    setLoading(true)
    try {
      const [activitiesRes, schedulesRes] = await Promise.all([
        fetch(`/api/activities?family_id=${familyId}&family_members=true`),
        fetch(`/api/schedule?family_id=${familyId}`),
      ])

      const activitiesData = await activitiesRes.json()
      const schedulesData = await schedulesRes.json()

      setActivities(Array.isArray(activitiesData) ? activitiesData : [])

      // Merge server data with pending updates
      // Pending updates take precedence over server data
      const serverSchedules = Array.isArray(schedulesData) ? schedulesData : []
      setSchedules((prev) => {
        // Get all pending entries (those with id starting with 'pending-')
        const pendingEntries = prev.filter((s) => s.id.startsWith('pending-'))

        if (pendingEntries.length === 0) {
          return serverSchedules
        }

        // Filter out server entries that conflict with pending entries
        const filteredServer = serverSchedules.filter((serverEntry: ScheduleEntry) => {
          return !pendingEntries.some(
            (pending) =>
              pending.activity_id === serverEntry.activity_id &&
              pending.day_of_week === serverEntry.day_of_week &&
              pending.week_of_cycle === serverEntry.week_of_cycle
          )
        })

        return [...filteredServer, ...pendingEntries]
      })
    } catch (err) {
      console.error('Failed to fetch schedule data:', err)
    } finally {
      setLoading(false)
    }
  }

  // Group activities by type for the library
  const activitiesByType = useMemo(() => {
    const grouped: Record<ActivityType, Activity[]> = {
      Home: [],
      Brain: [],
      Body: [],
      Downtime: [],
    }

    const lowerFilter = filter.toLowerCase()
    activities.forEach((a) => {
      if (!filter || a.name.toLowerCase().includes(lowerFilter)) {
        grouped[a.type].push(a)
      }
    })

    return grouped
  }, [activities, filter])

  // Get activities that a user has scheduled (at least one schedule entry)
  // Excludes rota activities (those go in the Family Chores section)
  // Also filters by the current filter text, sorted by custom order
  const getUserScheduledActivities = (userId: string) => {
    const activityIds = new Set(
      schedules
        .filter((s) => s.user_id === userId)
        .map((s) => s.activity_id)
    )
    const lowerFilter = filter.toLowerCase()
    const filtered = activities.filter((a) => {
      if (a.is_rota) return false // Exclude rota activities
      if (!activityIds.has(a.id)) return false
      if (filter && !a.name.toLowerCase().includes(lowerFilter)) return false
      return true
    })

    // Sort by custom order if available
    const userOrder = personalOrder[userId]
    if (userOrder && userOrder.length > 0) {
      return filtered.sort((a, b) => {
        const aIdx = userOrder.indexOf(a.id)
        const bIdx = userOrder.indexOf(b.id)
        if (aIdx === -1 && bIdx === -1) return 0
        if (aIdx === -1) return 1
        if (bIdx === -1) return -1
        return aIdx - bIdx
      })
    }
    return filtered
  }

  // Get activities scheduled for family (user_id = null) - any activity can be in family swimlane
  // Also filters by the current filter text
  const getFamilyScheduledActivities = () => {
    const activityIds = new Set(
      schedules
        .filter((s) => s.user_id === null)
        .map((s) => s.activity_id)
    )
    const lowerFilter = filter.toLowerCase()
    return activities.filter((a) => {
      if (!activityIds.has(a.id)) return false
      if (filter && !a.name.toLowerCase().includes(lowerFilter)) return false
      return true
    })
  }

  // Check if a schedule entry exists (ignores placeholder entries with day_of_week = -1)
  const isScheduled = (activityId: string, userId: string | null, dayOfWeek: number, weekOfCycle: number) => {
    return schedules.some(
      (s) =>
        s.activity_id === activityId &&
        s.user_id === userId &&
        s.day_of_week === dayOfWeek &&
        s.week_of_cycle === weekOfCycle &&
        s.day_of_week !== -1 // Ignore placeholder entries
    )
  }

  // Toggle schedule entry
  const toggleSchedule = async (activityId: string, userId: string | null, dayOfWeek: number, weekOfCycle: number) => {
    const wasScheduled = isScheduled(activityId, userId, dayOfWeek, weekOfCycle)

    try {
      const res = await fetch('/api/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          activity_id: activityId,
          user_id: userId,
          day_of_week: dayOfWeek,
          week_of_cycle: weekOfCycle,
        }),
      })

      if (res.ok) {
        if (wasScheduled) {
          // Removing a checkbox - check if this is the last one
          const remainingEntries = schedules.filter(
            (s) =>
              s.activity_id === activityId &&
              s.user_id === userId &&
              s.day_of_week !== -1 && // Exclude placeholder
              !(s.day_of_week === dayOfWeek && s.week_of_cycle === weekOfCycle) // Exclude the one we're removing
          )

          const hasPlaceholder = schedules.some(
            (s) => s.activity_id === activityId && s.user_id === userId && s.day_of_week === -1
          )

          if (remainingEntries.length === 0 && !hasPlaceholder) {
            // This was the last checkbox and no placeholder exists - add one
            await fetch('/api/schedule', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                activity_id: activityId,
                user_id: userId,
                day_of_week: -1,
                week_of_cycle: 0,
              }),
            })
          }

          // Remove the toggled entry from local state
          setSchedules((prev) =>
            prev.filter(
              (s) =>
                !(
                  s.activity_id === activityId &&
                  s.user_id === userId &&
                  s.day_of_week === dayOfWeek &&
                  s.week_of_cycle === weekOfCycle
                )
            )
          )

          // If we added a placeholder, refetch to get it
          if (remainingEntries.length === 0 && !hasPlaceholder) {
            fetchData()
          }
        } else {
          // Adding a checkbox
          const data = await res.json()
          if (data.schedule) {
            setSchedules((prev) => [...prev, data.schedule])
          } else {
            fetchData()
          }
        }
      }
    } catch (err) {
      console.error('Failed to toggle schedule:', err)
    }
  }

  // Add activity to user's schedule (creates first schedule entry)
  // userId can be null for Family swimlane
  const addActivityToUser = async (activityId: string, userId: string | null) => {
    // Add to Monday Week 1 as default
    try {
      const res = await fetch('/api/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          activity_id: activityId,
          user_id: userId,
          day_of_week: 0,
          week_of_cycle: 1,
        }),
      })

      const data = await res.json()

      if (res.ok && data.schedule) {
        // Add the new schedule entry to local state immediately
        setSchedules((prev) => [...prev, data.schedule])
      } else if (!res.ok) {
        console.error('Failed to add activity:', data.error)
      }
    } catch (err) {
      console.error('Failed to add activity to schedule:', err)
    }
    setShowActivityPicker(null)
    setPickerSearch('')
  }

  // Remove all schedule entries for an activity+user combo (userId can be null for Family)
  const removeActivityFromUser = async (activityId: string, userId: string | null) => {
    const entriesToRemove = schedules.filter(
      (s) => s.activity_id === activityId && s.user_id === userId
    )

    for (const entry of entriesToRemove) {
      await toggleSchedule(entry.activity_id, entry.user_id, entry.day_of_week, entry.week_of_cycle)
    }
  }

  // Handle create activity
  const handleCreateActivity = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newActivityName.trim()) return

    setCreating(true)
    try {
      // Rota activities belong to family, personal activities to user
      const activityData = newActivityIsRota
        ? {
            name: newActivityName.trim(),
            type: newActivityType,
            default_minutes: newActivityDuration,
            repeat_pattern: newActivityRepeat,
            is_rota: true,
            family_id: familyId,
          }
        : {
            name: newActivityName.trim(),
            type: newActivityType,
            default_minutes: newActivityDuration,
            repeat_pattern: newActivityRepeat,
            is_rota: false,
            user_id: currentUser.id,
          }

      await fetch('/api/activities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(activityData),
      })

      setShowCreateActivityModal(false)
      setNewActivityName('')
      setNewActivityType('Home')
      setNewActivityDuration(30)
      setNewActivityRepeat(null)
      setNewActivityIsRota(false)
      fetchData()
    } catch (err) {
      console.error('Failed to create activity:', err)
    } finally {
      setCreating(false)
    }
  }

  // Handle edit activity
  const handleEditActivity = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingActivity || !editActivityName.trim()) return

    setSaving(true)
    try {
      const res = await fetch(`/api/activities/${editingActivity.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editActivityName.trim(),
          type: editActivityType,
          default_minutes: editActivityDuration,
          repeat_pattern: editActivityRepeat,
          is_rota: editActivityIsRota,
        }),
      })

      if (res.ok) {
        setEditingActivity(null)
        fetchData()
      }
    } catch (err) {
      console.error('Failed to update activity:', err)
    } finally {
      setSaving(false)
    }
  }

  // Delete an activity and all its schedule entries
  const handleDeleteActivity = async () => {
    if (!editingActivity) return

    if (!confirm(`Delete "${editingActivity.name}"? This will remove it from all schedules.`)) {
      return
    }

    setSaving(true)
    try {
      const res = await fetch(`/api/activities/${editingActivity.id}`, {
        method: 'DELETE',
      })

      if (res.ok) {
        setEditingActivity(null)
        fetchData()
      }
    } catch (err) {
      console.error('Failed to delete activity:', err)
    } finally {
      setSaving(false)
    }
  }

  // Open edit modal for an activity
  const openEditModal = (activity: Activity) => {
    setEditingActivity(activity)
    setEditActivityName(activity.name)
    setEditActivityType(activity.type)
    setEditActivityDuration(activity.default_minutes)
    setEditActivityRepeat(activity.repeat_pattern)
    setEditActivityIsRota(activity.is_rota)
  }

  // Toggle activity selection in group edit
  const toggleActivitySelection = (activityId: string) => {
    setSelectedActivities((prev) => {
      const next = new Set(prev)
      if (next.has(activityId)) {
        next.delete(activityId)
      } else {
        next.add(activityId)
      }
      return next
    })
  }

  // Toggle member selection in group edit
  const toggleMemberSelection = (userId: string) => {
    setSelectedMembers((prev) => {
      const next = new Set(prev)
      if (next.has(userId)) {
        next.delete(userId)
      } else {
        next.add(userId)
      }
      return next
    })
  }

  // Handle group edit - add selected activities to selected members' swimlanes
  // Uses each activity's repeat_pattern to auto-populate checkboxes
  const handleGroupEdit = async () => {
    if (selectedActivities.size === 0 || selectedMembers.size === 0) return

    setGroupEditSaving(true)
    try {
      for (const activityId of selectedActivities) {
        const activity = activities.find((a) => a.id === activityId)
        if (!activity) continue

        const repeatDays = getRepeatDays(activity.repeat_pattern)

        for (const userId of selectedMembers) {
          // Check if already scheduled
          const alreadyHas = schedules.some(
            (s) => s.activity_id === activityId && s.user_id === userId
          )

          if (!alreadyHas) {
            if (repeatDays.length === 0) {
              // No repeat pattern - add placeholder entry
              await fetch('/api/schedule', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  activity_id: activityId,
                  user_id: userId,
                  day_of_week: -1,
                  week_of_cycle: 0,
                }),
              })
            } else {
              // Has repeat pattern - create schedule entries for each day
              // Personal schedules are always 1 week
              for (const day of repeatDays) {
                await fetch('/api/schedule', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    activity_id: activityId,
                    user_id: userId,
                    day_of_week: day,
                    week_of_cycle: PERSONAL_CYCLE_WEEKS,
                  }),
                })
              }
            }
          }
        }
      }

      setShowGroupEditModal(false)
      setSelectedActivities(new Set())
      setSelectedMembers(new Set())
      fetchData()
    } catch (err) {
      console.error('Failed to add activities to members:', err)
    } finally {
      setGroupEditSaving(false)
    }
  }

  // Clear all schedule entries (start over)
  const handleStartOver = async () => {
    if (!confirm('Clear all schedule entries? This will remove all checkboxes but keep activities in the library.')) {
      return
    }

    try {
      await fetch(`/api/schedule?family_id=${familyId}`, {
        method: 'DELETE',
      })

      fetchData()
    } catch (err) {
      console.error('Failed to clear schedule:', err)
    }
  }

  // Clone Week 1 to all other weeks in the cycle
  const handleCloneWeek1 = async () => {
    if (rotaCycleWeeks <= 1) {
      return
    }

    if (!confirm(`Clone Week 1 schedule to Weeks 2-${rotaCycleWeeks}? This will overwrite existing entries in those weeks.`)) {
      return
    }

    setCloningWeek1(true)
    try {
      // Get all Week 1 entries (both personal and rota)
      const week1Entries = schedules.filter(
        (s) => s.week_of_cycle === 1 && s.day_of_week >= 0
      )

      // First, delete all entries in weeks 2+
      const entriesToDelete = schedules.filter(
        (s) => s.week_of_cycle > 1 && s.day_of_week >= 0
      )

      for (const entry of entriesToDelete) {
        await fetch('/api/schedule', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            activity_id: entry.activity_id,
            user_id: entry.user_id,
            day_of_week: entry.day_of_week,
            week_of_cycle: entry.week_of_cycle,
          }),
        })
      }

      // Then, create new entries for weeks 2 through rotaCycleWeeks
      // Only clone rota entries (user_id = null), personal schedules are always 1 week
      for (let week = 2; week <= rotaCycleWeeks; week++) {
        for (const entry of week1Entries) {
          // Personal schedules are always 1 week, so skip entries with user_id
          if (entry.user_id) {
            continue
          }

          await fetch('/api/schedule', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              activity_id: entry.activity_id,
              user_id: entry.user_id,
              day_of_week: entry.day_of_week,
              week_of_cycle: week,
            }),
          })
        }
      }

      fetchData()
    } catch (err) {
      console.error('Failed to clone Week 1:', err)
    } finally {
      setCloningWeek1(false)
    }
  }

  // Drag and drop handlers
  const handleDragStart = (type: 'rota' | 'personal', activityId: string, userId?: string) => {
    setDraggedItem({ type, activityId, userId })
  }

  const handleDragOver = (e: React.DragEvent, type: 'rota' | 'personal', activityId: string, userId?: string) => {
    e.preventDefault()
    if (draggedItem?.type !== type) return
    if (type === 'personal' && draggedItem?.userId !== userId) return
    setDragOverItem({ type, activityId, userId })
  }

  const handleDragEnd = () => {
    if (!draggedItem || !dragOverItem) {
      setDraggedItem(null)
      setDragOverItem(null)
      return
    }

    if (draggedItem.type !== dragOverItem.type) {
      setDraggedItem(null)
      setDragOverItem(null)
      return
    }

    if (draggedItem.type === 'rota') {
      // Reorder rota activities
      const currentOrder = rotaOrder.length > 0 ? [...rotaOrder] : rotaActivities.map(a => a.id)
      const draggedIdx = currentOrder.indexOf(draggedItem.activityId)
      const targetIdx = currentOrder.indexOf(dragOverItem.activityId)

      if (draggedIdx !== -1 && targetIdx !== -1 && draggedIdx !== targetIdx) {
        currentOrder.splice(draggedIdx, 1)
        currentOrder.splice(targetIdx, 0, draggedItem.activityId)
        setRotaOrder(currentOrder)
      }
    } else if (draggedItem.type === 'personal' && draggedItem.userId) {
      // Reorder personal activities for this user
      const userId = draggedItem.userId
      const userActivities = getUserScheduledActivities(userId)
      const currentOrder = personalOrder[userId]?.length > 0
        ? [...personalOrder[userId]]
        : userActivities.map(a => a.id)

      const draggedIdx = currentOrder.indexOf(draggedItem.activityId)
      const targetIdx = currentOrder.indexOf(dragOverItem.activityId)

      if (draggedIdx !== -1 && targetIdx !== -1 && draggedIdx !== targetIdx) {
        currentOrder.splice(draggedIdx, 1)
        currentOrder.splice(targetIdx, 0, draggedItem.activityId)
        setPersonalOrder(prev => ({ ...prev, [userId]: currentOrder }))
      }
    }

    setDraggedItem(null)
    setDragOverItem(null)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-4 border-blue-500 border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Activity Library */}
      <div className="bg-gray-800/50 rounded-xl p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-white font-semibold">Activity Library</h3>
          <div className="flex items-center gap-3">
            <input
              type="text"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Filter activities..."
              className="bg-gray-700 border border-gray-600 rounded-lg px-3 py-1.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 w-48"
            />
            <button
              onClick={() => {
                setSelectedActivities(new Set())
                setSelectedMembers(new Set())
                setShowGroupEditModal(true)
              }}
              className="flex items-center gap-1 px-3 py-1.5 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors text-sm border border-gray-600"
            >
              <span>Group Edit</span>
            </button>
            <button
              onClick={() => setShowCreateActivityModal(true)}
              className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-500 transition-colors text-sm"
            >
              <span className="text-lg leading-none">+</span>
              <span>New Activity</span>
            </button>
          </div>
        </div>

        {/* Activity cards by type */}
        <div className="space-y-3">
          {ACTIVITY_TYPES.map((type) => {
            const typeActivities = activitiesByType[type]
            if (typeActivities.length === 0) return null

            return (
              <div key={type} className="flex items-start gap-2">
                <span className="text-lg w-6 flex-shrink-0 pt-1">{TYPE_EMOJI[type]}</span>
                <div className="flex flex-wrap gap-2">
                  {typeActivities.map((activity) => (
                    <button
                      key={activity.id}
                      onClick={() => openEditModal(activity)}
                      className="px-3 py-1.5 bg-gray-700 rounded-lg text-sm text-white cursor-pointer hover:bg-gray-600 transition-colors"
                      title="Click to edit"
                    >
                      {activity.name}
                    </button>
                  ))}
                </div>
              </div>
            )
          })}

          {activities.length === 0 && (
            <p className="text-gray-500 text-sm py-4 text-center">
              No activities yet. Create one to get started!
            </p>
          )}
        </div>
      </div>

      {/* Family Chores (Rota Activities) */}
      {rotaActivities.length > 0 && (
        <div className="bg-gray-800/50 rounded-xl p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-purple-500 flex items-center justify-center text-white text-sm">
                🔄
              </div>
              <h3 className="text-white font-semibold">Family Chores</h3>
              <span className="text-gray-500 text-xs">(rotating assignments)</span>
            </div>
            <div className="flex items-center gap-4">
              {rotaCycleWeeks > 1 && (
                <button
                  onClick={handleCloneWeek1}
                  disabled={cloningWeek1}
                  className="text-blue-400 hover:text-blue-300 text-sm transition-colors disabled:opacity-50"
                >
                  {cloningWeek1 ? 'Cloning...' : 'Clone Week 1 to All'}
                </button>
              )}
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <span>Legend:</span>
                {members.map((m, idx) => (
                  <span key={m.user_id} className={`${getUserColor(idx).bg} px-1.5 py-0.5 rounded text-white`}>
                    {m.user.display_name[0]}
                  </span>
                ))}
                <span className="bg-purple-500 px-1.5 py-0.5 rounded text-white">E</span>
                <span className="bg-gray-600 px-1.5 py-0.5 rounded text-white">-</span>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                {/* Week headers */}
                <tr className="border-b border-gray-700">
                  <th className="sticky left-0 bg-gray-800 z-20 px-3 py-2 text-left text-gray-400 text-sm min-w-[200px]">
                    Chore
                  </th>
                  {Array.from({ length: rotaCycleWeeks }, (_, weekIdx) => {
                    const weekNum = weekIdx + 1
                    const nickname = weekNicknames?.[String(weekNum)] || ''
                    const isEditing = editingWeek === weekNum

                    return (
                      <th
                        key={weekIdx}
                        colSpan={7}
                        className="px-1 py-2 text-center text-sm border-l border-gray-700"
                      >
                        {isEditing ? (
                          <input
                            type="text"
                            value={editingNickname}
                            onChange={(e) => setEditingNickname(e.target.value)}
                            onBlur={() => {
                              const newNicknames = { ...(weekNicknames || {}) }
                              if (editingNickname.trim()) {
                                newNicknames[String(weekNum)] = editingNickname.trim()
                              } else {
                                delete newNicknames[String(weekNum)]
                              }
                              onUpdateWeekNicknames?.(newNicknames)
                              setEditingWeek(null)
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.currentTarget.blur()
                              } else if (e.key === 'Escape') {
                                setEditingWeek(null)
                              }
                            }}
                            className="bg-gray-700 border border-gray-500 rounded px-2 py-0.5 text-white text-center w-24 focus:outline-none focus:border-blue-500"
                            autoFocus
                            placeholder={`Week ${weekNum}`}
                          />
                        ) : (
                          <button
                            onClick={() => {
                              setEditingWeek(weekNum)
                              setEditingNickname(nickname)
                            }}
                            className="text-gray-400 hover:text-white transition-colors"
                            title="Click to add nickname"
                          >
                            {nickname ? (
                              <span className="text-blue-400">{nickname}</span>
                            ) : (
                              `Week ${weekNum}`
                            )}
                          </button>
                        )}
                      </th>
                    )
                  })}
                </tr>
                {/* Day headers */}
                <tr className="border-b border-gray-700">
                  <th className="sticky left-0 bg-gray-800 z-20" />
                  {Array.from({ length: rotaCycleWeeks }, (_, weekIdx) =>
                    DAYS.map((day, dayIdx) => (
                      <th
                        key={`${weekIdx}-${dayIdx}`}
                        className={`px-1 py-1 text-center text-gray-500 text-xs min-w-[32px] ${dayIdx === 0 ? 'border-l-2 border-gray-600' : ''}`}
                      >
                        {day[0]}
                      </th>
                    ))
                  )}
                </tr>
              </thead>
              <tbody>
                {rotaActivities.map((activity) => {
                  const isDragging = draggedItem?.type === 'rota' && draggedItem?.activityId === activity.id
                  const isDragOver = dragOverItem?.type === 'rota' && dragOverItem?.activityId === activity.id

                  return (
                  <tr
                    key={activity.id}
                    draggable
                    onDragStart={() => handleDragStart('rota', activity.id)}
                    onDragOver={(e) => handleDragOver(e, 'rota', activity.id)}
                    onDragEnd={handleDragEnd}
                    className={`border-b border-gray-700/30 hover:bg-gray-800/30 group cursor-grab active:cursor-grabbing ${isDragging ? 'opacity-50' : ''} ${isDragOver ? 'bg-blue-900/30 border-blue-500' : ''}`}
                  >
                    <td className="sticky left-0 bg-gray-900 px-3 py-1.5 text-sm text-white whitespace-nowrap z-10">
                      <div className="flex items-center gap-2">
                        <span className="text-gray-500 cursor-grab">⋮⋮</span>
                        <span className="text-lg">{TYPE_EMOJI[activity.type]}</span>
                        <span>{activity.name}</span>
                      </div>
                    </td>
                    {Array.from({ length: rotaCycleWeeks }, (_, weekIdx) => {
                      const weekOfCycle = weekIdx + 1

                      return DAYS.map((_, dayIdx) => {
                        const assignment = getRotaAssignment(activity.id, dayIdx, weekOfCycle)

                        // Find display info for assignment
                        let bgColor = 'bg-gray-700'
                        let label = ''

                        if (assignment === 'everyone') {
                          bgColor = 'bg-purple-500'
                          label = 'E'
                        } else if (assignment === null) {
                          bgColor = 'bg-gray-700'
                          label = ''
                        } else {
                          // Find member
                          const memberIdx = members.findIndex((m) => m.user_id === assignment)
                          if (memberIdx >= 0) {
                            bgColor = getUserColor(memberIdx).bg
                            label = members[memberIdx].user.display_name[0]
                          }
                        }

                        const isHovered = hoveredCell?.activityId === activity.id &&
                          hoveredCell?.dayOfWeek === dayIdx &&
                          hoveredCell?.weekOfCycle === weekOfCycle

                        return (
                          <td key={`${weekIdx}-${dayIdx}`} className={`px-0.5 py-1 ${dayIdx === 0 ? 'border-l-2 border-gray-600' : ''}`}>
                            <button
                              onClick={() => cycleRotaAssignment(activity.id, dayIdx, weekOfCycle)}
                              onMouseEnter={() => setHoveredCell({ activityId: activity.id, dayOfWeek: dayIdx, weekOfCycle })}
                              onMouseLeave={() => setHoveredCell(null)}
                              className={`w-7 h-7 rounded ${bgColor} flex items-center justify-center text-white text-xs font-medium transition-all mx-auto hover:opacity-80 ${isHovered ? 'ring-2 ring-white/50' : ''}`}
                              title={`${DAYS[dayIdx]} W${weekOfCycle} - Click to cycle, or press key (${members.map(m => m.user.display_name[0].toUpperCase()).join('/')}/E/-)`}
                            >
                              {label}
                            </button>
                          </td>
                        )
                      })
                    })}
                  </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Personal Schedules - always 1 week */}
      <div className="bg-gray-800/50 rounded-xl p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-white font-semibold">Personal Schedules</h3>
          <button
            onClick={handleStartOver}
            className="text-red-500 hover:text-red-400 text-sm transition-colors"
          >
            Start Over
          </button>
        </div>

        {/* Grid - always 1 week for personal, but match Family Chores column structure */}
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              {/* Week headers - Week 1 active, rest empty */}
              <tr className="border-b border-gray-700">
                <th className="sticky left-0 bg-gray-800 z-20 px-3 py-2 text-left text-gray-400 text-sm min-w-[200px]">
                  Person / Activity
                </th>
                <th
                  colSpan={7}
                  className="px-1 py-2 text-center text-gray-400 text-sm border-l border-gray-700"
                >
                  Week 1
                </th>
                {Array.from({ length: rotaCycleWeeks - 1 }, (_, weekIdx) => (
                  <th
                    key={weekIdx + 1}
                    colSpan={7}
                    className="px-1 py-2 text-center text-gray-700 text-sm border-l border-gray-700"
                  >
                    {/* Empty weeks */}
                  </th>
                ))}
              </tr>
              {/* Day headers */}
              <tr className="border-b border-gray-700">
                <th className="sticky left-0 bg-gray-800 z-20" />
                {Array.from({ length: rotaCycleWeeks }, (_, weekIdx) =>
                  DAYS.map((day, dayIdx) => (
                    <th
                      key={`${weekIdx}-${dayIdx}`}
                      className={`px-1 py-1 text-center text-xs min-w-[32px] ${dayIdx === 0 ? 'border-l-2 border-gray-600' : ''} ${weekIdx === 0 ? 'text-gray-500' : 'text-gray-700'}`}
                    >
                      {weekIdx === 0 ? day[0] : ''}
                    </th>
                  ))
                )}
              </tr>
            </thead>
            <tbody>
              {/* Per-member swimlanes */}
              {members.map((member, memberIdx) => {
                const color = getUserColor(memberIdx)
                const userActivities = getUserScheduledActivities(member.user_id)

                return (
                  <React.Fragment key={member.user_id}>
                    {/* Member header row */}
                    <tr className="bg-gray-800/80">
                      <td
                        colSpan={1 + rotaCycleWeeks * 7}
                        className="sticky left-0 px-3 py-2 bg-gray-800/80"
                      >
                        <div className="flex items-center gap-2">
                          {member.user.avatar_url ? (
                            <img src={member.user.avatar_url} alt="" className="w-6 h-6 rounded-full" />
                          ) : (
                            <div className={`w-6 h-6 rounded-full ${color.bg} flex items-center justify-center text-white text-sm font-bold`}>
                              {member.user.display_name[0]}
                            </div>
                          )}
                          <span className={`font-semibold ${color.text}`}>
                            {member.user.display_name}
                          </span>
                        </div>
                      </td>
                    </tr>

                    {/* Activity rows for this member */}
                    {userActivities.map((activity) => {
                      const isDragging = draggedItem?.type === 'personal' && draggedItem?.activityId === activity.id && draggedItem?.userId === member.user_id
                      const isDragOver = dragOverItem?.type === 'personal' && dragOverItem?.activityId === activity.id && dragOverItem?.userId === member.user_id

                      return (
                      <tr
                        key={`${member.user_id}-${activity.id}`}
                        draggable
                        onDragStart={() => handleDragStart('personal', activity.id, member.user_id)}
                        onDragOver={(e) => handleDragOver(e, 'personal', activity.id, member.user_id)}
                        onDragEnd={handleDragEnd}
                        className={`border-b border-gray-700/30 hover:bg-gray-800/30 group cursor-grab active:cursor-grabbing ${isDragging ? 'opacity-50' : ''} ${isDragOver ? 'bg-blue-900/30 border-blue-500' : ''}`}
                      >
                        <td className="sticky left-0 bg-gray-900 px-3 py-1.5 text-sm text-white whitespace-nowrap z-10">
                          <div className="flex items-center gap-2 pl-4">
                            <span className="text-gray-500 cursor-grab">⋮⋮</span>
                            <span>{activity.name}</span>
                            <button
                              onClick={() => removeActivityFromUser(activity.id, member.user_id)}
                              className="text-gray-600 hover:text-red-400 transition-colors ml-1 opacity-0 group-hover:opacity-100"
                              title="Remove from schedule"
                            >
                              ×
                            </button>
                          </div>
                        </td>
                        {/* Week 1 - active */}
                        {DAYS.map((day, dayIdx) => {
                          const scheduled = isScheduled(activity.id, member.user_id, dayIdx, PERSONAL_CYCLE_WEEKS)

                          return (
                            <td key={dayIdx} className={`px-0.5 py-1 ${dayIdx === 0 ? 'border-l-2 border-gray-600' : ''}`}>
                              <button
                                onClick={() => toggleSchedule(activity.id, member.user_id, dayIdx, PERSONAL_CYCLE_WEEKS)}
                                className={`w-7 h-7 rounded border transition-all mx-auto block ${
                                  scheduled
                                    ? `${color.bg} border-transparent`
                                    : 'border-gray-600 hover:border-gray-500'
                                }`}
                                title={day}
                              >
                                {scheduled && <span className="text-white text-xs">✓</span>}
                              </button>
                            </td>
                          )
                        })}
                        {/* Weeks 2+ - empty */}
                        {Array.from({ length: (rotaCycleWeeks - 1) * 7 }, (_, i) => (
                          <td key={`empty-${i}`} className={`px-0.5 py-1 ${i % 7 === 0 ? 'border-l-2 border-gray-600' : ''}`} />
                        ))}
                      </tr>
                      )
                    })}

                    {/* Add activity row - last row for this person */}
                    <tr className="border-b border-gray-700/50">
                      <td className="sticky left-0 bg-gray-900 px-3 py-1.5 text-sm z-10">
                        <button
                          onClick={() => setShowActivityPicker({ userId: member.user_id, userName: member.user.display_name })}
                          className="flex items-center gap-2 pl-4 text-gray-500 hover:text-blue-400 transition-colors"
                          title="Add activity"
                        >
                          <div className="w-5 h-5 rounded-full border border-gray-500 hover:border-blue-400 flex items-center justify-center text-xs">
                            +
                          </div>
                        </button>
                      </td>
                      {Array.from({ length: rotaCycleWeeks * 7 }, (_, i) => (
                        <td key={i} className={`px-0.5 py-1 ${i % 7 === 0 ? 'border-l-2 border-gray-600' : ''}`} />
                      ))}
                    </tr>
                  </React.Fragment>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Activity Modal */}
      {showCreateActivityModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <form
            onSubmit={handleCreateActivity}
            className="bg-gray-800 rounded-2xl p-6 w-full max-w-md shadow-2xl border border-gray-700"
          >
            <h2 className="text-xl font-bold text-white mb-4">Create Activity</h2>

            <div className="space-y-4 mb-6">
              <input
                type="text"
                value={newActivityName}
                onChange={(e) => setNewActivityName(e.target.value)}
                placeholder="Activity name"
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
                autoFocus
              />
              <div className="flex gap-2">
                {ACTIVITY_TYPES.map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setNewActivityType(type)}
                    className={`flex-1 py-2 rounded-lg text-sm transition-colors ${
                      newActivityType === type
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
                    }`}
                  >
                    {TYPE_EMOJI[type]} {type}
                  </button>
                ))}
              </div>

              {/* Rota toggle */}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setNewActivityIsRota(false)}
                  className={`flex-1 py-2 rounded-lg text-sm transition-colors ${
                    !newActivityIsRota
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
                  }`}
                >
                  Personal
                </button>
                <button
                  type="button"
                  onClick={() => setNewActivityIsRota(true)}
                  className={`flex-1 py-2 rounded-lg text-sm transition-colors ${
                    newActivityIsRota
                      ? 'bg-purple-600 text-white'
                      : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
                  }`}
                >
                  🔄 Family Chore
                </button>
              </div>

              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <label className="block text-gray-400 text-sm mb-2">Duration</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="5"
                      max="480"
                      step="5"
                      value={newActivityDuration}
                      onChange={(e) => setNewActivityDuration(parseInt(e.target.value) || 30)}
                      className="w-20 bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-center focus:outline-none focus:border-blue-500"
                    />
                    <span className="text-gray-400 text-sm">min</span>
                  </div>
                </div>
                <div className="flex-1">
                  <label className="block text-gray-400 text-sm mb-2">Repeats</label>
                  <div className="flex gap-1">
                    {DAYS.map((day, idx) => {
                      const currentDays = getRepeatDays(newActivityRepeat)
                      const isSelected = currentDays.includes(idx)
                      return (
                        <button
                          key={day}
                          type="button"
                          onClick={() => {
                            const newDays = isSelected
                              ? currentDays.filter((d) => d !== idx)
                              : [...currentDays, idx]
                            setNewActivityRepeat(newDays.length > 0 ? newDays.sort((a, b) => a - b).join(',') : null)
                          }}
                          className={`w-8 h-8 rounded text-xs font-medium transition-colors ${
                            isSelected
                              ? 'bg-blue-600 text-white'
                              : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
                          }`}
                        >
                          {day[0]}
                        </button>
                      )
                    })}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => {
                  setShowCreateActivityModal(false)
                  setNewActivityName('')
                  setNewActivityType('Home')
                  setNewActivityDuration(30)
                  setNewActivityRepeat(null)
                  setNewActivityIsRota(false)
                }}
                className="flex-1 py-2 text-gray-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!newActivityName.trim() || creating}
                className="flex-1 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-500 transition-colors disabled:opacity-50"
              >
                {creating ? 'Creating...' : 'Create'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Edit Activity Modal */}
      {editingActivity && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <form
            onSubmit={handleEditActivity}
            className="bg-gray-800 rounded-2xl p-6 w-full max-w-md shadow-2xl border border-gray-700"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-white">Edit Activity</h2>
              <button
                type="button"
                onClick={handleDeleteActivity}
                disabled={saving}
                className="text-red-500 hover:text-red-400 text-sm transition-colors disabled:opacity-50"
              >
                Delete
              </button>
            </div>

            <div className="space-y-4 mb-6">
              <input
                type="text"
                value={editActivityName}
                onChange={(e) => setEditActivityName(e.target.value)}
                placeholder="Activity name"
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
                autoFocus
              />
              <div className="flex gap-2">
                {ACTIVITY_TYPES.map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setEditActivityType(type)}
                    className={`flex-1 py-2 rounded-lg text-sm transition-colors ${
                      editActivityType === type
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
                    }`}
                  >
                    {TYPE_EMOJI[type]} {type}
                  </button>
                ))}
              </div>

              {/* Rota toggle */}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setEditActivityIsRota(false)}
                  className={`flex-1 py-2 rounded-lg text-sm transition-colors ${
                    !editActivityIsRota
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
                  }`}
                >
                  Personal
                </button>
                <button
                  type="button"
                  onClick={() => setEditActivityIsRota(true)}
                  className={`flex-1 py-2 rounded-lg text-sm transition-colors ${
                    editActivityIsRota
                      ? 'bg-purple-600 text-white'
                      : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
                  }`}
                >
                  🔄 Family Chore
                </button>
              </div>

              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <label className="block text-gray-400 text-sm mb-2">Duration</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="5"
                      max="480"
                      step="5"
                      value={editActivityDuration}
                      onChange={(e) => setEditActivityDuration(parseInt(e.target.value) || 30)}
                      className="w-20 bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-center focus:outline-none focus:border-blue-500"
                    />
                    <span className="text-gray-400 text-sm">min</span>
                  </div>
                </div>
                <div className="flex-1">
                  <label className="block text-gray-400 text-sm mb-2">Repeats</label>
                  <div className="flex gap-1">
                    {DAYS.map((day, idx) => {
                      const currentDays = getRepeatDays(editActivityRepeat)
                      const isSelected = currentDays.includes(idx)
                      return (
                        <button
                          key={day}
                          type="button"
                          onClick={() => {
                            const newDays = isSelected
                              ? currentDays.filter((d) => d !== idx)
                              : [...currentDays, idx]
                            setEditActivityRepeat(newDays.length > 0 ? newDays.sort((a, b) => a - b).join(',') : null)
                          }}
                          className={`w-8 h-8 rounded text-xs font-medium transition-colors ${
                            isSelected
                              ? 'bg-blue-600 text-white'
                              : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
                          }`}
                        >
                          {day[0]}
                        </button>
                      )
                    })}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => {
                  setEditingActivity(null)
                }}
                className="flex-1 py-2 text-gray-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!editActivityName.trim() || saving}
                className="flex-1 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-500 transition-colors disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Activity Picker Modal */}
      {showActivityPicker && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-2xl p-6 w-full max-w-lg shadow-2xl border border-gray-700 max-h-[80vh] flex flex-col">
            <h2 className="text-xl font-bold text-white mb-4">
              Add Activity to {showActivityPicker.userId === null ? 'Family' : `${showActivityPicker.userName}'s`} Schedule
            </h2>

            <input
              type="text"
              value={pickerSearch}
              onChange={(e) => setPickerSearch(e.target.value)}
              placeholder="Search activities..."
              className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white placeholder-gray-400 focus:outline-none focus:border-blue-500 mb-4"
              autoFocus
            />

            <div className="flex-1 overflow-y-auto space-y-2">
              {activities
                .filter((a) => {
                  // Don't show activities already scheduled for this user
                  const alreadyScheduled = schedules.some(
                    (s) => s.activity_id === a.id && s.user_id === showActivityPicker.userId
                  )
                  if (alreadyScheduled) return false

                  // Filter by search
                  if (pickerSearch) {
                    return a.name.toLowerCase().includes(pickerSearch.toLowerCase())
                  }
                  return true
                })
                .map((activity) => {
                  const owner = members.find((m) => m.user_id === activity.user_id)

                  return (
                    <button
                      key={activity.id}
                      onClick={() => addActivityToUser(activity.id, showActivityPicker.userId)}
                      className="w-full flex items-center gap-3 px-4 py-3 bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors text-left"
                    >
                      <span className="text-lg">{TYPE_EMOJI[activity.type]}</span>
                      <div className="flex-1">
                        <div className="text-white">{activity.name}</div>
                        {owner && (
                          <div className="text-gray-400 text-xs">
                            From {owner.user.display_name}&apos;s library
                          </div>
                        )}
                      </div>
                    </button>
                  )
                })}

              {activities.filter((a) => !schedules.some((s) => s.activity_id === a.id && s.user_id === showActivityPicker.userId)).length === 0 && (
                <p className="text-gray-500 text-sm py-4 text-center">
                  All activities are already assigned.
                </p>
              )}
            </div>

            <button
              onClick={() => {
                setShowActivityPicker(null)
                setPickerSearch('')
              }}
              className="mt-4 w-full py-2 text-gray-400 hover:text-white transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Group Edit Modal */}
      {showGroupEditModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-2xl p-6 w-full max-w-2xl shadow-2xl border border-gray-700 max-h-[80vh] flex flex-col">
            <h2 className="text-xl font-bold text-white mb-4">Group Edit - Add Activities to Swimlanes</h2>

            <div className="flex-1 overflow-y-auto grid grid-cols-2 gap-6">
              {/* Activities Selection */}
              <div className="space-y-3">
                <h3 className="text-gray-300 font-medium text-sm">Select Activities</h3>
                <div className="space-y-1 max-h-64 overflow-y-auto">
                  {ACTIVITY_TYPES.map((type) => {
                    const typeActivities = activities.filter((a) => a.type === type)
                    if (typeActivities.length === 0) return null

                    return (
                      <div key={type} className="space-y-1">
                        <div className="text-gray-500 text-xs mt-2 first:mt-0">{TYPE_EMOJI[type]} {type}</div>
                        {typeActivities.map((activity) => (
                          <label
                            key={activity.id}
                            className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-gray-700/50 cursor-pointer"
                          >
                            <input
                              type="checkbox"
                              checked={selectedActivities.has(activity.id)}
                              onChange={() => toggleActivitySelection(activity.id)}
                              className="w-4 h-4 rounded bg-gray-700 border-gray-600 text-blue-600 focus:ring-blue-500 focus:ring-offset-gray-800"
                            />
                            <span className="text-white text-sm">{activity.name}</span>
                            <span className="text-gray-500 text-xs">{activity.default_minutes}m</span>
                          </label>
                        ))}
                      </div>
                    )
                  })}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (selectedActivities.size === activities.length) {
                      setSelectedActivities(new Set())
                    } else {
                      setSelectedActivities(new Set(activities.map((a) => a.id)))
                    }
                  }}
                  className="text-xs text-blue-400 hover:text-blue-300"
                >
                  {selectedActivities.size === activities.length ? 'Deselect All' : 'Select All'}
                </button>
              </div>

              {/* Members Selection */}
              <div className="space-y-3">
                <h3 className="text-gray-300 font-medium text-sm">Select People</h3>
                <div className="space-y-1">
                  {members.map((member, memberIdx) => {
                    const color = getUserColor(memberIdx)
                    return (
                      <label
                        key={member.user_id}
                        className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-gray-700/50 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={selectedMembers.has(member.user_id)}
                          onChange={() => toggleMemberSelection(member.user_id)}
                          className="w-4 h-4 rounded bg-gray-700 border-gray-600 text-blue-600 focus:ring-blue-500 focus:ring-offset-gray-800"
                        />
                        {member.user.avatar_url ? (
                          <img src={member.user.avatar_url} alt="" className="w-5 h-5 rounded-full" />
                        ) : (
                          <div className={`w-5 h-5 rounded-full ${color.bg} flex items-center justify-center text-white text-xs font-bold`}>
                            {member.user.display_name[0]}
                          </div>
                        )}
                        <span className={`text-sm ${color.text}`}>{member.user.display_name}</span>
                      </label>
                    )
                  })}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (selectedMembers.size === members.length) {
                      setSelectedMembers(new Set())
                    } else {
                      setSelectedMembers(new Set(members.map((m) => m.user_id)))
                    }
                  }}
                  className="text-xs text-blue-400 hover:text-blue-300"
                >
                  {selectedMembers.size === members.length ? 'Deselect All' : 'Select All'}
                </button>
              </div>
            </div>

            {/* Summary */}
            <div className="mt-4 pt-4 border-t border-gray-700">
              <p className="text-gray-400 text-sm mb-4">
                {selectedActivities.size > 0 && selectedMembers.size > 0 ? (
                  <>
                    Add <span className="text-white">{selectedActivities.size}</span> activit{selectedActivities.size === 1 ? 'y' : 'ies'} to{' '}
                    <span className="text-white">{selectedMembers.size}</span> person{selectedMembers.size === 1 ? "'s" : "s'"} swimlane{selectedMembers.size === 1 ? '' : 's'}
                  </>
                ) : (
                  'Select activities and people to add them to their swimlanes'
                )}
              </p>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowGroupEditModal(false)
                    setSelectedActivities(new Set())
                    setSelectedMembers(new Set())
                  }}
                  className="flex-1 py-2 text-gray-400 hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleGroupEdit}
                  disabled={selectedActivities.size === 0 || selectedMembers.size === 0 || groupEditSaving}
                  className="flex-1 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-500 transition-colors disabled:opacity-50"
                >
                  {groupEditSaving ? 'Adding...' : 'Add to Swimlanes'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
