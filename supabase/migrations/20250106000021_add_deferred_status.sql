-- Update completions status constraint to include 'deferred' and 'stopped'
-- Drop the existing constraint and recreate with new values

ALTER TABLE completions DROP CONSTRAINT IF EXISTS completions_status_check;

ALTER TABLE completions ADD CONSTRAINT completions_status_check
  CHECK (status IN ('started', 'done', 'blocked', 'skipped', 'deferred', 'stopped'));
