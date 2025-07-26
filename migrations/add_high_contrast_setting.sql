-- Add high contrast accessibility setting to profile table
-- This adds support for High Contrast mode preference

ALTER TABLE profile 
ADD COLUMN high_contrast_enabled BOOLEAN DEFAULT FALSE;

-- Add comment for documentation
COMMENT ON COLUMN profile.high_contrast_enabled IS 'User preference for high contrast mode for accessibility (visual impairment support)';
