# SayDo Tracker - Phase II Requirements

## 1. Screensaver Mode

Rotating image display when app is idle.

- Displays photos from configured album/folder
- Cycles images on interval (configurable)
- Any tap exits screensaver and opens SayDo
- Activates after idle timeout (configurable)

---

## 2. Long-Term Tasks

Persistent task list for non-repeating projects that span multiple sessions.

### Data Model
```
long_term_tasks
  id
  person_id (FK to people)
  title
  category (home | body | brain | downtime)
  due_date (optional)
  default_estimate_minutes (optional)
  total_time_spent_minutes
  status (active | completed)
  created_at
  completed_at

long_term_task_sessions
  id
  task_id (FK)
  started_at
  ended_at
  duration_minutes
```

### Behavior
- User can start/stop timer without completing task
- Time accumulates across sessions
- UI shows total time spent
- Partial SayDo credit applied to selected category
- Consider tracking in hours for large projects

---

## 3. Recurring Events & Long-Term Appointments

### Types
- **Recurring:** Birthdays, anniversaries (annual)
- **One-off long-term:** Doctor appointments, dentist

### Data Model
```
scheduled_events
  id
  title
  event_type (recurring | one_off)
  recurrence_rule (nullable - e.g., "yearly on March 15")
  event_date
  reminder_days_before (default: 1)
  person_id (who it's for, nullable)
  created_by_person_id
  created_at
```

### Behavior
- Admin can add/edit events
- Day-before reminder shown prominently
- Optional: Push event to person's external calendar (requires calendar_id on people table)

---

## 4. People Table (Multi-User Prep)

Migrate from name strings to proper people table before multi-user launch.

```
people
  id (uuid)
  name
  user_id (FK to auth.users, nullable)
  external_calendar_id (nullable)
  created_at
```

### Migration Path
1. Create people table
2. Insert row per family member
3. Update all existing FK references from name → people.id
4. Later: Link user_id when person creates auth account

---

## 5. Device Communication System

Symmetric communication between any online SayDo instances.

### Data Model
```
devices
  id
  name ("Upstairs Tablet", "Tom Phone")
  last_active_at

announcement_sounds
  id
  name ("Dinner", "Come downstairs", "Call daddy ASAP")
  audio_url

announcements
  id
  from_device_id
  to_device_id (nullable = broadcast to all)
  sound_id
  created_at

calls
  id
  from_device_id
  to_device_id
  status (ringing | connected | ended | unanswered)
  created_at
  ended_at

alerts
  id
  from_device_id
  to_device_id
  message
  status (active | dismissed | expired)
  created_at
  expires_at (default: created_at + 2 hours)
```

### 5a. Announcements (One-Way)

Fire-and-forget audio notifications.

**Flow:**
1. User selects preset sound + target device (or "all")
2. Broadcast via Supabase Realtime
3. Target device(s) play audio immediately
4. No acknowledgment required

**Tech:** Supabase Realtime, browser Audio API

### 5b. Intercom Calls (Two-Way Voice)

Live voice calls between devices.

**Flow:**
1. User initiates call to target device
2. Target shows incoming call UI, plays ringtone
3. Recipient accepts → WebRTC peer connection established
4. Live audio both directions
5. Either party hangs up

**Tech:** 
- Supabase Realtime for signaling (SDP exchange, ICE candidates)
- WebRTC for audio stream
- TURN server required for outside-home calls (Twilio Network Traversal recommended)

### 5c. Unanswered Call Alerts

When call isn't answered.

**Flow:**
1. Call rings for 30 seconds, no answer
2. Caller prompted: "Leave a message?"
3. Caller types message
4. Target device shows full-screen flashing alert
5. Pulsing chime every ~30 seconds for up to 2 hours
6. Dismissable by: recipient tap, caller remote dismiss, or expiration

**UI on target device (alert state):**
- Overrides screensaver
- Full screen, flashing/pulsing background
- Large message text
- "OK" button to acknowledge
- Cannot be ignored

**Caller's device shows:**
- "Alert active on [Device]"
- "Dismiss" button to remotely kill alert

### 5d. Presence

Track which devices are currently online.

- Use Supabase Realtime Presence
- Device picker shows green dot (online) / gray dot (offline)
- Cannot call or announce to offline device
- Option to leave alert for offline device (displays when app opens)

---

## Tech Stack

- **Frontend:** Next.js
- **Backend/DB:** Supabase (Postgres, Auth, Realtime, Storage)
- **Realtime:** Supabase Realtime (presence, announcements, signaling)
- **Voice:** WebRTC + TURN server (Twilio)
- **Audio:** Browser Audio API, optional SpeechSynthesis for TTS

---

## Implementation Priority

1. People table migration (unblocks multi-user)
2. Screensaver mode (simple, high UX value)
3. Announcements (no WebRTC, quick win)
4. Intercom calls (most complex)
5. Long-term tasks
6. Recurring events + calendar push
