-- Make foreign key constraints deferrable to allow atomic user ID swaps
-- This allows us to update user IDs within a transaction without constraint violations

-- First, clean up any orphaned records that reference non-existent users
DELETE FROM devices WHERE user_id IS NOT NULL AND user_id NOT IN (SELECT id FROM users);
DELETE FROM family_members WHERE user_id NOT IN (SELECT id FROM users);
DELETE FROM schedule WHERE user_id IS NOT NULL AND user_id NOT IN (SELECT id FROM users);
DELETE FROM completions WHERE user_id IS NOT NULL AND user_id NOT IN (SELECT id FROM users);
DELETE FROM long_term_tasks WHERE user_id IS NOT NULL AND user_id NOT IN (SELECT id FROM users);
DELETE FROM activities WHERE user_id IS NOT NULL AND user_id NOT IN (SELECT id FROM users);

-- Drop and recreate family_members FK as deferrable
ALTER TABLE family_members DROP CONSTRAINT IF EXISTS family_members_user_id_fkey;
ALTER TABLE family_members ADD CONSTRAINT family_members_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  DEFERRABLE INITIALLY DEFERRED;

-- Drop and recreate schedule FK as deferrable
ALTER TABLE schedule DROP CONSTRAINT IF EXISTS schedule_user_id_fkey;
ALTER TABLE schedule ADD CONSTRAINT schedule_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  DEFERRABLE INITIALLY DEFERRED;

-- Drop and recreate completions FK as deferrable
ALTER TABLE completions DROP CONSTRAINT IF EXISTS completions_user_id_fkey;
ALTER TABLE completions ADD CONSTRAINT completions_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  DEFERRABLE INITIALLY DEFERRED;

-- Drop and recreate long_term_tasks FK as deferrable
ALTER TABLE long_term_tasks DROP CONSTRAINT IF EXISTS long_term_tasks_user_id_fkey;
ALTER TABLE long_term_tasks ADD CONSTRAINT long_term_tasks_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  DEFERRABLE INITIALLY DEFERRED;

-- Drop and recreate activities FK as deferrable
ALTER TABLE activities DROP CONSTRAINT IF EXISTS activities_user_id_fkey;
ALTER TABLE activities ADD CONSTRAINT activities_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  DEFERRABLE INITIALLY DEFERRED;

-- Drop and recreate devices FK as deferrable
ALTER TABLE devices DROP CONSTRAINT IF EXISTS devices_user_id_fkey;
ALTER TABLE devices ADD CONSTRAINT devices_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  DEFERRABLE INITIALLY DEFERRED;
