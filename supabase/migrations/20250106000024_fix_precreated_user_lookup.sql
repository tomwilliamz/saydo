-- Fix pre-created user lookup: use a SECURITY DEFINER function to bypass RLS
-- when looking up pre-created users by email during association

-- Create function to find a pre-created user by email (bypasses RLS)
CREATE OR REPLACE FUNCTION find_precreated_user_by_email(p_email TEXT)
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
BEGIN
  -- Verify caller is authenticated
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Return the user if found (pre-created users have id != auth.uid())
  RETURN QUERY
  SELECT u.id, u.email, u.display_name, u.avatar_url, u.cycle_weeks, u.cycle_start_date, u.is_superadmin, u.created_at
  FROM users u WHERE u.email = LOWER(p_email);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to associate a pre-created user with the authenticated user
-- This updates the pre-created user's id to the auth user's id
CREATE OR REPLACE FUNCTION associate_precreated_user(p_old_id UUID)
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
  v_new_id UUID := auth.uid();
BEGIN
  -- Verify caller is authenticated
  IF v_new_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Verify the old user exists and hasn't been associated yet
  IF NOT EXISTS (SELECT 1 FROM users u WHERE u.id = p_old_id) THEN
    RAISE EXCEPTION 'User not found';
  END IF;

  -- Check if auth user already has a profile
  IF EXISTS (SELECT 1 FROM users u WHERE u.id = v_new_id) THEN
    RAISE EXCEPTION 'Profile already exists for this auth user';
  END IF;

  -- Update the user's id to the auth user's id
  UPDATE users SET id = v_new_id WHERE users.id = p_old_id;

  -- Update all related tables
  UPDATE family_members SET user_id = v_new_id WHERE user_id = p_old_id;
  UPDATE schedule SET user_id = v_new_id WHERE user_id = p_old_id;
  UPDATE completions SET user_id = v_new_id WHERE user_id = p_old_id;
  UPDATE long_term_tasks SET user_id = v_new_id WHERE user_id = p_old_id;
  UPDATE activities SET user_id = v_new_id WHERE user_id = p_old_id;

  -- Return the updated user
  RETURN QUERY
  SELECT u.id, u.email, u.display_name, u.avatar_url, u.cycle_weeks, u.cycle_start_date, u.is_superadmin, u.created_at
  FROM users u WHERE u.id = v_new_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
