-- Create provinces table
CREATE TABLE IF NOT EXISTS provinces (
    id VARCHAR(2) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create regencies (cities/kabupaten) table
CREATE TABLE IF NOT EXISTS regencies (
    id VARCHAR(4) PRIMARY KEY,
    province_id VARCHAR(2) NOT NULL,
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (province_id) REFERENCES provinces(id) ON DELETE CASCADE
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_regencies_province_id ON regencies(province_id);
CREATE INDEX IF NOT EXISTS idx_regencies_name ON regencies(name);
CREATE INDEX IF NOT EXISTS idx_provinces_name ON provinces(name);
