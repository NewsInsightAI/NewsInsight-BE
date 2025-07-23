-- Create fact_check_history table if not exists
CREATE TABLE IF NOT EXISTS fact_check_history (
    id SERIAL PRIMARY KEY,
    news_id INTEGER NOT NULL,
    query_text TEXT NOT NULL,
    total_claims INTEGER DEFAULT 0,
    fact_check_data JSONB,
    trust_score DECIMAL(3,2),
    is_verified BOOLEAN DEFAULT FALSE,
    language_code VARCHAR(10) DEFAULT 'id',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_fact_check_history_news_id ON fact_check_history(news_id);
CREATE INDEX IF NOT EXISTS idx_fact_check_history_created_at ON fact_check_history(created_at);

-- Add trigger to update updated_at column
CREATE OR REPLACE FUNCTION update_fact_check_history_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS trigger_update_fact_check_history_updated_at ON fact_check_history;
CREATE TRIGGER trigger_update_fact_check_history_updated_at
    BEFORE UPDATE ON fact_check_history
    FOR EACH ROW
    EXECUTE FUNCTION update_fact_check_history_updated_at();
