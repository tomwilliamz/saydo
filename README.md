# SayDo

**Say what you'll do. Do what you say.**

SayDo is a family activity tracker that helps households manage daily tasks, chores, and personal goals. Track what you commit to doing each day and measure your follow-through with a simple "Say/Do ratio."

## Features

### Daily Task Tracking
- Schedule recurring activities across four categories: **Home**, **Brain**, **Body**, and **Downtime**
- Track completion status with start/stop timers
- Defer tasks to another day when life gets in the way
- Add ad-hoc activities on the fly

### Family Collaboration
- Create families and invite members with a simple code
- **Personal activities**: Individual tasks that only you see
- **Family chores (Rota)**: Rotating responsibilities that cycle through family members on a configurable schedule (1-8 weeks)

### Leaderboard & Stats
- Daily and weekly Say/Do ratio tracking
- Visual charts showing completion trends over time
- Tied rankings get the same medal (fairness matters!)
- Time investment breakdowns by category

### Multi-Device Support
- Register multiple devices per user
- Send alerts between family devices
- Real-time online status indicators

## Tech Stack

- **Frontend**: Next.js 14, React, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes
- **Database**: Supabase (PostgreSQL with Row Level Security)
- **Auth**: Supabase Auth (Google OAuth)
- **Charts**: Recharts
- **Hosting**: Vercel

## Getting Started

### Prerequisites
- Node.js 18+
- A Supabase project

### Setup

1. Clone the repository:
   ```bash
   git clone https://github.com/tomwilliamz/saydo.git
   cd saydo
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   ```bash
   cp .env.example .env.local
   ```

   Add your Supabase credentials:
   ```
   NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   ```

4. Run database migrations:
   ```bash
   npx supabase db push
   ```

5. Start the development server:
   ```bash
   npm run dev
   ```

6. Open [http://localhost:3000](http://localhost:3000)

## Screenshots

*Coming soon*

## Philosophy

The name "SayDo" reflects the core principle: **accountability through transparency**.

- **Say**: Commit to what you'll accomplish today
- **Do**: Complete your commitments
- **Ratio**: Your Say/Do percentage shows how well you follow through

It's not about perfection—it's about building awareness and gradually improving your reliability to yourself and your family.

## License

MIT

---

Built with caffeine and Claude Code
