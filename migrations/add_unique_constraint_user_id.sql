-- Add unique constraint to user_id in profile table
-- This allows the ON CONFLICT (user_id) clause to work properly

ALTER TABLE profile ADD CONSTRAINT profile_user_id_unique UNIQUE (user_id);
