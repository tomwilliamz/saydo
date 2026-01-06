-- Add deferred_to column to completions for defer feature
ALTER TABLE completions ADD COLUMN IF NOT EXISTS deferred_to DATE;

-- Add index for querying deferred tasks by target date
CREATE INDEX IF NOT EXISTS idx_completions_deferred_to ON completions(deferred_to) WHERE deferred_to IS NOT NULL;

-- Note: status check constraint will include 'deferred' as a valid value
-- The existing check allows any text, we just need to handle it in code
