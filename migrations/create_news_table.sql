-- Migration: Create news and related tables
-- This creates the tables needed for news management system

-- Create news table
CREATE TABLE IF NOT EXISTS news (
    id SERIAL PRIMARY KEY,
    title VARCHAR(500) NOT NULL,
    content TEXT NOT NULL,
    excerpt TEXT,
    slug VARCHAR(600) UNIQUE NOT NULL,
    featured_image VARCHAR(500),
    category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
    status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
    published_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    view_count INTEGER DEFAULT 0,
    hashed_id VARCHAR(32) UNIQUE NOT NULL
);

-- Create news_authors table for many-to-many relationship
CREATE TABLE IF NOT EXISTS news_authors (
    id SERIAL PRIMARY KEY,
    news_id INTEGER REFERENCES news(id) ON DELETE CASCADE,
    author_name VARCHAR(255) NOT NULL,
    location VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(news_id, author_name, location)
);

-- Create news_tags table for many-to-many relationship
CREATE TABLE IF NOT EXISTS news_tags (
    id SERIAL PRIMARY KEY,
    news_id INTEGER REFERENCES news(id) ON DELETE CASCADE,
    tag_name VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(news_id, tag_name)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_news_status ON news(status);
CREATE INDEX IF NOT EXISTS idx_news_published_at ON news(published_at);
CREATE INDEX IF NOT EXISTS idx_news_category_id ON news(category_id);
CREATE INDEX IF NOT EXISTS idx_news_created_by ON news(created_by);
CREATE INDEX IF NOT EXISTS idx_news_hashed_id ON news(hashed_id);
CREATE INDEX IF NOT EXISTS idx_news_slug ON news(slug);
CREATE INDEX IF NOT EXISTS idx_news_authors_news_id ON news_authors(news_id);
CREATE INDEX IF NOT EXISTS idx_news_tags_news_id ON news_tags(news_id);

-- Create trigger to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_news_updated_at 
    BEFORE UPDATE ON news 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add comments for documentation
COMMENT ON TABLE news IS 'Main news articles table';
COMMENT ON TABLE news_authors IS 'Authors associated with news articles';
COMMENT ON TABLE news_tags IS 'Tags associated with news articles';
COMMENT ON COLUMN news.hashed_id IS 'Unique hashed identifier for URLs';
COMMENT ON COLUMN news.status IS 'Publication status: draft, published, or archived';
COMMENT ON COLUMN news_authors.location IS 'Location/city where the author is based';
