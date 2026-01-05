-- Add elapsed_ms tracking for precise pause/resume (like daily tasks)
ALTER TABLE long_term_tasks ADD COLUMN elapsed_ms BIGINT NOT NULL DEFAULT 0;

-- Migrate existing data (convert minutes to ms)
UPDATE long_term_tasks SET elapsed_ms = total_time_spent_minutes * 60 * 1000;
