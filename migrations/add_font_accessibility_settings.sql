-- Add font accessibility settings to profile table
-- This adds support for OpenDyslexic font preference and High Contrast mode

ALTER TABLE profile 
ADD COLUMN open_dyslexic_enabled BOOLEAN DEFAULT FALSE,
ADD COLUMN high_contrast_enabled BOOLEAN DEFAULT FALSE;

-- Add comments for documentation
COMMENT ON COLUMN profile.open_dyslexic_enabled IS 'User preference for OpenDyslexic font for accessibility (dyslexia support)';
COMMENT ON COLUMN profile.high_contrast_enabled IS 'User preference for high contrast mode for accessibility (visual impairment support)';
