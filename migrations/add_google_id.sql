-- Add google_id column to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS google_id VARCHAR(255) UNIQUE;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_users_google_id ON users(google_id);

-- Optional: Allow password to be NULL for OAuth users
-- Uncomment the line below if you want to allow NULL passwords
-- ALTER TABLE users ALTER COLUMN password DROP NOT NULL;
