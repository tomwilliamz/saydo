-- Add week_nicknames JSONB column to families table
-- Stores nicknames like {"1": "Rabbit", "2": "Fox", "3": "Bear", "4": "Wolf"}
ALTER TABLE families
  ADD COLUMN week_nicknames JSONB DEFAULT '{}';
