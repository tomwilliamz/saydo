-- Allow family members to update each other's profiles (display_name, avatar_url)

CREATE OR REPLACE FUNCTION update_family_member(
  p_user_id UUID,
  p_display_name TEXT DEFAULT NULL,
  p_avatar_url TEXT DEFAULT NULL
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
BEGIN
  -- Verify caller is authenticated
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Verify caller is in the same family as the target user
  IF NOT EXISTS (
    SELECT 1 FROM family_members fm1
    JOIN family_members fm2 ON fm1.family_id = fm2.family_id
    WHERE fm1.user_id = auth.uid() AND fm2.user_id = p_user_id
  ) THEN
    RAISE EXCEPTION 'You are not in the same family as this user';
  END IF;

  -- Update the user
  UPDATE users u
  SET
    display_name = COALESCE(NULLIF(TRIM(p_display_name), ''), u.display_name),
    avatar_url = CASE
      WHEN p_avatar_url IS NOT NULL THEN NULLIF(TRIM(p_avatar_url), '')
      ELSE u.avatar_url
    END
  WHERE u.id = p_user_id;

  -- Return the updated user
  RETURN QUERY
  SELECT u.id, u.email, u.display_name, u.avatar_url, u.cycle_weeks, u.cycle_start_date, u.is_superadmin, u.created_at
  FROM users u WHERE u.id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
