# Say Do Tracker - Requirements Specification

## Overview

**Say Do Tracker** is a family activity tracking app for a shared household tablet. It helps Thomas and his two sons (Ivor and Axel) manage daily chores, practice schedules, and activities with accountability through a "Say/Do" ratio system.

### The Problem

The family has ~32 recurring activities across home chores, brain work (music practice, clubs), body (exercise, sports), and downtime. These rotate on a 4-week schedule with different assignments per person per day. Currently tracked in a Google Sheet, but there's no way to:
- Mark tasks as done in real-time
- See who's actually completing their commitments
- Gamify accountability to motivate the kids

### Goals

1. **Daily accountability** - Each person sees their tasks for today and marks them done
2. **Time awareness** - Track how long tasks actually take vs estimates
3. **Gamification** - Leaderboard with Say/Do ratios rewards follow-through
4. **Shared tablet UX** - One device, three users, fast switching
5. **Admin flexibility** - Easy schedule changes without code deploys

### Success Metrics

- All three family members use it daily
- Say/Do ratios above 80% for everyone
- Schedule changes take <2 minutes in admin UI

---

## Tech Stack

- **Framework**: Next.js 14+ (App Router)
- **UI**: React + Tailwind CSS
- **Database**: Supabase (PostgreSQL)
- **Hosting**: Vercel
- **Source Control**: Git

---

## Data Model

### Table: `activities`

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | Primary key |
| name | text | Activity name |
| type | text | One of: Home, Brain, Body, Downtime |
| default_minutes | integer | Estimated duration |
| description | text | Nullable. Details/checklist for future |
| created_at | timestamp | Default now() |

### Table: `schedule`

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | Primary key |
| activity_id | uuid | FK to activities |
| person | text | One of: Thomas, Ivor, Axel, Everyone |
| day_of_week | integer | 0=Monday, 6=Sunday |
| week_of_cycle | integer | 1, 2, 3, or 4 |

**Note**: "Everyone" means the activity appears 3 times in daily view (once per person). Each person must complete independently.

### Table: `completions`

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | Primary key |
| activity_id | uuid | FK to activities |
| person | text | Thomas, Ivor, or Axel |
| date | date | The calendar date |
| status | text | One of: started, done, blocked, skipped |
| started_at | timestamp | Nullable. When Start was clicked |
| completed_at | timestamp | Nullable. When Done was clicked |
| created_at | timestamp | Default now() |

**Unique constraint**: (activity_id, person, date)

### Table: `settings`

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | Primary key |
| key | text | Setting name |
| value | text | Setting value |

**Required setting**: `cycle_start_date` - The date when Week 1, Day 1 (Monday) began. Used to calculate which week of the 4-week cycle any given date falls into.

---

## Seed Data: Activities

These 32 activities should be seeded on first deploy:

```json
[
  {"name": "Rabbit", "type": "Home", "default_minutes": 5},
  {"name": "Folding", "type": "Home", "default_minutes": 10},
  {"name": "Laundry", "type": "Home", "default_minutes": 5},
  {"name": "Clean upstairs bathroom", "type": "Home", "default_minutes": 20},
  {"name": "Clean downstairs bathroom", "type": "Home", "default_minutes": 20},
  {"name": "Vacuum & tidy front room", "type": "Home", "default_minutes": 10},
  {"name": "Vacuum & tidy dining room", "type": "Home", "default_minutes": 10},
  {"name": "Vacuum stairs & landing", "type": "Home", "default_minutes": 5},
  {"name": "Vacuum own bedroom", "type": "Home", "default_minutes": 15},
  {"name": "Purge fridge & menu", "type": "Home", "default_minutes": 30},
  {"name": "Grocery shopping", "type": "Home", "default_minutes": 30},
  {"name": "Deep clean kitchen", "type": "Home", "default_minutes": 30},
  {"name": "Tidy basement", "type": "Home", "default_minutes": 30},
  {"name": "Change bed sheets - Thomas", "type": "Home", "default_minutes": 10},
  {"name": "Change bed sheets - Boys", "type": "Home", "default_minutes": 15},
  {"name": "Outside (mow, weed, rake)", "type": "Home", "default_minutes": 60},
  {"name": "D&D", "type": "Brain", "default_minutes": 60},
  {"name": "Science bowl", "type": "Brain", "default_minutes": 60},
  {"name": "Cello practice", "type": "Brain", "default_minutes": 20},
  {"name": "Cello MYS", "type": "Brain", "default_minutes": 120},
  {"name": "Cello lesson", "type": "Brain", "default_minutes": 45},
  {"name": "Math practice", "type": "Brain", "default_minutes": 30},
  {"name": "Robotics", "type": "Brain", "default_minutes": 90},
  {"name": "Guitar", "type": "Brain", "default_minutes": 60},
  {"name": "Squash", "type": "Body", "default_minutes": 90},
  {"name": "Stretches", "type": "Body", "default_minutes": 15},
  {"name": "Family Hike", "type": "Body", "default_minutes": 120},
  {"name": "Ivor exercise", "type": "Body", "default_minutes": 60},
  {"name": "Axel exercise", "type": "Body", "default_minutes": 60},
  {"name": "Video Downtime", "type": "Downtime", "default_minutes": 30},
  {"name": "Family Video / Read", "type": "Downtime", "default_minutes": 30},
  {"name": "Non video downtime", "type": "Downtime", "default_minutes": 30}
]
```

---

## Seed Data: Schedule

Format: `activity_name: [Week1, Week2, Week3, Week4]` where each week is `[Mon, Tue, Wed, Thu, Fri, Sat, Sun]`.

Values: `T` = Thomas, `I` = Ivor, `A` = Axel, `E` = Everyone, `-` = not scheduled

```
Rabbit:
  Week 1: [I, I, T, T, I, I, I]
  Week 2: [A, A, T, T, T, T, T]
  Week 3: [A, A, T, T, A, A, A]
  Week 4: [I, I, T, T, T, T, T]

Folding:
  Week 1: [A, A, T, T, A, A, A]
  Week 2: [I, I, T, T, T, T, T]
  Week 3: [I, I, T, T, I, I, I]
  Week 4: [A, A, T, T, T, T, T]

Laundry:
  Week 1: [T, T, T, T, T, T, T]
  Week 2: [T, T, T, T, T, T, T]
  Week 3: [T, T, T, T, T, T, T]
  Week 4: [T, T, T, T, T, T, T]

Clean upstairs bathroom:
  Week 1: [-, -, -, -, -, -, A]
  Week 2: [-, -, -, -, -, -, T]
  Week 3: [-, -, -, -, -, -, I]
  Week 4: [-, -, -, -, -, -, T]

Clean downstairs bathroom:
  Week 1: [-, -, -, -, -, -, I]
  Week 2: [-, -, -, -, -, -, T]
  Week 3: [-, -, -, -, -, -, A]
  Week 4: [-, -, -, -, -, -, T]

Vacuum & tidy front room:
  Week 1: [-, -, -, -, -, -, A]
  Week 2: [-, -, -, -, -, -, T]
  Week 3: [-, -, -, -, -, -, I]
  Week 4: [-, -, -, -, -, -, T]

Vacuum & tidy dining room:
  Week 1: [-, -, -, -, -, -, I]
  Week 2: [-, -, -, -, -, -, T]
  Week 3: [-, -, -, -, -, -, A]
  Week 4: [-, -, -, -, -, -, T]

Vacuum stairs & landing:
  Week 1: [-, -, -, -, -, -, A]
  Week 2: [-, -, -, -, -, -, T]
  Week 3: [-, -, -, -, -, -, I]
  Week 4: [-, -, -, -, -, -, T]

Vacuum own bedroom:
  Week 1: [-, -, -, -, -, -, E]
  Week 2: [-, -, -, -, -, -, T]
  Week 3: [-, -, -, -, -, -, E]
  Week 4: [-, -, -, -, -, -, T]

Purge fridge & menu:
  Week 1: [-, -, -, -, -, T, -]
  Week 2: [-, -, -, -, -, T, -]
  Week 3: [-, -, -, -, -, T, -]
  Week 4: [-, -, -, -, -, T, -]

Grocery shopping:
  Week 1: [T, -, -, -, -, T, -]
  Week 2: [T, -, -, -, -, T, -]
  Week 3: [T, -, -, -, -, T, -]
  Week 4: [T, -, -, -, -, T, -]

Deep clean kitchen:
  Week 1: [-, -, -, -, -, -, T]
  Week 2: [-, -, -, -, -, -, -]
  Week 3: [-, -, -, -, -, -, -]
  Week 4: [-, -, -, -, -, -, -]

Tidy basement:
  Week 1: [-, -, -, -, -, T, -]
  Week 2: [-, -, -, -, -, T, -]
  Week 3: [-, -, -, -, -, T, -]
  Week 4: [-, -, -, -, -, T, -]

Change bed sheets - Thomas:
  Week 1: [-, -, -, -, -, -, T]
  Week 2: [-, -, -, -, -, -, T]
  Week 3: [-, -, -, -, -, -, T]
  Week 4: [-, -, -, -, -, -, T]

Change bed sheets - Boys:
  Week 1: [-, -, -, -, -, -, T]
  Week 2: [-, -, -, -, -, -, -]
  Week 3: [-, -, -, -, -, -, T]
  Week 4: [-, -, -, -, -, -, -]

Outside (mow, weed, rake):
  Week 1: [-, -, -, -, -, -, -]
  Week 2: [-, -, -, -, -, -, -]
  Week 3: [-, -, -, -, E, -, -]
  Week 4: [-, -, -, -, -, -, -]

D&D:
  Week 1: [-, I, -, -, -, -, -]
  Week 2: [-, I, -, -, -, -, -]
  Week 3: [-, I, -, -, -, -, -]
  Week 4: [-, I, -, -, -, -, -]

Science bowl:
  Week 1: [-, -, -, I, -, -, -]
  Week 2: [-, -, -, I, -, -, -]
  Week 3: [-, -, -, I, -, -, -]
  Week 4: [-, -, -, I, -, -, -]

Cello practice:
  Week 1: [-, I, I, I, -, -, -]
  Week 2: [-, I, I, I, -, -, -]
  Week 3: [-, I, I, I, -, -, -]
  Week 4: [-, I, I, I, -, -, -]

Cello MYS:
  Week 1: [-, -, -, -, -, I, -]
  Week 2: [-, -, -, -, -, I, -]
  Week 3: [-, -, -, -, -, I, -]
  Week 4: [-, -, -, -, -, I, -]

Cello lesson:
  Week 1: [I, -, -, -, -, -, -]
  Week 2: [I, -, -, -, -, -, -]
  Week 3: [I, -, -, -, -, -, -]
  Week 4: [I, -, -, -, -, -, -]

Math practice:
  Week 1: [A, -, -, -, -, -, -]
  Week 2: [A, -, -, -, -, -, -]
  Week 3: [A, -, -, -, -, -, -]
  Week 4: [A, -, -, -, -, -, -]

Robotics:
  Week 1: [-, A, A, -, -, -, -]
  Week 2: [-, A, A, -, -, -, -]
  Week 3: [-, A, A, -, -, -, -]
  Week 4: [-, A, A, -, -, -, -]

Guitar:
  Week 1: [-, -, T, T, -, T, -]
  Week 2: [-, -, -, T, T, -, T]
  Week 3: [-, -, T, T, -, T, -]
  Week 4: [-, -, T, T, -, T, -]

Squash:
  Week 1: [T, -, T, -, -, -, T]
  Week 2: [T, -, T, -, -, -, T]
  Week 3: [T, -, T, -, -, -, T]
  Week 4: [T, -, T, -, -, -, T]

Stretches:
  Week 1: [T, T, T, T, T, T, T]
  Week 2: [T, T, T, T, T, T, T]
  Week 3: [T, T, T, T, T, T, T]
  Week 4: [T, T, T, T, T, T, T]

Family Hike:
  Week 1: [-, -, -, -, -, -, E]
  Week 2: [-, -, -, -, -, -, -]
  Week 3: [-, -, -, -, -, -, E]
  Week 4: [-, -, -, -, -, -, -]

Ivor exercise:
  Week 1: [-, -, I, -, -, I, -]
  Week 2: [-, -, I, -, -, I, -]
  Week 3: [-, -, I, -, -, I, -]
  Week 4: [-, -, I, -, -, I, -]

Axel exercise:
  Week 1: [A, -, -, -, -, A, -]
  Week 2: [A, -, -, -, -, A, -]
  Week 3: [A, -, -, -, -, A, -]
  Week 4: [A, -, -, -, -, A, -]

Video Downtime:
  Week 1: [E, E, -, -, E, E, E]
  Week 2: [E, E, -, -, -, -, -]
  Week 3: [E, E, -, -, E, E, E]
  Week 4: [E, E, -, -, -, -, -]

Family Video / Read:
  Week 1: [E, E, -, -, E, E, E]
  Week 2: [E, E, -, -, -, -, -]
  Week 3: [E, E, -, -, E, E, E]
  Week 4: [E, E, -, -, -, -, -]

Non video downtime:
  Week 1: [E, E, -, -, E, E, E]
  Week 2: [E, E, -, -, -, -, -]
  Week 3: [E, E, -, -, E, E, E]
  Week 4: [E, E, -, -, -, -, -]
```

---

## Business Logic

### Calculating Current Week of Cycle

```
Given: cycle_start_date (a Monday), target_date (any date)

1. days_since_start = target_date - cycle_start_date
2. week_number = floor(days_since_start / 7) % 4
3. week_of_cycle = week_number + 1  // Returns 1, 2, 3, or 4
4. day_of_week = target_date.weekday()  // 0=Mon, 6=Sun
```

### Generating Daily Tasks

```
Given: target_date

1. Calculate week_of_cycle and day_of_week for target_date
2. Query schedule WHERE week_of_cycle = X AND day_of_week = Y
3. For each schedule row:
   - If person = "Everyone": create 3 task rows (Thomas, Ivor, Axel)
   - Else: create 1 task row for that person
4. Left join with completions for that date to get status
```

### Say/Do Ratio Calculation

```
For a person in a calendar month:

total_assigned = COUNT of schedule rows for that person in month
                 (including "Everyone" rows, counted once per person)

total_done = COUNT of completions WHERE status = 'done'

say_do_ratio = total_done / total_assigned
```

**Note**: `blocked` and `skipped` count against the ratio. Only `done` counts as completed.

---

## UI Specification

### General Requirements

- **Device**: Shared household tablet (assume 10" iPad-ish)
- **Orientation**: Landscape preferred, but should work portrait
- **Touch targets**: Minimum 44px height for all buttons
- **Single screen**: Daily view must fit without scrolling for typical day (~8-12 tasks)
- **Font sizes**: Large and readable from arm's length

### Color Palette

Fun, distinct colors per person for quick visual identification:

| Element | Color | Tailwind |
|---------|-------|----------|
| Thomas | Blue | `bg-blue-500`, `text-blue-700` |
| Ivor | Green | `bg-green-500`, `text-green-700` |
| Axel | Orange | `bg-orange-500`, `text-orange-700` |
| Home type | Purple accent | `bg-purple-100` |
| Brain type | Yellow accent | `bg-yellow-100` |
| Body type | Red accent | `bg-red-100` |
| Downtime type | Teal accent | `bg-teal-100` |
| Done status | Green | `bg-green-100`, `text-green-800` |
| Blocked status | Red | `bg-red-100`, `text-red-800` |
| Skipped status | Gray | `bg-gray-200`, `text-gray-600` |
| Background | Light gray | `bg-gray-50` |

### Navigation

Simple top nav bar:
- **Logo/Title**: "Say Do" (left)
- **Nav links**: Daily | Leaderboard | Admin (center)
- **Date display**: Current date (right)

---

## View: Daily (Default Route `/`)

### Layout

```
┌─────────────────────────────────────────────────────────────────┐
│  Say Do          Daily | Leaderboard | Admin       Jan 2, 2025  │
├─────────────────────────────────────────────────────────────────┤
│  ◀ Yesterday    ★ Today ★    Tomorrow ▶                         │
│                                                                 │
│  [All] [Thomas] [Ivor] [Axel]           3/8 done               │
├─────────────────────────────────────────────────────────────────┤
│  DO                        │ WHO      │ DONE                    │
├────────────────────────────┼──────────┼─────────────────────────┤
│  🏠 Rabbit                 │ Ivor     │ [Start] [Blocked] [Skip]│
│  🏠 Laundry                │ Thomas   │ Done in 4 mins  [Undo]  │
│  🏠 Folding                │ Axel     │ [1:23] [Done]           │
│  🧠 Cello practice         │ Ivor     │ Blocked         [Undo]  │
│  💪 Stretches              │ Thomas   │ [Start] [Blocked] [Skip]│
│  🎮 Video Downtime         │ Thomas   │ [Start] [Blocked] [Skip]│
│  🎮 Video Downtime         │ Ivor     │ [Start] [Blocked] [Skip]│
│  🎮 Video Downtime         │ Axel     │ Skipped         [Undo]  │
└─────────────────────────────────────────────────────────────────┘
```

### Components

**Date Navigation**
- Left/right arrows to change date
- "Today" button to jump back to current date
- Show day of week + date

**Filter Buttons**
- All (default) | Thomas | Ivor | Axel
- Active filter highlighted in that person's color
- Show count: "3/8 done" updates based on filter

**Task Table**
- Column 1 - DO: Type emoji + activity name. Clickable (shows description modal).
- Column 2 - WHO: Person name, colored badge with their color
- Column 3 - DONE: Status/action buttons

**Done Column States**

| State | Display |
|-------|---------|
| Not started | `[Start]` `[Blocked]` `[Skip]` - 3 buttons |
| In progress | `[1:23]` live timer + `[Done]` button |
| Completed | `Done in X mins` text + `[Undo]` link |
| Blocked | `Blocked` text + `[Undo]` link |
| Skipped | `Skipped` text + `[Undo]` link |

**Past Date Behavior**
- No timer functionality
- Show `[Done]` `[Blocked]` `[Skip]` directly (no Start)
- Can still undo

### Interactions

1. **Click Start**: 
   - Create completion record with status='started', started_at=now
   - Show ticking timer + Done button

2. **Click Done** (after Start):
   - Update completion: status='done', completed_at=now
   - Show "Done in X mins" (calculated from started_at)

3. **Click Done** (past date, no Start):
   - Create completion: status='done', started_at=null, completed_at=null
   - Show "Done" (no time)

4. **Click Blocked/Skip**:
   - Create/update completion with that status
   - Show status text + Undo

5. **Click Undo**:
   - Delete the completion record
   - Return to not-started state

6. **Click Activity Name**:
   - Open modal with activity description (or "No description" placeholder)

### Done Confirmation Popup

When clicking Done (after a timer is running), show a large modal popup:

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│                        🎉 Nice work! 🎉                         │
│                                                                 │
│                     ┌─────────────────┐                         │
│                     │      12        │  mins                    │
│                     └─────────────────┘                         │
│                                                                 │
│                     ┌─────┬─────┬─────┐                         │
│                     │  1  │  2  │  3  │                         │
│                     ├─────┼─────┼─────┤                         │
│                     │  4  │  5  │  6  │                         │
│                     ├─────┼─────┼─────┤                         │
│                     │  7  │  8  │  9  │                         │
│                     ├─────┼─────┼─────┤                         │
│                     │  ⌫  │  0  │  ✓  │                         │
│                     └─────┴─────┴─────┘                         │
│                                                                 │
│                          [Cancel]                               │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Behavior**:
- Pre-filled with timer's elapsed minutes (rounded)
- Large display showing current value
- 0-9 keypad for easy touch input (no keyboard needed)
- Backspace (⌫) to delete digits
- Checkmark (✓) to confirm and save
- Cancel to return without saving
- All buttons should be large touch targets (minimum 60px)
- Tapping a number replaces the value if it's the initial timer value, otherwise appends

---

## View: Leaderboard (`/leaderboard`)

### Layout

```
┌─────────────────────────────────────────────────────────────────┐
│  Say Do          Daily | Leaderboard | Admin       Jan 2, 2025  │
├─────────────────────────────────────────────────────────────────┤
│                    January 2025 Leaderboard                     │
│                                                                 │
│   🥇  Thomas     ████████████████░░░░  82%   (45/55)           │
│                                                                 │
│   🥈  Ivor       ████████████░░░░░░░░  65%   (32/49)           │
│                                                                 │
│   🥉  Axel       ██████████░░░░░░░░░░  58%   (28/48)           │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Components

- Month/year header (current calendar month)
- Three person cards, ranked by Say/Do ratio
- Each card shows:
  - Medal emoji (🥇🥈🥉)
  - Person name (in their color)
  - Progress bar (filled portion = ratio)
  - Percentage
  - Fraction (done/total)
- Cards should be large and celebratory

---

## View: Admin (`/admin`)

### Layout

```
┌─────────────────────────────────────────────────────────────────┐
│  Say Do          Daily | Leaderboard | Admin       Jan 2, 2025  │
├─────────────────────────────────────────────────────────────────┤
│  Schedule Editor                              [+ Add Activity]  │
│                                                                 │
│  Cycle Start Date: [2025-01-06] (Monday)                       │
├─────────────────────────────────────────────────────────────────┤
│              │ WEEK 1          │ WEEK 2          │ ...         │
│  Activity    │ M  T  W  T  F  S  S │ M  T  W  T  F  S  S │     │
├──────────────┼─────────────────┼─────────────────┼─────────────┤
│  Rabbit      │ I  I  T  T  I  I  I │ A  A  T  T  T  T  T │     │
│  Folding     │ A  A  T  T  A  A  A │ I  I  T  T  T  T  T │     │
│  Laundry     │ T  T  T  T  T  T  T │ T  T  T  T  T  T  T │     │
│  ...         │                     │                     │     │
└─────────────────────────────────────────────────────────────────┘
```

### Components

**Cycle Start Date Picker**
- Date input defaulting to current setting
- Must be a Monday
- Save button updates settings table

**Schedule Grid**
- Rows: All activities (sortable by type?)
- Columns: 28 days (4 weeks × 7 days)
- Cells: Dropdown or click-to-cycle through T / I / A / E / -
- Auto-saves on change (optimistic UI)

**Add Activity Button**
- Modal form: name, type (dropdown), default_minutes
- After save, new row appears in grid

**Edit/Delete Activity**
- Click activity name to edit
- Delete button with confirmation

### Horizontal Scrolling

The grid will be wide. Options:
- Horizontal scroll on the grid area
- Or: collapse to show one week at a time with week tabs

Recommend: Horizontal scroll is fine for admin. It's not used daily.

---

## API Routes (Next.js App Router)

### GET `/api/activities`
Returns all activities.

### POST `/api/activities`
Create new activity. Body: `{name, type, default_minutes}`

### PUT `/api/activities/[id]`
Update activity.

### DELETE `/api/activities/[id]`
Delete activity and its schedule entries.

### GET `/api/schedule`
Returns full schedule (all 4 weeks).

### PUT `/api/schedule`
Bulk update schedule. Body: array of `{activity_id, person, day_of_week, week_of_cycle}`

### GET `/api/daily?date=YYYY-MM-DD`
Returns tasks for a specific date with completion status.
Response: array of `{activity, person, completion}`

### POST `/api/completions`
Create or update completion. Body: `{activity_id, person, date, status, started_at?, completed_at?}`

### DELETE `/api/completions/[id]`
Delete completion (undo).

### GET `/api/leaderboard?month=YYYY-MM`
Returns Say/Do stats for each person for the given month.
Response: `{thomas: {done, total, ratio}, ivor: {...}, axel: {...}}`

### GET `/api/settings`
Returns all settings.

### PUT `/api/settings`
Update settings. Body: `{key, value}`

---

## File Structure

```
/app
  /page.tsx                 # Daily view (default)
  /leaderboard/page.tsx     # Leaderboard view
  /admin/page.tsx           # Admin view
  /api
    /activities/route.ts
    /activities/[id]/route.ts
    /schedule/route.ts
    /daily/route.ts
    /completions/route.ts
    /completions/[id]/route.ts
    /leaderboard/route.ts
    /settings/route.ts
/components
  /Nav.tsx
  /TaskRow.tsx
  /Timer.tsx
  /PersonBadge.tsx
  /FilterButtons.tsx
  /DateNav.tsx
  /LeaderboardCard.tsx
  /ScheduleGrid.tsx
  /ActivityModal.tsx
/lib
  /supabase.ts              # Supabase client
  /utils.ts                 # Date/week calculations
/supabase
  /migrations
    /001_initial_schema.sql
    /002_seed_data.sql
```

---

## Supabase Setup

### Migration 001: Schema

```sql
-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Activities table
create table activities (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  type text not null check (type in ('Home', 'Brain', 'Body', 'Downtime')),
  default_minutes integer not null default 15,
  description text,
  created_at timestamp with time zone default now()
);

-- Schedule table
create table schedule (
  id uuid primary key default uuid_generate_v4(),
  activity_id uuid references activities(id) on delete cascade,
  person text not null check (person in ('Thomas', 'Ivor', 'Axel', 'Everyone')),
  day_of_week integer not null check (day_of_week between 0 and 6),
  week_of_cycle integer not null check (week_of_cycle between 1 and 4),
  unique (activity_id, person, day_of_week, week_of_cycle)
);

-- Completions table
create table completions (
  id uuid primary key default uuid_generate_v4(),
  activity_id uuid references activities(id) on delete cascade,
  person text not null check (person in ('Thomas', 'Ivor', 'Axel')),
  date date not null,
  status text not null check (status in ('started', 'done', 'blocked', 'skipped')),
  started_at timestamp with time zone,
  completed_at timestamp with time zone,
  created_at timestamp with time zone default now(),
  unique (activity_id, person, date)
);

-- Settings table
create table settings (
  id uuid primary key default uuid_generate_v4(),
  key text unique not null,
  value text not null
);

-- Insert default cycle start date (first Monday)
insert into settings (key, value) values ('cycle_start_date', '2025-01-06');

-- Indexes for common queries
create index idx_schedule_lookup on schedule(week_of_cycle, day_of_week);
create index idx_completions_date on completions(date);
create index idx_completions_person_date on completions(person, date);
```

### Migration 002: Seed Data

Generate INSERT statements from the activities JSON and schedule data above.

---

## Implementation Notes for Claude CLI

1. **Start with database**: Create Supabase project, run migrations, verify seed data

2. **Build API routes first**: Get data flowing before UI

3. **Daily view is MVP core**: Get this working end-to-end before Leaderboard/Admin

4. **Timer state**: Keep timer state in React (useState), only write to DB on Done click

5. **Real-time not required**: Simple fetch on page load is fine. No Supabase realtime subscriptions needed.

6. **Date handling**: Use date-fns or dayjs for date math. Store dates as YYYY-MM-DD strings in completions.

7. **Tailwind config**: Add the custom colors to tailwind.config.js if needed, or use default palette

8. **Error handling**: Toast notifications for save errors. Optimistic UI for fast feel.

9. **Mobile responsive**: Test that buttons are tappable at small sizes, but optimize for tablet landscape

---

## Future Features (Out of Scope for MVP)

- Activity description with checklists
- Historical time tracking analytics
- Pie charts of time by category
- Trend lines showing speed improvement
- Push notifications / reminders
- Multiple family profiles
- Dark mode
