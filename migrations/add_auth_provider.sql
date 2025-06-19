-- Migration to add auth_provider column to users table
-- This will help us accurately identify how users registered

ALTER TABLE users 
ADD COLUMN auth_provider VARCHAR(20) DEFAULT 'email' CHECK (auth_provider IN ('email', 'google'));

-- Update existing users based on google_id
UPDATE users 
SET auth_provider = 'google' 
WHERE google_id IS NOT NULL;

-- Update remaining users to 'email'
UPDATE users 
SET auth_provider = 'email' 
WHERE google_id IS NULL OR auth_provider IS NULL;

-- Make auth_provider NOT NULL after setting defaults
ALTER TABLE users 
ALTER COLUMN auth_provider SET NOT NULL;
