-- Migration: Fix MFA secret_key column length
-- The TOTP secret keys are typically 52+ characters long when base32 encoded
-- but the current column only allows 32 characters

-- Increase the length of secret_key column to accommodate TOTP secrets
ALTER TABLE mfa_settings ALTER COLUMN secret_key TYPE VARCHAR(100);

-- Add a comment for documentation
COMMENT ON COLUMN mfa_settings.secret_key IS 'TOTP secret key (base32 encoded, typically 52-100 characters)';
