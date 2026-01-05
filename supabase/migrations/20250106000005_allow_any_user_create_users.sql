-- Allow any authenticated user to create new users (not just superadmins)
-- This is needed for the "Add User" feature where family members can pre-create accounts

DROP POLICY IF EXISTS "Superadmins can create users" ON users;
DROP POLICY IF EXISTS "Users can insert own profile" ON users;

-- Allow inserting users if:
-- 1. User is creating their own profile (id matches auth.uid()), OR
-- 2. User is authenticated (creating a pre-registered user for someone else)
CREATE POLICY "Authenticated users can create users" ON users
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL
  );
