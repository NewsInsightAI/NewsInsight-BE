-- Migration: Update news schema with improved structure
-- This migration improves the news table structure based on new requirements

-- First, let's add the missing columns to the existing news table
ALTER TABLE news 
ADD COLUMN IF NOT EXISTS summary TEXT,
ADD COLUMN IF NOT EXISTS total_shares INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_reports INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_bookmarks INTEGER DEFAULT 0;

-- Create tags table (separate from news_tags for better normalization)
CREATE TABLE IF NOT EXISTS tags (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    slug VARCHAR(120) UNIQUE NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Update news_tags to reference the tags table
-- First drop the existing constraint if it exists
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints 
               WHERE constraint_name = 'news_tags_news_id_tag_name_key') THEN
        ALTER TABLE news_tags DROP CONSTRAINT news_tags_news_id_tag_name_key;
    END IF;
END $$;

-- Add tag_id column and update structure
ALTER TABLE news_tags 
ADD COLUMN IF NOT EXISTS tag_id INTEGER REFERENCES tags(id) ON DELETE CASCADE;

-- Create news_metrics table for better performance on stats
CREATE TABLE IF NOT EXISTS news_metrics (
    id SERIAL PRIMARY KEY,
    news_id INTEGER UNIQUE REFERENCES news(id) ON DELETE CASCADE,
    view_count INTEGER DEFAULT 0,
    share_count INTEGER DEFAULT 0,
    bookmark_count INTEGER DEFAULT 0,
    comment_count INTEGER DEFAULT 0,
    report_count INTEGER DEFAULT 0,
    last_viewed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create reports table for content moderation
CREATE TABLE IF NOT EXISTS news_reports (
    id SERIAL PRIMARY KEY,
    news_id INTEGER REFERENCES news(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    reason VARCHAR(100) NOT NULL,
    description TEXT,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'dismissed', 'action_taken')),
    reviewed_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    reviewed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create shares table to track sharing activity
CREATE TABLE IF NOT EXISTS news_shares (
    id SERIAL PRIMARY KEY,
    news_id INTEGER REFERENCES news(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    platform VARCHAR(50), -- 'facebook', 'twitter', 'whatsapp', 'telegram', 'copy_link', etc.
    shared_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ip_address INET
);

-- Migrate existing view_count to news_metrics
INSERT INTO news_metrics (news_id, view_count, created_at, updated_at)
SELECT id, COALESCE(view_count, 0), created_at, updated_at 
FROM news 
ON CONFLICT (news_id) DO NOTHING;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_news_summary ON news USING gin(to_tsvector('indonesian', summary));
CREATE INDEX IF NOT EXISTS idx_news_total_shares ON news(total_shares);
CREATE INDEX IF NOT EXISTS idx_news_total_reports ON news(total_reports);
CREATE INDEX IF NOT EXISTS idx_news_total_bookmarks ON news(total_bookmarks);

CREATE INDEX IF NOT EXISTS idx_tags_name ON tags(name);
CREATE INDEX IF NOT EXISTS idx_tags_slug ON tags(slug);

CREATE INDEX IF NOT EXISTS idx_news_tags_tag_id ON news_tags(tag_id);
CREATE INDEX IF NOT EXISTS idx_news_tags_news_tag ON news_tags(news_id, tag_id);

CREATE INDEX IF NOT EXISTS idx_news_metrics_news_id ON news_metrics(news_id);
CREATE INDEX IF NOT EXISTS idx_news_metrics_view_count ON news_metrics(view_count);
CREATE INDEX IF NOT EXISTS idx_news_metrics_last_viewed ON news_metrics(last_viewed_at);

CREATE INDEX IF NOT EXISTS idx_news_reports_news_id ON news_reports(news_id);
CREATE INDEX IF NOT EXISTS idx_news_reports_user_id ON news_reports(user_id);
CREATE INDEX IF NOT EXISTS idx_news_reports_status ON news_reports(status);
CREATE INDEX IF NOT EXISTS idx_news_reports_created_at ON news_reports(created_at);

CREATE INDEX IF NOT EXISTS idx_news_shares_news_id ON news_shares(news_id);
CREATE INDEX IF NOT EXISTS idx_news_shares_user_id ON news_shares(user_id);
CREATE INDEX IF NOT EXISTS idx_news_shares_platform ON news_shares(platform);
CREATE INDEX IF NOT EXISTS idx_news_shares_shared_at ON news_shares(shared_at);

-- Create triggers for auto-updating timestamps
CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply triggers to new tables
CREATE TRIGGER update_tags_timestamp 
    BEFORE UPDATE ON tags 
    FOR EACH ROW EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER update_news_metrics_timestamp 
    BEFORE UPDATE ON news_metrics 
    FOR EACH ROW EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER update_news_reports_timestamp 
    BEFORE UPDATE ON news_reports 
    FOR EACH ROW EXECUTE FUNCTION update_timestamp();

-- Create functions to update metrics automatically
CREATE OR REPLACE FUNCTION update_news_metrics_on_bookmark()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        -- Increment bookmark count
        INSERT INTO news_metrics (news_id, bookmark_count, created_at, updated_at)
        VALUES (NEW.news_id, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        ON CONFLICT (news_id) 
        DO UPDATE SET 
            bookmark_count = news_metrics.bookmark_count + 1,
            updated_at = CURRENT_TIMESTAMP;
            
        -- Also update the denormalized counter in news table
        UPDATE news 
        SET total_bookmarks = total_bookmarks + 1 
        WHERE id = NEW.news_id;
        
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        -- Decrement bookmark count
        UPDATE news_metrics 
        SET 
            bookmark_count = GREATEST(0, bookmark_count - 1),
            updated_at = CURRENT_TIMESTAMP
        WHERE news_id = OLD.news_id;
        
        -- Also update the denormalized counter in news table
        UPDATE news 
        SET total_bookmarks = GREATEST(0, total_bookmarks - 1) 
        WHERE id = OLD.news_id;
        
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ language 'plpgsql';

-- Apply bookmark trigger
CREATE TRIGGER news_bookmark_metrics_trigger
    AFTER INSERT OR DELETE ON bookmarks
    FOR EACH ROW EXECUTE FUNCTION update_news_metrics_on_bookmark();

-- Create function to update comment count
CREATE OR REPLACE FUNCTION update_news_metrics_on_comment()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        -- Increment comment count
        INSERT INTO news_metrics (news_id, comment_count, created_at, updated_at)
        VALUES (NEW.news_id, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        ON CONFLICT (news_id) 
        DO UPDATE SET 
            comment_count = news_metrics.comment_count + 1,
            updated_at = CURRENT_TIMESTAMP;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        -- Decrement comment count
        UPDATE news_metrics 
        SET 
            comment_count = GREATEST(0, comment_count - 1),
            updated_at = CURRENT_TIMESTAMP
        WHERE news_id = OLD.news_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ language 'plpgsql';

-- Apply comment trigger
CREATE TRIGGER news_comment_metrics_trigger
    AFTER INSERT OR DELETE ON comments
    FOR EACH ROW EXECUTE FUNCTION update_news_metrics_on_comment();

-- Add useful views for easier querying
CREATE OR REPLACE VIEW news_with_metrics AS
SELECT 
    n.*,
    COALESCE(nm.view_count, 0) as current_view_count,
    COALESCE(nm.share_count, 0) as current_share_count,
    COALESCE(nm.bookmark_count, 0) as current_bookmark_count,
    COALESCE(nm.comment_count, 0) as current_comment_count,
    COALESCE(nm.report_count, 0) as current_report_count,
    nm.last_viewed_at
FROM news n
LEFT JOIN news_metrics nm ON n.id = nm.news_id;

-- Add comments for documentation
COMMENT ON TABLE tags IS 'Centralized tags table for better normalization';
COMMENT ON TABLE news_metrics IS 'Performance metrics for news articles';
COMMENT ON TABLE news_reports IS 'User reports for content moderation';
COMMENT ON TABLE news_shares IS 'Track sharing activity across platforms';

COMMENT ON COLUMN news.summary IS 'AI-generated summary that gets cached to avoid re-generation';
COMMENT ON COLUMN news.total_shares IS 'Denormalized share count for quick access';
COMMENT ON COLUMN news.total_reports IS 'Denormalized report count for moderation';
COMMENT ON COLUMN news.total_bookmarks IS 'Denormalized bookmark count for quick access';

-- Insert some default tags
INSERT INTO tags (name, slug, description) VALUES
('Breaking News', 'breaking-news', 'Urgent and important news updates'),
('Politik', 'politik', 'Berita dan analisis politik'),
('Ekonomi', 'ekonomi', 'Berita ekonomi dan bisnis'),
('Teknologi', 'teknologi', 'Berita teknologi dan inovasi'),
('Olahraga', 'olahraga', 'Berita olahraga dan kompetisi'),
('Kesehatan', 'kesehatan', 'Berita kesehatan dan medis'),
('Pendidikan', 'pendidikan', 'Berita pendidikan dan akademik'),
('Hiburan', 'hiburan', 'Berita hiburan dan selebriti')
ON CONFLICT (name) DO NOTHING;
