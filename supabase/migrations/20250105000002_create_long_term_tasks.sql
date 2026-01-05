-- Long Term Tasks table
CREATE TABLE long_term_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  person TEXT NOT NULL CHECK (person IN ('Thomas', 'Ivor', 'Axel')),
  title TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('Home', 'Brain', 'Body', 'Downtime')),
  due_date DATE,
  default_estimate_minutes INTEGER,
  total_time_spent_minutes INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  current_session_started_at TIMESTAMPTZ
);

-- Long Term Task Sessions table (history of work sessions)
CREATE TABLE long_term_task_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES long_term_tasks(id) ON DELETE CASCADE,
  started_at TIMESTAMPTZ NOT NULL,
  ended_at TIMESTAMPTZ,
  duration_minutes INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for common queries
CREATE INDEX idx_long_term_tasks_person_status ON long_term_tasks(person, status);
CREATE INDEX idx_long_term_task_sessions_task_id ON long_term_task_sessions(task_id);
