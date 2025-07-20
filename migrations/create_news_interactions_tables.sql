-- Table untuk menyimpan berita yang disimpan user (bookmarks)
CREATE TABLE IF NOT EXISTS saved_news (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  news_id INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, news_id)
);

-- Table untuk laporan berita
CREATE TABLE IF NOT EXISTS news_reports (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  news_id INTEGER NOT NULL,
  reason VARCHAR(100) NOT NULL,
  description TEXT,
  status VARCHAR(20) DEFAULT 'pending', -- pending, reviewed, resolved
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table untuk share/bagikan berita (analytics)
CREATE TABLE IF NOT EXISTS news_shares (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  news_id INTEGER NOT NULL,
  share_type VARCHAR(50) NOT NULL, -- 'link_copy', 'native_share', 'social_media'
  platform VARCHAR(50), -- 'whatsapp', 'telegram', 'facebook', etc (optional)
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table untuk ringkasan berita yang di-generate
CREATE TABLE IF NOT EXISTS news_summaries (
  id SERIAL PRIMARY KEY,
  news_id INTEGER NOT NULL UNIQUE,
  summary_text TEXT NOT NULL,
  key_points JSONB, -- array of key points
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes untuk performa
CREATE INDEX IF NOT EXISTS idx_saved_news_user_id ON saved_news(user_id);
CREATE INDEX IF NOT EXISTS idx_saved_news_news_id ON saved_news(news_id);
CREATE INDEX IF NOT EXISTS idx_news_reports_user_id ON news_reports(user_id);
CREATE INDEX IF NOT EXISTS idx_news_reports_news_id ON news_reports(news_id);
CREATE INDEX IF NOT EXISTS idx_news_reports_status ON news_reports(status);
CREATE INDEX IF NOT EXISTS idx_news_shares_user_id ON news_shares(user_id);
CREATE INDEX IF NOT EXISTS idx_news_shares_news_id ON news_shares(news_id);
CREATE INDEX IF NOT EXISTS idx_news_summaries_news_id ON news_summaries(news_id);
