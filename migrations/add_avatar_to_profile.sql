-- Add avatar column to profile table
ALTER TABLE profile ADD COLUMN avatar TEXT;

-- Add comment to explain the column
COMMENT ON COLUMN profile.avatar IS 'Profile picture URL or path, can be from Google OAuth or uploaded by user';
