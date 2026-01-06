-- Add rota_start_date to families table
-- This is the Monday when Week 1 of the family rota cycle began
-- Used to calculate which week of the rota cycle we're currently in

ALTER TABLE families
  ADD COLUMN rota_start_date DATE DEFAULT '2025-01-06';

-- Set default to Jan 6, 2025 (a Monday) for existing families
UPDATE families SET rota_start_date = '2025-01-06' WHERE rota_start_date IS NULL;
