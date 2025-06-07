-- Migration: Create MFA (Multi-Factor Authentication) tables
-- This script creates tables for MFA functionality

-- Create MFA settings table
CREATE TABLE IF NOT EXISTS mfa_settings (
    id SERIAL PRIMARY KEY,
    user_id INTEGER UNIQUE NOT NULL,
    is_enabled BOOLEAN DEFAULT FALSE,
    secret_key VARCHAR(32),
    backup_codes TEXT[], -- Array of backup codes
    enabled_methods TEXT[] DEFAULT '{}', -- Array of enabled methods: sms, email, totp
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Create MFA verification attempts table
CREATE TABLE IF NOT EXISTS mfa_attempts (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    method VARCHAR(20) NOT NULL, -- sms, email, totp, backup_code
    code VARCHAR(10) NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    is_used BOOLEAN DEFAULT FALSE,
    attempts INTEGER DEFAULT 0,
    max_attempts INTEGER DEFAULT 3,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Create trusted devices table
CREATE TABLE IF NOT EXISTS trusted_devices (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    device_name VARCHAR(255),
    device_fingerprint VARCHAR(255) UNIQUE NOT NULL,
    last_used_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_mfa_settings_user_id ON mfa_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_mfa_attempts_user_id ON mfa_attempts(user_id);
CREATE INDEX IF NOT EXISTS idx_mfa_attempts_expires_at ON mfa_attempts(expires_at);
CREATE INDEX IF NOT EXISTS idx_trusted_devices_user_id ON trusted_devices(user_id);
CREATE INDEX IF NOT EXISTS idx_trusted_devices_fingerprint ON trusted_devices(device_fingerprint);

-- Add comments for documentation
COMMENT ON TABLE mfa_settings IS 'Stores MFA configuration for each user';
COMMENT ON TABLE mfa_attempts IS 'Stores temporary MFA codes and verification attempts';
COMMENT ON TABLE trusted_devices IS 'Stores trusted devices that can skip MFA for a period';
