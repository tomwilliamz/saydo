# Say Do Tracker - Developer Handbook

## Overview

Say Do Tracker is a family activity tracking application designed for shared household tablet use. It helps a family of three (Thomas and sons Ivor and Axel) manage daily chores, practice schedules, and activities with accountability through a "Say/Do" ratio system.

### Core Concept

- **Say**: Tasks scheduled for a person on a given day
- **Do**: Tasks actually completed
- **Say/Do Ratio**: Percentage of scheduled tasks completed (only "Done" counts; "Blocked" and "Skipped" count against)

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js 14+ (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS |
| Database | PostgreSQL (via Supabase) |
| Auth | Supabase Auth (Google OAuth) |
| Hosting | Vercel |
| Package Manager | npm |

---

## Project Structure

```
/src
├── app/                          # Next.js App Router pages
│   ├── page.tsx                  # Daily view (main page)
│   ├── layout.tsx                # Root layout with AppShell
│   ├── globals.css               # Global styles + Tailwind
│   ├── login/page.tsx            # Google OAuth login
│   ├── leaderboard/page.tsx      # Monthly Say/Do ratios
│   ├── admin/page.tsx            # Schedule & activity management
│   ├── auth/callback/route.ts    # OAuth callback handler
│   └── api/                      # API routes
│       ├── activities/           # CRUD for activities
│       ├── schedule/             # Schedule management
│       ├── daily/                # Daily task fetching
│       ├── completions/          # Task completion tracking
│       ├── leaderboard/          # Stats calculation
│       └── settings/             # App settings
├── components/                   # React components
│   ├── AppShell.tsx              # Conditional nav wrapper
│   ├── Nav.tsx                   # Top navigation bar
│   ├── DateNav.tsx               # Date navigation controls
│   ├── FilterButtons.tsx         # Person filter (All/Thomas/Ivor/Axel)
│   ├── TaskRow.tsx               # Individual task with actions
│   ├── Timer.tsx                 # Live countdown timer
│   ├── PersonBadge.tsx           # Colored person indicator
│   ├── LeaderboardCard.tsx       # Person stats card
│   ├── ScheduleGrid.tsx          # 4-week schedule editor
│   └── ActivityForm.tsx          # Add/edit activity modal
├── lib/                          # Shared utilities
│   ├── supabase/                 # Supabase clients
│   │   ├── client.ts             # Browser client
│   │   ├── server.ts             # Server client (API routes)
│   │   └── middleware.ts         # Auth middleware
│   ├── types.ts                  # TypeScript interfaces
│   └── utils.ts                  # Date/cycle calculations
└── middleware.ts                 # Next.js middleware (auth)

/supabase
├── config.toml                   # Supabase local config
└── migrations/                   # Database migrations
    ├── 20250102000001_initial_schema.sql
    ├── 20250102000002_seed_activities.sql
    └── 20250102000003_seed_schedule.sql
```

---

## Database Schema

### Tables

#### `activities`
Defines what tasks exist in the system.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| name | text | Activity name (e.g., "Rabbit", "Cello practice") |
| type | text | Category: `Home`, `Brain`, `Body`, `Downtime` |
| default_minutes | integer | Estimated duration |
| description | text | Optional details/checklist |
| created_at | timestamptz | Creation timestamp |

#### `schedule`
Maps activities to people on specific days of the 4-week cycle.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| activity_id | uuid | FK to activities |
| person | text | `Thomas`, `Ivor`, `Axel`, or `Everyone` |
| day_of_week | integer | 0=Monday, 6=Sunday |
| week_of_cycle | integer | 1, 2, 3, or 4 |

**Note**: When `person = 'Everyone'`, the task appears for all three people individually.

#### `completions`
Tracks task completion status for each person/date.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| activity_id | uuid | FK to activities |
| person | text | `Thomas`, `Ivor`, or `Axel` |
| date | date | Calendar date (YYYY-MM-DD) |
| status | text | `started`, `done`, `blocked`, `skipped` |
| started_at | timestamptz | When "Start" was clicked |
| completed_at | timestamptz | When "Done" was clicked |
| created_at | timestamptz | Record creation time |

**Unique constraint**: `(activity_id, person, date)`

#### `settings`
Key-value store for app configuration.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| key | text | Setting name (unique) |
| value | text | Setting value |

**Current settings**:
- `cycle_start_date`: The Monday when Week 1 began (used for cycle calculations)

---

## Business Logic

### 4-Week Cycle Calculation

The schedule repeats on a 4-week cycle. To determine which week applies:

```typescript
function getWeekOfCycle(targetDate: Date, cycleStartDate: Date): number {
  const daysSinceStart = differenceInDays(targetDate, cycleStartDate)
  const weekNumber = Math.floor(daysSinceStart / 7) % 4
  return weekNumber >= 0 ? weekNumber + 1 : (4 + weekNumber + 1)
}
```

### Day of Week Convention

- **Database**: 0=Monday, 6=Sunday
- **JavaScript Date.getDay()**: 0=Sunday, 6=Saturday
- Conversion required in `getDayOfWeek()` utility

### Say/Do Ratio Calculation

```
For a person in a calendar month:

total_assigned = COUNT of scheduled tasks for that person
                 ("Everyone" entries count once per person)

total_done = COUNT of completions WHERE status = 'done'

ratio = total_done / total_assigned
```

**Important**: Only `done` status counts positively. `blocked` and `skipped` count against the ratio.

---

## API Reference

### Activities

#### `GET /api/activities`
Returns all activities ordered by type, then name.

**Response**: `Activity[]`

#### `POST /api/activities`
Create a new activity.

**Body**:
```json
{
  "name": "New Task",
  "type": "Home",
  "default_minutes": 15,
  "description": "Optional details"
}
```

#### `PUT /api/activities/[id]`
Update an existing activity.

#### `DELETE /api/activities/[id]`
Delete activity and its schedule entries (cascade).

---

### Schedule

#### `GET /api/schedule`
Returns full schedule with activity details.

**Response**: `Schedule[]` with nested `activity` object

#### `PUT /api/schedule`
Bulk update schedule for an activity.

**Body**: Array of schedule entries
```json
[
  {"activity_id": "uuid", "person": "Thomas", "day_of_week": 0, "week_of_cycle": 1},
  {"activity_id": "uuid", "person": "Ivor", "day_of_week": 1, "week_of_cycle": 1}
]
```

---

### Daily

#### `GET /api/daily?date=YYYY-MM-DD`
Returns tasks for a specific date with completion status.

**Response**:
```json
{
  "date": "2025-01-06",
  "weekOfCycle": 1,
  "dayOfWeek": 0,
  "tasks": [
    {
      "activity": { "id": "...", "name": "Rabbit", "type": "Home", ... },
      "person": "Ivor",
      "completion": null | { "id": "...", "status": "done", ... }
    }
  ]
}
```

**Logic**:
1. Calculate `weekOfCycle` and `dayOfWeek` from date
2. Query schedule for matching entries
3. Expand "Everyone" into 3 separate tasks
4. Left join with completions for status

---

### Completions

#### `POST /api/completions`
Create or update a completion record (upsert by activity_id + person + date).

**Body**:
```json
{
  "activity_id": "uuid",
  "person": "Thomas",
  "date": "2025-01-06",
  "status": "started|done|blocked|skipped",
  "started_at": "ISO timestamp (optional)",
  "completed_at": "ISO timestamp (optional)"
}
```

#### `DELETE /api/completions/[id]`
Delete a completion (undo action).

---

### Leaderboard

#### `GET /api/leaderboard?month=YYYY-MM`
Returns Say/Do stats for each person.

**Response**:
```json
{
  "month": "2025-01",
  "stats": [
    {"person": "Thomas", "done": 45, "total": 55, "ratio": 0.82},
    {"person": "Ivor", "done": 32, "total": 49, "ratio": 0.65},
    {"person": "Axel", "done": 28, "total": 48, "ratio": 0.58}
  ]
}
```

Stats are sorted by ratio descending.

---

### Settings

#### `GET /api/settings`
Returns all settings as key-value object.

**Response**:
```json
{
  "cycle_start_date": "2025-01-06"
}
```

#### `PUT /api/settings`
Update a setting (upsert).

**Body**:
```json
{
  "key": "cycle_start_date",
  "value": "2025-01-06"
}
```

---

## UI Components

### Daily View (`/`)

The main interface showing today's tasks.

**Features**:
- Date navigation (previous/next day, jump to today)
- Person filter (All / Thomas / Ivor / Axel)
- Task list with status indicators
- Action buttons based on state:

| State | Actions Available |
|-------|-------------------|
| Not started (today) | Start, Blocked, Skip |
| Not started (past) | Done, Blocked, Skip |
| Started | Timer display, Done |
| Done | "Done in X mins", Undo |
| Blocked | "Blocked", Undo |
| Skipped | "Skipped", Undo |

**Timer**: Client-side only, calculated from `started_at`. Only persists to DB on "Done" click.

### Leaderboard (`/leaderboard`)

Monthly accountability view.

**Features**:
- Shows current month stats
- Ranked by Say/Do ratio
- Progress bar visualization
- Medal icons (🥇🥈🥉)

### Admin (`/admin`)

Schedule management interface.

**Features**:
- Cycle start date picker
- Activity list (click to edit)
- Add new activity button
- Schedule grid:
  - Week selector (1-4)
  - Click cells to cycle through: - → T → I → A → E → -
  - Auto-saves on change

---

## Authentication

### Current State
Auth is **bypassed** for debugging. See `src/lib/supabase/middleware.ts`.

### To Re-enable
Uncomment the auth check in `middleware.ts`:
```typescript
const { data: { user } } = await supabase.auth.getUser()
// ... redirect logic
```

### Google OAuth Setup
1. Enable Google provider in Supabase Dashboard → Authentication → Providers
2. Add Google OAuth credentials (Client ID, Secret)
3. Configure redirect URLs:
   - `http://localhost:3050/auth/callback` (dev)
   - `https://your-domain.vercel.app/auth/callback` (prod)

---

## Color System

### Person Colors
| Person | Primary | Text | Tailwind |
|--------|---------|------|----------|
| Thomas | Blue | `text-blue-700` | `bg-blue-500` |
| Ivor | Green | `text-green-700` | `bg-green-500` |
| Axel | Orange | `text-orange-700` | `bg-orange-500` |

### Activity Type Colors
| Type | Background |
|------|------------|
| Home | `bg-purple-100` |
| Brain | `bg-yellow-100` |
| Body | `bg-red-100` |
| Downtime | `bg-teal-100` |

### Status Colors
| Status | Style |
|--------|-------|
| Done | `bg-green-50` row, green text |
| Blocked | `bg-red-50` row, red text |
| Skipped | `bg-gray-100` row, gray text |

---

## Development

### Prerequisites
- Node.js 18+
- npm
- Supabase CLI (`npm install -D supabase`)
- GitHub CLI (`gh`) for repo management

### Local Setup

```bash
# Install dependencies
npm install

# Start dev server (always use port 3050)
npm run dev -- -p 3050

# Run database migrations
npx supabase db push
```

### Environment Variables

Create `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
```

### Database Commands

```bash
# Link to Supabase project
npx supabase link --project-ref <PROJECT_REF>

# Push migrations
npx supabase db push

# Generate types (optional)
npx supabase gen types typescript --linked > src/lib/database.types.ts
```

---

## Deployment

### Vercel

1. Connect GitHub repo to Vercel
2. Add environment variables in Vercel dashboard
3. Deploy

### Supabase

- Migrations auto-apply via `npx supabase db push`
- Configure Google OAuth redirect URL for production domain

---

## Seed Data

The app comes pre-seeded with:
- **32 activities** across Home, Brain, Body, and Downtime categories
- **Full 4-week schedule** mapping activities to family members

See migration files for complete seed data:
- `supabase/migrations/20250102000002_seed_activities.sql`
- `supabase/migrations/20250102000003_seed_schedule.sql`

---

## Known Issues / TODOs

1. **Next.js 16 Middleware Warning**: The `middleware` convention is deprecated in favor of `proxy`. This is a cosmetic warning and doesn't affect functionality.

2. **Auth Bypass**: Currently disabled for debugging. Re-enable before production.

3. **Activity Description Modal**: Spec mentions clicking activity name shows description - not yet implemented.

4. **Time Zone Handling**: Dates are stored as `YYYY-MM-DD` strings. Ensure consistent timezone handling.

---

## Architecture Decisions

1. **No Real-time**: Simple fetch on page load. Supabase realtime subscriptions not needed for this use case.

2. **Timer State**: Kept in React state, only persisted on "Done" click. Prevents DB spam during timing.

3. **Optimistic UI**: Schedule changes update immediately, rollback on error.

4. **"Everyone" Expansion**: Done at API level (`/api/daily`) rather than database level for simpler schema.

5. **Client Components**: Most pages are client components (`'use client'`) for interactivity. API routes handle data fetching.
