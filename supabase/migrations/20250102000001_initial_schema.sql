-- Activities table
create table activities (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  type text not null check (type in ('Home', 'Brain', 'Body', 'Downtime')),
  default_minutes integer not null default 15,
  description text,
  created_at timestamp with time zone default now()
);

-- Schedule table
create table schedule (
  id uuid primary key default gen_random_uuid(),
  activity_id uuid references activities(id) on delete cascade,
  person text not null check (person in ('Thomas', 'Ivor', 'Axel', 'Everyone')),
  day_of_week integer not null check (day_of_week between 0 and 6),
  week_of_cycle integer not null check (week_of_cycle between 1 and 4),
  unique (activity_id, person, day_of_week, week_of_cycle)
);

-- Completions table
create table completions (
  id uuid primary key default gen_random_uuid(),
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
  id uuid primary key default gen_random_uuid(),
  key text unique not null,
  value text not null
);

-- Insert default cycle start date (first Monday of 2025)
insert into settings (key, value) values ('cycle_start_date', '2025-01-06');

-- Indexes for common queries
create index idx_schedule_lookup on schedule(week_of_cycle, day_of_week);
create index idx_completions_date on completions(date);
create index idx_completions_person_date on completions(person, date);
