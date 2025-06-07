-- Migration: Add personal data fields to profile table
-- This script adds last_education, work_experience, and cv_file columns

ALTER TABLE profile 
ADD COLUMN IF NOT EXISTS last_education VARCHAR(50),
ADD COLUMN IF NOT EXISTS work_experience TEXT,
ADD COLUMN IF NOT EXISTS cv_file VARCHAR(255);

-- Add comment for documentation
COMMENT ON COLUMN profile.last_education IS 'Last education level (SD, SMP, SMA, D1, D2, D3, D4, S1, S2, S3)';
COMMENT ON COLUMN profile.work_experience IS 'Work experience description';
COMMENT ON COLUMN profile.cv_file IS 'Path to uploaded CV file';
