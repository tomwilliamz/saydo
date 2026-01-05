-- Fix user creation: use a SECURITY DEFINER function to bypass RLS when creating users
-- This allows any authenticated user to pre-create users for their family

-- Create function to insert a user bypassing RLS
CREATE OR REPLACE FUNCTION create_user(
  p_email TEXT,
  p_display_name TEXT,
  p_avatar_url TEXT DEFAULT NULL,
  p_cycle_weeks INTEGER DEFAULT 1
)
RETURNS TABLE (
  id UUID,
  email TEXT,
  display_name TEXT,
  avatar_url TEXT,
  cycle_weeks INTEGER,
  cycle_start_date DATE,
  is_superadmin BOOLEAN,
  created_at TIMESTAMPTZ
) AS $$
DECLARE
  new_id UUID := gen_random_uuid();
BEGIN
  -- Verify caller is authenticated
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Check if user with this email already exists
  IF EXISTS (SELECT 1 FROM users u WHERE u.email = LOWER(p_email)) THEN
    RAISE EXCEPTION 'User with this email already exists';
  END IF;

  -- Insert the new user
  INSERT INTO users (id, email, display_name, avatar_url, cycle_weeks, cycle_start_date)
  VALUES (new_id, LOWER(TRIM(p_email)), TRIM(p_display_name), p_avatar_url, p_cycle_weeks, CURRENT_DATE);

  -- Return the created user
  RETURN QUERY
  SELECT u.id, u.email, u.display_name, u.avatar_url, u.cycle_weeks, u.cycle_start_date, u.is_superadmin, u.created_at
  FROM users u WHERE u.id = new_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Also update the SELECT policy to let users read family members (even pre-created ones)
DROP POLICY IF EXISTS "Users can read family members profiles" ON users;
CREATE POLICY "Users can read family members profiles" ON users
  FOR SELECT USING (
    auth.uid() = id
    OR is_superadmin()
    OR EXISTS (
      SELECT 1 FROM family_members fm1
      JOIN family_members fm2 ON fm1.family_id = fm2.family_id
      WHERE fm1.user_id = auth.uid() AND fm2.user_id = users.id
    )
  );
