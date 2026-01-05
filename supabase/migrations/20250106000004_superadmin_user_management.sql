-- Allow superadmins to manage users

-- Create helper function to check if current user is superadmin (bypasses RLS)
CREATE OR REPLACE FUNCTION is_superadmin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid() AND is_superadmin = true
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Update users table policies to allow superadmin access
DROP POLICY IF EXISTS "Users can read own profile" ON users;
CREATE POLICY "Users can read own profile" ON users
  FOR SELECT USING (
    auth.uid() = id OR is_superadmin()
  );

-- Allow superadmins to insert new users
DROP POLICY IF EXISTS "Superadmins can create users" ON users;
CREATE POLICY "Superadmins can create users" ON users
  FOR INSERT WITH CHECK (
    auth.uid() = id OR is_superadmin()
  );

-- Allow superadmins to update any user
DROP POLICY IF EXISTS "Users can update own profile" ON users;
CREATE POLICY "Users can update own or admin update" ON users
  FOR UPDATE USING (
    auth.uid() = id OR is_superadmin()
  );

-- Allow superadmins to delete users
DROP POLICY IF EXISTS "Superadmins can delete users" ON users;
CREATE POLICY "Superadmins can delete users" ON users
  FOR DELETE USING (is_superadmin());
