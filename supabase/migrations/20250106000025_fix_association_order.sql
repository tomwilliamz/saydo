-- Fix the associate_precreated_user function to update related tables FIRST
-- before updating the users table (to avoid foreign key constraint violations)

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

  -- Update all related tables FIRST (before changing users.id)
  UPDATE family_members SET user_id = v_new_id WHERE user_id = p_old_id;
  UPDATE schedule SET user_id = v_new_id WHERE user_id = p_old_id;
  UPDATE completions SET user_id = v_new_id WHERE user_id = p_old_id;
  UPDATE long_term_tasks SET user_id = v_new_id WHERE user_id = p_old_id;
  UPDATE activities SET user_id = v_new_id WHERE user_id = p_old_id;
  UPDATE devices SET user_id = v_new_id WHERE user_id = p_old_id;

  -- Now update the user's id (no more FK references to old id)
  UPDATE users SET id = v_new_id WHERE users.id = p_old_id;

  -- Return the updated user
  RETURN QUERY
  SELECT u.id, u.email, u.display_name, u.avatar_url, u.cycle_weeks, u.cycle_start_date, u.is_superadmin, u.created_at
  FROM users u WHERE u.id = v_new_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
