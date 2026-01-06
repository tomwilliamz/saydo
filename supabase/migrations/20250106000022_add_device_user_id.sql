-- Add user_id to devices table to associate devices with users
ALTER TABLE devices ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Create index for faster lookups
CREATE INDEX idx_devices_user_id ON devices(user_id);

-- Enable RLS on devices
ALTER TABLE devices ENABLE ROW LEVEL SECURITY;

-- Policy: Users can see devices owned by themselves or family members
CREATE POLICY "Users can view family devices" ON devices
  FOR SELECT
  USING (
    user_id IS NULL  -- Legacy devices without user_id (temporary)
    OR user_id = auth.uid()
    OR user_id IN (
      SELECT fm2.user_id
      FROM family_members fm1
      JOIN family_members fm2 ON fm1.family_id = fm2.family_id
      WHERE fm1.user_id = auth.uid()
    )
  );

-- Policy: Users can insert their own devices
CREATE POLICY "Users can insert own devices" ON devices
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Policy: Users can update family devices (for heartbeats when different family member logged in)
CREATE POLICY "Users can update family devices" ON devices
  FOR UPDATE
  USING (
    user_id = auth.uid()
    OR user_id IN (
      SELECT fm2.user_id
      FROM family_members fm1
      JOIN family_members fm2 ON fm1.family_id = fm2.family_id
      WHERE fm1.user_id = auth.uid()
    )
  );

-- Policy: Users can delete their own devices
CREATE POLICY "Users can delete own devices" ON devices
  FOR DELETE
  USING (user_id = auth.uid());
