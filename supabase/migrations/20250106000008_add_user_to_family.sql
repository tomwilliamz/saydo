-- Update create_user function to optionally add user to a family
-- Also handles case where user already exists - just adds to family

DROP FUNCTION IF EXISTS create_user(TEXT, TEXT, TEXT, INTEGER);

CREATE OR REPLACE FUNCTION create_user_in_family(
  p_email TEXT,
  p_display_name TEXT,
  p_family_id UUID,
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
  created_at TIMESTAMPTZ,
  already_existed BOOLEAN
) AS $$
DECLARE
  v_user_id UUID;
  v_already_existed BOOLEAN := false;
BEGIN
  -- Verify caller is authenticated
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Verify caller is a member of the family
  IF NOT EXISTS (SELECT 1 FROM family_members fm WHERE fm.family_id = p_family_id AND fm.user_id = auth.uid()) THEN
    RAISE EXCEPTION 'You are not a member of this family';
  END IF;

  -- Check if user with this email already exists
  SELECT u.id INTO v_user_id FROM users u WHERE u.email = LOWER(p_email);

  IF v_user_id IS NOT NULL THEN
    -- User exists - just add to family if not already a member
    v_already_existed := true;

    IF NOT EXISTS (SELECT 1 FROM family_members fm WHERE fm.family_id = p_family_id AND fm.user_id = v_user_id) THEN
      INSERT INTO family_members (family_id, user_id)
      VALUES (p_family_id, v_user_id);
    END IF;
  ELSE
    -- Create new user
    v_user_id := gen_random_uuid();
    v_already_existed := false;

    INSERT INTO users (id, email, display_name, avatar_url, cycle_weeks, cycle_start_date)
    VALUES (v_user_id, LOWER(TRIM(p_email)), TRIM(p_display_name), p_avatar_url, p_cycle_weeks, CURRENT_DATE);

    -- Add to family
    INSERT INTO family_members (family_id, user_id)
    VALUES (p_family_id, v_user_id);
  END IF;

  -- Return the user
  RETURN QUERY
  SELECT u.id, u.email, u.display_name, u.avatar_url, u.cycle_weeks, u.cycle_start_date, u.is_superadmin, u.created_at, v_already_existed
  FROM users u WHERE u.id = v_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
