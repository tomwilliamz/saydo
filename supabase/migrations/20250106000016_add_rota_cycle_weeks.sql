-- Add rota_cycle_weeks to families table
-- This controls how many weeks the Family Chores (rota) schedule cycles through
-- Personal schedules are always 1 week

ALTER TABLE families
  ADD COLUMN rota_cycle_weeks INTEGER DEFAULT 4 CHECK (rota_cycle_weeks BETWEEN 1 AND 8);

-- Update existing families to have a default of 4 weeks
UPDATE families SET rota_cycle_weeks = 4 WHERE rota_cycle_weeks IS NULL;
