# Say Do Tracker - Developer Handbook

## Overview

Say Do Tracker is a family activity tracking application designed for shared household tablet use. It helps a family of three (Thomas and sons Ivor and Axel) manage daily chores, practice schedules, and activities with accountability through a "Say/Do" ratio system.

### Core Concept

- **Say**: Tasks scheduled for a person on a given day
- **Do**: Tasks actually completed
- **Say/Do Ratio**: Percentage of scheduled tasks completed (only "Done" counts; "Skipped" counts against)

### Design Theme

The app uses a **fancy dark theme** with:
- Dark gradient backgrounds (`from-gray-900 via-gray-800 to-gray-900`)
- Animated pulsing background particles
- Glass-morphism cards with subtle borders and shadows
- Person-specific color gradients (Blue for Thomas, Green for Ivor, Orange for Axel)
- Gradient buttons with glow effects

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
| Charts | Recharts |
| Effects | canvas-confetti |

---

## Project Structure

```
/src
├── app/                          # Next.js App Router pages
│   ├── page.tsx                  # Home page (person selector + progress)
│   ├── [person]/page.tsx         # Person-specific daily task view
│   ├── layout.tsx                # Root layout with AppShell
│   ├── globals.css               # Global styles + Tailwind
│   ├── login/page.tsx            # Google OAuth login
│   ├── leaderboard/page.tsx      # Trends with area chart
│   ├── admin/page.tsx            # Schedule & activity management
│   ├── auth/callback/route.ts    # OAuth callback handler
│   └── api/                      # API routes
│       ├── activities/           # CRUD for activities
│       ├── schedule/             # Schedule management
│       ├── daily/                # Daily task fetching
│       ├── completions/          # Task completion tracking
│       ├── leaderboard/          # Stats calculation
│       ├── stats/                # Period-based stats (today/week/month/all)
│       ├── trends/               # Historical trend data for charts
│       └── settings/             # App settings
├── components/                   # React components
│   ├── AppShell.tsx              # Conditional nav wrapper
│   ├── Nav.tsx                   # Top navigation bar
│   ├── DateNav.tsx               # Date navigation controls (supports darkMode)
│   ├── FilterButtons.tsx         # Person filter (All/Thomas/Ivor/Axel)
│   ├── TaskRow.tsx               # Individual task with actions (supports darkMode)
│   ├── Timer.tsx                 # Live elapsed timer (counts up from started_at)
│   ├── DurationModal.tsx         # Numpad modal for editing task duration
│   ├── PersonBadge.tsx           # Colored person indicator
│   ├── LeaderboardCard.tsx       # Person stats card
│   ├── ScheduleGrid.tsx          # 4-week schedule editor (dark themed)
│   └── ActivityForm.tsx          # Add/edit activity modal (dark themed)
├── lib/                          # Shared utilities
│   ├── supabase/                 # Supabase clients
│   │   ├── client.ts             # Browser client
│   │   ├── server.ts             # Server client (API routes)
│   │   └── middleware.ts         # Auth middleware
│   ├── types.ts                  # TypeScript interfaces
│   └── utils.ts                  # Date/cycle calculations
└── middleware.ts                 # Next.js middleware (auth)

/public
└── avatars/                      # Person avatar images (thomas.jpg, ivor.jpg, axel.jpg)

/supabase
├── config.toml                   # Supabase local config
└── migrations/                   # Database migrations
    ├── 20250102000001_initial_schema.sql
    ├── 20250102000002_seed_activities.sql
    ├── 20250102000003_seed_schedule.sql
    └── 20250103000001_add_elapsed_ms.sql
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
| elapsed_ms | bigint | Accumulated time in milliseconds (supports pause/resume) |
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

### Stats

#### `GET /api/stats?period=today|week|month|all`
Returns Say/Do stats for each person over a specific time period.

**Query Parameters**:
- `period`: `today` (default), `week`, `month`, or `all`

**Response**:
```json
{
  "period": "week",
  "startDate": "2025-01-06",
  "endDate": "2025-01-10",
  "stats": [
    {"person": "Thomas", "done": 12, "total": 15, "ratio": 0.8},
    {"person": "Ivor", "done": 10, "total": 14, "ratio": 0.71},
    {"person": "Axel", "done": 8, "total": 13, "ratio": 0.62}
  ]
}
```

---

### Trends

#### `GET /api/trends?granularity=day|week&days=30`
Returns historical trend data for charting Say/Do ratios over time.

**Query Parameters**:
- `granularity`: `day` (default) or `week`
- `days`: Number of days back to look (default: 30)

**Response**:
```json
{
  "granularity": "day",
  "days": 30,
  "trends": [
    {
      "person": "Thomas",
      "data": [
        {"label": "Jan 6", "date": "2025-01-06", "ratio": 0.85, "done": 6, "total": 7},
        {"label": "Jan 7", "date": "2025-01-07", "ratio": 1.0, "done": 5, "total": 5}
      ]
    }
  ]
}
```

Used by the Leaderboard page to render area charts.

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

### Home Page (`/`)

Person selector landing page with daily progress overview.

**Features**:
- Person avatars in circular frames with gradient borders
- Per-person progress rings showing daily completion percentage
- Period selector (Today/Week/Month/All)
- Confetti celebration when all tasks are completed
- Dark theme with animated pulsing background particles

### Person Task View (`/[person]`)

Individual person's daily task management view.

**Features**:
- Sticky header with person name and avatar
- Date navigation (previous/next day, jump to today)
- Task list with status indicators and person-specific color theme
- Action buttons based on state:

| State | Actions Available |
|-------|-------------------|
| Not started (today) | Start, Blocked, Skip |
| Not started (past) | Done, Blocked, Skip |
| Started | Timer display, Done |
| Done | "Done in X mins" (tappable to edit), Undo |
| Blocked | "Blocked", Undo |
| Skipped | "Skipped", Undo |

**Timer**:
- Client-side countdown from `started_at`
- Supports pause/resume with accumulated `elapsed_ms`
- DurationModal allows manual time entry after completion

### Leaderboard (`/leaderboard`)

Trends and accountability view with charts.

**Features**:
- Period selector tabs (Today/Week/Month/All)
- Recharts area chart showing Say/Do ratio trends over time
- Person-colored gradient fills for each trend line
- Ranked stats cards with progress bars
- Confetti on 100% completion
- Dark theme with glass-morphism cards

### Admin (`/admin`)

Schedule management interface with dark theme.

**Features**:
- Cycle start date picker
- Activity list with type badges (click to edit)
- Add new activity button (opens ActivityForm modal)
- Schedule grid:
  - Week selector (1-4) with gradient buttons
  - Click cells to cycle through: - → T → I → A → E → -
  - Auto-saves on change
- Dark theme with pulsing background particles

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

The app uses a **dark theme** with person-specific color gradients.

### Person Colors (Dark Theme)
| Person | Gradient | Chart Color |
|--------|----------|-------------|
| Thomas | Blue (`#3B82F6` → `#1E40AF`) | `#3B82F6` |
| Ivor | Green (`#22C55E` → `#15803D`) | `#22C55E` |
| Axel | Orange (`#F97316` → `#C2410C`) | `#F97316` |

### Person Colors (Component Variants)
| Person | Schedule Grid | Badge |
|--------|---------------|-------|
| Thomas | `bg-blue-500/30 text-blue-300 border-blue-500/40` | Blue gradient |
| Ivor | `bg-green-500/30 text-green-300 border-green-500/40` | Green gradient |
| Axel | `bg-orange-500/30 text-orange-300 border-orange-500/40` | Orange gradient |
| Everyone | `bg-purple-500/30 text-purple-300 border-purple-500/40` | Purple gradient |

### Activity Type Colors
| Type | Badge Style |
|------|-------------|
| Home | `bg-purple-500/20 text-purple-300` |
| Brain | `bg-yellow-500/20 text-yellow-300` |
| Body | `bg-red-500/20 text-red-300` |
| Downtime | `bg-teal-500/20 text-teal-300` |

### Status Colors (Dark Mode)
| Status | Row Background | Text |
|--------|----------------|------|
| Done | `bg-green-500/10` | Green |
| Blocked | `bg-red-500/10` | Red |
| Skipped | `bg-gray-500/10` | Gray |
| Started | Default | Timer display |

### Glass-morphism Card Style
```css
background: linear-gradient(135deg, rgba(30,41,59,0.6), rgba(15,23,42,0.8));
box-shadow: 0 25px 50px -12px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.1);
border: 1px solid rgba(255,255,255,0.1);
```

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

1. **Auth Bypass**: Currently disabled for debugging. Re-enable before production.

2. **Activity Description Modal**: Spec mentions clicking activity name shows description - not yet implemented.

3. **Time Zone Handling**: Dates are stored as `YYYY-MM-DD` strings. Ensure consistent timezone handling.

---

## Architecture Decisions

1. **No Real-time**: Simple fetch on page load. Supabase realtime subscriptions not needed for this use case.

2. **Timer State**: Kept in React state, only persisted on "Done" click. Supports pause/resume via `elapsed_ms` column.

3. **Optimistic UI**: Schedule changes update immediately, rollback on error.

4. **"Everyone" Expansion**: Done at API level (`/api/daily`) rather than database level for simpler schema.

5. **Client Components**: Most pages are client components (`'use client'`) for interactivity. API routes handle data fetching.

6. **Dark Theme First**: All components styled for dark mode with glass-morphism effects. Components support optional `darkMode` prop for flexibility.

7. **Sticky Headers with Opaque Backgrounds**: Person and date headers use fully opaque backgrounds to prevent task text from bleeding through during scroll.
