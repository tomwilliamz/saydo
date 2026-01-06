-- Migration: Drop deprecated person column from schedule table
-- The person column is replaced by user_id (UUID reference to users table)

-- First, drop the person column from schedule
ALTER TABLE schedule DROP COLUMN IF EXISTS person;

-- Also drop from completions if it exists
ALTER TABLE completions DROP COLUMN IF EXISTS person;

-- Also drop from long_term_tasks if it exists
ALTER TABLE long_term_tasks DROP COLUMN IF EXISTS person;

-- Update the schedule RLS policy to allow NULL user_id for family activities
DROP POLICY IF EXISTS "Schedule access" ON schedule;

CREATE POLICY "Schedule access" ON schedule
  FOR ALL USING (
    -- User's own schedule entries
    user_id = auth.uid() OR
    -- Family activities (user_id is NULL) that belong to user's families
    (user_id IS NULL AND EXISTS (
      SELECT 1 FROM activities a
      JOIN family_members fm ON fm.family_id = a.family_id
      WHERE a.id = schedule.activity_id AND fm.user_id = auth.uid()
    )) OR
    -- Family members' schedule entries
    EXISTS (
      SELECT 1 FROM family_members fm1
      JOIN family_members fm2 ON fm1.family_id = fm2.family_id
      WHERE fm1.user_id = auth.uid() AND fm2.user_id = schedule.user_id
    ) OR
    -- Superadmin access
    EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.is_superadmin = true)
  );
