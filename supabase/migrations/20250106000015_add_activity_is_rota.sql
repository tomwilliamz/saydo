-- Add is_rota column to activities table
-- Rota activities rotate through family members on a schedule
-- Personal activities are assigned to specific individuals

ALTER TABLE activities ADD COLUMN IF NOT EXISTS is_rota BOOLEAN DEFAULT FALSE;

-- For rota activities, we also need to track the assigned user per day/week
-- This is stored in schedule.user_id, but for rota activities the meaning is:
-- "which user is assigned to do this activity on this specific day"
-- rather than "whose personal schedule includes this activity"

COMMENT ON COLUMN activities.is_rota IS 'Whether this is a rotating family chore (true) or a personal activity (false)';
