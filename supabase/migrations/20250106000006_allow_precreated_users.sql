-- Allow pre-created users (users created before they sign up)
-- The foreign key to auth.users prevents this, so we need to remove it

-- Drop the foreign key constraint on users.id -> auth.users.id
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_id_fkey;

-- The id column remains a UUID primary key, but no longer requires auth.users entry
-- When a user logs in, their auth.users id will be matched to users by email
