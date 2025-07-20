-- Enhanced tracking tables for detailed page analytics

-- Table untuk tracking setiap kunjungan individual per halaman
CREATE TABLE IF NOT EXISTS page_visits (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) NULL, -- NULL jika guest
  session_id VARCHAR(255) NOT NULL,
  page_url VARCHAR(500) NOT NULL,
  page_title VARCHAR(255),
  referrer VARCHAR(500),
  user_agent TEXT,
  ip_address INET,
  device_type VARCHAR(50), -- desktop, mobile, tablet
  browser VARCHAR(100),
  visited_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  duration_seconds INTEGER DEFAULT 0, -- time spent on page
  is_bounce BOOLEAN DEFAULT FALSE -- true if user left immediately
);

-- Table untuk summary per halaman per hari
CREATE TABLE IF NOT EXISTS daily_page_analytics (
  id SERIAL PRIMARY KEY,
  date DATE NOT NULL,
  page_url VARCHAR(500) NOT NULL,
  page_title VARCHAR(255),
  total_visits INTEGER DEFAULT 0,
  unique_visitors INTEGER DEFAULT 0,
  registered_visits INTEGER DEFAULT 0,
  guest_visits INTEGER DEFAULT 0,
  avg_duration_seconds INTEGER DEFAULT 0,
  bounce_rate DECIMAL(5,2) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(date, page_url)
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_page_visits_url ON page_visits(page_url);
CREATE INDEX IF NOT EXISTS idx_page_visits_user_id ON page_visits(user_id);
CREATE INDEX IF NOT EXISTS idx_page_visits_session_id ON page_visits(session_id);
CREATE INDEX IF NOT EXISTS idx_page_visits_visited_at ON page_visits(visited_at);
CREATE INDEX IF NOT EXISTS idx_daily_page_analytics_date ON daily_page_analytics(date);
CREATE INDEX IF NOT EXISTS idx_daily_page_analytics_url ON daily_page_analytics(page_url);

-- Insert sample data for popular pages
INSERT INTO daily_page_analytics (date, page_url, page_title, total_visits, unique_visitors, registered_visits, guest_visits, avg_duration_seconds, bounce_rate)
VALUES 
  (CURRENT_DATE, '/', 'Home Page', 150, 120, 80, 70, 120, 25.5),
  (CURRENT_DATE, '/news', 'All News', 89, 75, 45, 44, 180, 15.2),
  (CURRENT_DATE, '/news/politik', 'Politik News', 67, 54, 35, 32, 210, 12.8),
  (CURRENT_DATE, '/news/teknologi', 'Technology News', 45, 38, 28, 17, 195, 18.3),
  (CURRENT_DATE, '/dashboard', 'Admin Dashboard', 12, 8, 12, 0, 300, 8.5)
ON CONFLICT (date, page_url) DO NOTHING;
