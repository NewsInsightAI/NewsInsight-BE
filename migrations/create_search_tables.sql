-- Create search_history table for user search history
CREATE TABLE IF NOT EXISTS search_history (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    search_query VARCHAR(500) NOT NULL,
    search_count INTEGER DEFAULT 1,
    last_searched_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, search_query)
);

-- Create trending_searches table for popular searches
CREATE TABLE IF NOT EXISTS trending_searches (
    id SERIAL PRIMARY KEY,
    search_query VARCHAR(500) NOT NULL UNIQUE,
    search_count INTEGER DEFAULT 1,
    popularity_score DECIMAL(10,2) DEFAULT 0.0,
    last_searched_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create popular_tags table for trending hashtags
CREATE TABLE IF NOT EXISTS popular_tags (
    id SERIAL PRIMARY KEY,
    tag_name VARCHAR(100) NOT NULL UNIQUE,
    tag_count INTEGER DEFAULT 1,
    popularity_score DECIMAL(10,2) DEFAULT 0.0,
    last_used_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_search_history_user_id ON search_history(user_id);
CREATE INDEX IF NOT EXISTS idx_search_history_last_searched ON search_history(last_searched_at DESC);
CREATE INDEX IF NOT EXISTS idx_trending_searches_popularity ON trending_searches(popularity_score DESC);
CREATE INDEX IF NOT EXISTS idx_trending_searches_last_searched ON trending_searches(last_searched_at DESC);
CREATE INDEX IF NOT EXISTS idx_popular_tags_popularity ON popular_tags(popularity_score DESC);
CREATE INDEX IF NOT EXISTS idx_popular_tags_last_used ON popular_tags(last_used_at DESC);

-- Add comments
COMMENT ON TABLE search_history IS 'User search history tracking';
COMMENT ON TABLE trending_searches IS 'Global trending search queries';
COMMENT ON TABLE popular_tags IS 'Popular hashtags and tags';

COMMENT ON COLUMN search_history.search_count IS 'Number of times user searched this query';
COMMENT ON COLUMN trending_searches.popularity_score IS 'Calculated popularity score based on search frequency and recency';
COMMENT ON COLUMN popular_tags.popularity_score IS 'Calculated popularity score based on usage frequency and recency';
