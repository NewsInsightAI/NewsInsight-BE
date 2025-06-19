-- Migration: Make username nullable for Google OAuth users
-- This allows users who register via Google to not have a username

ALTER TABLE users ALTER COLUMN username DROP NOT NULL;
ALTER TABLE users ALTER COLUMN username DROP DEFAULT;

-- Update existing Google users to have NULL username instead of auto-generated ones
-- We can identify Google users by having google_id and auto-generated usernames
UPDATE users 
SET username = NULL 
WHERE google_id IS NOT NULL 
  AND username LIKE '%@%_%'  -- Pattern matches email_timestamp format
  AND LENGTH(username) > 20; -- Likely auto-generated username

COMMENT ON COLUMN users.username IS 'Username for regular registration. NULL for Google OAuth users.';
