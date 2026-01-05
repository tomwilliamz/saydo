-- Fix infinite recursion in users table RLS policies

-- Drop the problematic policies
DROP POLICY IF EXISTS "Users can read own profile" ON users;

-- Recreate without self-referencing subquery for superadmin check
-- For now, just allow users to read their own profile
-- Superadmin access will be handled at the application level
CREATE POLICY "Users can read own profile" ON users
  FOR SELECT USING (auth.uid() = id);

-- Also allow users to read profiles of family members
CREATE POLICY "Users can read family members profiles" ON users
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM family_members fm1
      JOIN family_members fm2 ON fm1.family_id = fm2.family_id
      WHERE fm1.user_id = auth.uid() AND fm2.user_id = users.id
    )
  );

-- Fix similar issues in other policies that reference users table for superadmin check
DROP POLICY IF EXISTS "Family members can read family" ON families;
CREATE POLICY "Family members can read family" ON families
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM family_members fm WHERE fm.family_id = id AND fm.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Can read family memberships" ON family_members;
CREATE POLICY "Can read family memberships" ON family_members
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM family_members fm2 WHERE fm2.family_id = family_id AND fm2.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Activity access" ON activities;
CREATE POLICY "Activity access" ON activities
  FOR ALL USING (
    user_id = auth.uid() OR
    user_id IS NULL OR  -- Allow access to activities without user_id (legacy)
    EXISTS (SELECT 1 FROM family_members fm WHERE fm.family_id = activities.family_id AND fm.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Schedule access" ON schedule;
CREATE POLICY "Schedule access" ON schedule
  FOR ALL USING (
    user_id = auth.uid() OR
    user_id IS NULL OR  -- Allow access to schedule without user_id (legacy)
    EXISTS (
      SELECT 1 FROM family_members fm1
      JOIN family_members fm2 ON fm1.family_id = fm2.family_id
      WHERE fm1.user_id = auth.uid() AND fm2.user_id = schedule.user_id
    )
  );

DROP POLICY IF EXISTS "Completions access" ON completions;
CREATE POLICY "Completions access" ON completions
  FOR ALL USING (
    user_id = auth.uid() OR
    user_id IS NULL OR  -- Allow access to completions without user_id (legacy)
    EXISTS (
      SELECT 1 FROM family_members fm1
      JOIN family_members fm2 ON fm1.family_id = fm2.family_id
      WHERE fm1.user_id = auth.uid() AND fm2.user_id = completions.user_id
    )
  );

DROP POLICY IF EXISTS "Long term tasks access" ON long_term_tasks;
CREATE POLICY "Long term tasks access" ON long_term_tasks
  FOR ALL USING (
    user_id = auth.uid() OR
    user_id IS NULL OR  -- Allow access to tasks without user_id (legacy)
    EXISTS (
      SELECT 1 FROM family_members fm1
      JOIN family_members fm2 ON fm1.family_id = fm2.family_id
      WHERE fm1.user_id = auth.uid() AND fm2.user_id = long_term_tasks.user_id
    )
  );
