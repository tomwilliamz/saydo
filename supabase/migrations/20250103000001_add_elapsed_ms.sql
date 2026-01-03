-- Add elapsed_ms column to track accumulated time across stop/resume cycles
ALTER TABLE completions ADD COLUMN IF NOT EXISTS elapsed_ms bigint;
