-- Update default rota_cycle_weeks to 4 and update existing families
ALTER TABLE families ALTER COLUMN rota_cycle_weeks SET DEFAULT 4;

UPDATE families SET rota_cycle_weeks = 4 WHERE rota_cycle_weeks = 2 OR rota_cycle_weeks IS NULL;
