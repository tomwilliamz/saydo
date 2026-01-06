-- Migration: Allow placeholder schedule entries
-- day_of_week = -1 means "in swimlane but not scheduled on any specific day"
-- This allows activities to appear in a person's schedule grid without any days checked

-- Drop the existing constraint
ALTER TABLE schedule DROP CONSTRAINT IF EXISTS schedule_day_of_week_check;

-- Add new constraint that allows -1 (placeholder) or 0-6 (real days)
ALTER TABLE schedule ADD CONSTRAINT schedule_day_of_week_check
  CHECK (day_of_week BETWEEN -1 AND 6);

-- Also update week_of_cycle constraint if it exists (placeholders use week_of_cycle = 0)
ALTER TABLE schedule DROP CONSTRAINT IF EXISTS schedule_week_of_cycle_check;

-- Allow week_of_cycle to be 0 (placeholder) or 1-4 (real weeks)
ALTER TABLE schedule ADD CONSTRAINT schedule_week_of_cycle_check
  CHECK (week_of_cycle BETWEEN 0 AND 4);
