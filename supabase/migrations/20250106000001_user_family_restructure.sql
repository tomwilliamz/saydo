-- Migration: Restructure Person/Family System
-- This is a breaking migration - requires fresh start (per plan)

-- ============================================
-- STEP 1: Create new tables
-- ============================================

-- Users table (extends Supabase auth)
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  avatar_url TEXT,
  cycle_weeks INTEGER DEFAULT 1 CHECK (cycle_weeks BETWEEN 1 AND 4),
  cycle_start_date DATE DEFAULT CURRENT_DATE,
  is_superadmin BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Families (groups of users)
CREATE TABLE families (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  invite_code TEXT UNIQUE DEFAULT substr(gen_random_uuid()::text, 1, 8),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Family membership (many-to-many)
CREATE TABLE family_members (
  family_id UUID REFERENCES families(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (family_id, user_id)
);

-- ============================================
-- STEP 2: Migrate activities table
-- ============================================

-- Add new columns to activities
ALTER TABLE activities
  ADD COLUMN user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  ADD COLUMN family_id UUID REFERENCES families(id) ON DELETE CASCADE,
  ADD COLUMN is_active BOOLEAN DEFAULT true;

-- Add constraint: either user_id OR family_id must be set, not both
-- (Will add after migration of existing data, for now allow NULL for both)

-- ============================================
-- STEP 3: Migrate schedule table
-- ============================================

-- Add user_id column to schedule (replaces person text)
ALTER TABLE schedule
  ADD COLUMN user_id UUID REFERENCES users(id) ON DELETE CASCADE;

-- ============================================
-- STEP 4: Migrate completions table
-- ============================================

-- Add user_id and label columns to completions
ALTER TABLE completions
  ADD COLUMN user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  ADD COLUMN label TEXT;

-- ============================================
-- STEP 5: Migrate long_term_tasks table
-- ============================================

-- Add user_id column to long_term_tasks
ALTER TABLE long_term_tasks
  ADD COLUMN user_id UUID REFERENCES users(id) ON DELETE CASCADE;

-- ============================================
-- STEP 6: Create indexes
-- ============================================

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_family_members_user ON family_members(user_id);
CREATE INDEX idx_family_members_family ON family_members(family_id);
CREATE INDEX idx_families_invite_code ON families(invite_code);
CREATE INDEX idx_activities_user ON activities(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX idx_activities_family ON activities(family_id) WHERE family_id IS NOT NULL;
CREATE INDEX idx_schedule_user ON schedule(user_id);
CREATE INDEX idx_completions_user ON completions(user_id);
CREATE INDEX idx_completions_user_date ON completions(user_id, date);
CREATE INDEX idx_long_term_tasks_user ON long_term_tasks(user_id);

-- ============================================
-- STEP 7: Row Level Security
-- ============================================

-- Enable RLS on new tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE families ENABLE ROW LEVEL SECURITY;
ALTER TABLE family_members ENABLE ROW LEVEL SECURITY;

-- Users: Can read own profile, superadmins can read all
CREATE POLICY "Users can read own profile" ON users
  FOR SELECT USING (
    auth.uid() = id OR
    EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.is_superadmin = true)
  );

CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON users
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Families: Members can read their families
CREATE POLICY "Family members can read family" ON families
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM family_members fm WHERE fm.family_id = id AND fm.user_id = auth.uid()) OR
    EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.is_superadmin = true)
  );

-- Anyone can read family by invite code (for joining)
CREATE POLICY "Anyone can read family by invite code" ON families
  FOR SELECT USING (invite_code IS NOT NULL);

CREATE POLICY "Authenticated users can create families" ON families
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Family members: Can read memberships of families they belong to
CREATE POLICY "Can read family memberships" ON family_members
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM family_members fm2 WHERE fm2.family_id = family_id AND fm2.user_id = auth.uid()) OR
    EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.is_superadmin = true)
  );

CREATE POLICY "Can join families" ON family_members
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Can leave families" ON family_members
  FOR DELETE USING (auth.uid() = user_id);

-- Activities: Owner or family member can access
CREATE POLICY "Activity access" ON activities
  FOR ALL USING (
    user_id = auth.uid() OR
    EXISTS (SELECT 1 FROM family_members fm WHERE fm.family_id = activities.family_id AND fm.user_id = auth.uid()) OR
    EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.is_superadmin = true)
  );

-- Schedule: User can access own schedule or family members' schedules
CREATE POLICY "Schedule access" ON schedule
  FOR ALL USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM family_members fm1
      JOIN family_members fm2 ON fm1.family_id = fm2.family_id
      WHERE fm1.user_id = auth.uid() AND fm2.user_id = schedule.user_id
    ) OR
    EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.is_superadmin = true)
  );

-- Completions: User can access own or family members' completions
CREATE POLICY "Completions access" ON completions
  FOR ALL USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM family_members fm1
      JOIN family_members fm2 ON fm1.family_id = fm2.family_id
      WHERE fm1.user_id = auth.uid() AND fm2.user_id = completions.user_id
    ) OR
    EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.is_superadmin = true)
  );

-- Long term tasks: User can access own or family members' tasks
CREATE POLICY "Long term tasks access" ON long_term_tasks
  FOR ALL USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM family_members fm1
      JOIN family_members fm2 ON fm1.family_id = fm2.family_id
      WHERE fm1.user_id = auth.uid() AND fm2.user_id = long_term_tasks.user_id
    ) OR
    EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.is_superadmin = true)
  );

-- ============================================
-- STEP 8: Drop old user_profiles table
-- ============================================

DROP TABLE IF EXISTS user_profiles;

-- ============================================
-- STEP 9: Add activity owner constraint
-- ============================================

-- Add constraint after tables are set up
-- Activities must have either user_id OR family_id, not both, not neither
ALTER TABLE activities ADD CONSTRAINT activity_owner CHECK (
  (user_id IS NOT NULL AND family_id IS NULL) OR
  (user_id IS NULL AND family_id IS NOT NULL) OR
  -- Allow NULL for both during migration only (existing activities)
  (user_id IS NULL AND family_id IS NULL)
);

-- ============================================
-- STEP 10: Helper functions
-- ============================================

-- Function to get user's families
CREATE OR REPLACE FUNCTION get_user_families(p_user_id UUID)
RETURNS TABLE (
  family_id UUID,
  family_name TEXT,
  invite_code TEXT,
  member_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    f.id as family_id,
    f.name as family_name,
    f.invite_code,
    COUNT(fm2.user_id) as member_count
  FROM families f
  JOIN family_members fm ON fm.family_id = f.id
  LEFT JOIN family_members fm2 ON fm2.family_id = f.id
  WHERE fm.user_id = p_user_id
  GROUP BY f.id, f.name, f.invite_code;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get family members with their activities
CREATE OR REPLACE FUNCTION get_family_members_with_cycles(p_family_id UUID)
RETURNS TABLE (
  user_id UUID,
  display_name TEXT,
  avatar_url TEXT,
  cycle_weeks INTEGER,
  cycle_start_date DATE
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    u.id as user_id,
    u.display_name,
    u.avatar_url,
    u.cycle_weeks,
    u.cycle_start_date
  FROM users u
  JOIN family_members fm ON fm.user_id = u.id
  WHERE fm.family_id = p_family_id
  ORDER BY u.display_name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
