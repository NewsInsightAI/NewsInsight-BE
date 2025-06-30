-- Create reading history table
CREATE TABLE IF NOT EXISTS reading_history (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    news_id INTEGER NOT NULL REFERENCES news(id) ON DELETE CASCADE,
    read_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    read_duration INTEGER DEFAULT 0, -- in seconds
    read_percentage DECIMAL(5,2) DEFAULT 0.0, -- percentage of article read
    
    -- Allow multiple reads of same article by same user (for tracking)
    UNIQUE(user_id, news_id, read_at)
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_reading_history_user_id ON reading_history(user_id);
CREATE INDEX IF NOT EXISTS idx_reading_history_news_id ON reading_history(news_id);
CREATE INDEX IF NOT EXISTS idx_reading_history_read_at ON reading_history(read_at);
CREATE INDEX IF NOT EXISTS idx_reading_history_user_read_at ON reading_history(user_id, read_at);
