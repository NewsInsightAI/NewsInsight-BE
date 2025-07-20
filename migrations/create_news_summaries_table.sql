-- Create news_summaries table
CREATE TABLE IF NOT EXISTS news_summaries (
    id SERIAL PRIMARY KEY,
    news_id INTEGER NOT NULL REFERENCES news(id) ON DELETE CASCADE,
    summary_text TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(news_id)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_news_summaries_news_id ON news_summaries(news_id);
