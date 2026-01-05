-- Fix infinite recursion in family_members table RLS policy
-- The solution is to use a SECURITY DEFINER function that bypasses RLS

-- Create a helper function to check family membership (bypasses RLS)
CREATE OR REPLACE FUNCTION is_family_member(p_family_id UUID, p_user_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM family_members
    WHERE family_id = p_family_id AND user_id = p_user_id
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Drop all existing policies on family_members
DROP POLICY IF EXISTS "Can read family memberships" ON family_members;
DROP POLICY IF EXISTS "Users can read own memberships" ON family_members;
DROP POLICY IF EXISTS "Users can read co-member memberships" ON family_members;
DROP POLICY IF EXISTS "Can join families" ON family_members;
DROP POLICY IF EXISTS "Can leave families" ON family_members;

-- Recreate policies using the helper function
CREATE POLICY "Users can read family memberships" ON family_members
  FOR SELECT USING (
    user_id = auth.uid() OR
    is_family_member(family_id, auth.uid())
  );

CREATE POLICY "Users can join families" ON family_members
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can leave families" ON family_members
  FOR DELETE USING (user_id = auth.uid());

-- Also fix users table to allow reading family member profiles
DROP POLICY IF EXISTS "Users can read family members profiles" ON users;

-- Create helper function to check if two users share a family
CREATE OR REPLACE FUNCTION shares_family_with(p_user_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM family_members fm1
    JOIN family_members fm2 ON fm1.family_id = fm2.family_id
    WHERE fm1.user_id = auth.uid() AND fm2.user_id = p_user_id
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE POLICY "Users can read family members profiles" ON users
  FOR SELECT USING (
    id = auth.uid() OR shares_family_with(id)
  );
