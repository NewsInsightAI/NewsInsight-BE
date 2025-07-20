-- Migration: Create visitor analytics table for tracking daily visits
-- This table will store daily aggregated visitor data

CREATE TABLE IF NOT EXISTS visitor_analytics (
  id SERIAL PRIMARY KEY,
  date DATE NOT NULL,
  page_views INTEGER DEFAULT 0,
  unique_visitors INTEGER DEFAULT 0,
  registered_users_visits INTEGER DEFAULT 0,
  guest_visits INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(date)
);

-- Create index for faster date queries
CREATE INDEX IF NOT EXISTS idx_visitor_analytics_date ON visitor_analytics(date);

-- Insert sample data for the last 30 days
INSERT INTO visitor_analytics (date, page_views, unique_visitors, registered_users_visits, guest_visits)
SELECT 
  (CURRENT_DATE - INTERVAL '1 day' * generate_series(0, 29)) as date,
  (150 + (random() * 200)::int) as page_views,
  (80 + (random() * 120)::int) as unique_visitors,
  (30 + (random() * 50)::int) as registered_users_visits,
  (50 + (random() * 70)::int) as guest_visits
ON CONFLICT (date) DO NOTHING;
