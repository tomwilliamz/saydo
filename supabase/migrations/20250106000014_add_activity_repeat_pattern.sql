-- Migration: Add repeat_pattern to activities
-- This allows activities to have a default schedule pattern:
-- NULL = no default pattern (manual)
-- 'daily' = every day
-- 'weekdays' = Mon-Fri
-- 'weekends' = Sat-Sun
-- 'mon,wed,fri' = specific days (comma-separated day indices 0-6 where 0=Mon)

ALTER TABLE activities ADD COLUMN IF NOT EXISTS repeat_pattern TEXT DEFAULT NULL;
