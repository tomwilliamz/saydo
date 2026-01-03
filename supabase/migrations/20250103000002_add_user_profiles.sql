-- Create user_profiles table to associate auth users with family members
CREATE TABLE user_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  person text NOT NULL CHECK (person IN ('Thomas', 'Ivor', 'Axel')),
  email text NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id),
  UNIQUE(person) -- Each person can only be claimed once
);

-- Enable RLS
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read all profiles (needed to check who's claimed)
CREATE POLICY "Users can read all profiles" ON user_profiles
  FOR SELECT TO authenticated USING (true);

-- Allow authenticated users to insert their own profile (one-time)
CREATE POLICY "Users can create their own profile" ON user_profiles
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- Index for fast lookup by user_id
CREATE INDEX idx_user_profiles_user_id ON user_profiles(user_id);
