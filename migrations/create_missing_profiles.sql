-- Migration: Create missing profiles for existing users
-- This script creates empty profiles for users who don't have one yet

INSERT INTO profile (user_id, created_at, updated_at)
SELECT u.id, NOW(), NOW()
FROM users u
LEFT JOIN profile p ON u.id = p.user_id
WHERE p.user_id IS NULL;
