-- Migration: Seed activities from Thomas's spreadsheet
-- These activities will be added to the first user's library (Thomas)

-- First, get the user ID for Thomas (first user in the system)
DO $$
DECLARE
  thomas_id UUID;
BEGIN
  -- Get Thomas's user ID (assuming first user created)
  SELECT id INTO thomas_id FROM users WHERE display_name ILIKE '%Thomas%' OR display_name ILIKE '%Tom%' LIMIT 1;

  -- If no Thomas found, use the first user
  IF thomas_id IS NULL THEN
    SELECT id INTO thomas_id FROM users ORDER BY created_at LIMIT 1;
  END IF;

  -- Only proceed if we have a user
  IF thomas_id IS NOT NULL THEN
    -- Home activities
    INSERT INTO activities (name, type, default_minutes, user_id, is_active) VALUES
      ('Rabbit', 'Home', 5, thomas_id, true),
      ('Folding', 'Home', 10, thomas_id, true),
      ('Laundry', 'Home', 5, thomas_id, true),
      ('Clean upstairs bathroom', 'Home', 20, thomas_id, true),
      ('Clean downstairs bathroom', 'Home', 20, thomas_id, true),
      ('Vacuum & tidy front room', 'Home', 10, thomas_id, true),
      ('Vacuum & tidy dining room', 'Home', 10, thomas_id, true),
      ('Vacuum stairs & landing', 'Home', 5, thomas_id, true),
      ('Vacuum own bedrooms', 'Home', 15, thomas_id, true),
      ('Purge fridge & menu', 'Home', 30, thomas_id, true),
      ('Grocery shopping', 'Home', 30, thomas_id, true),
      ('Deep clean kitchen', 'Home', 30, thomas_id, true),
      ('Tidy basement', 'Home', 30, thomas_id, true),
      ('Change bed sheets - Thomas', 'Home', 10, thomas_id, true),
      ('Change bed sheets - Boys', 'Home', 15, thomas_id, true),
      ('Outside (mow, weed, rake)', 'Home', 60, thomas_id, true)
    ON CONFLICT DO NOTHING;

    -- Brain activities
    INSERT INTO activities (name, type, default_minutes, user_id, is_active) VALUES
      ('D&D', 'Brain', 60, thomas_id, true),
      ('Science bowl', 'Brain', 60, thomas_id, true),
      ('Cello practice', 'Brain', 20, thomas_id, true),
      ('Cello MYS', 'Brain', 120, thomas_id, true),
      ('Cello lesson', 'Brain', 45, thomas_id, true),
      ('Math practice', 'Brain', 30, thomas_id, true),
      ('Robotics', 'Brain', 90, thomas_id, true),
      ('Guitar', 'Brain', 60, thomas_id, true)
    ON CONFLICT DO NOTHING;

    -- Body activities
    INSERT INTO activities (name, type, default_minutes, user_id, is_active) VALUES
      ('Squash', 'Body', 90, thomas_id, true),
      ('Stretches for Thomas', 'Body', 15, thomas_id, true),
      ('Family Hike', 'Body', 120, thomas_id, true),
      ('Ivor exercise', 'Body', 60, thomas_id, true),
      ('Axel exercise', 'Body', 60, thomas_id, true)
    ON CONFLICT DO NOTHING;

    -- Downtime activities
    INSERT INTO activities (name, type, default_minutes, user_id, is_active) VALUES
      ('Video Downtime', 'Downtime', 30, thomas_id, true),
      ('Family Video / Family Read', 'Downtime', 30, thomas_id, true),
      ('Non video downtime', 'Downtime', 30, thomas_id, true)
    ON CONFLICT DO NOTHING;

    RAISE NOTICE 'Activities seeded for user %', thomas_id;
  ELSE
    RAISE NOTICE 'No user found to seed activities';
  END IF;
END $$;
