# Migration Guide: NewsInsight Schema Update

## Overview
This guide explains the recent database schema migration that enhances NewsInsight with advanced metrics tracking, content moderation, and analytics capabilities.

## What Changed

### 1. Enhanced `news` Table
**Added Columns:**
- `summary` (TEXT) - For AI-generated or manual summaries
- `total_shares` (INTEGER) - Cached share count for performance
- `total_reports` (INTEGER) - Cached report count
- `total_bookmarks` (INTEGER) - Cached bookmark count

### 2. New Tables Created

#### `tags` - Centralized Tag Management
- Replaces simple string tags with normalized tag system
- Enables better tag management and relationships
- Includes SEO-friendly slugs

#### `news_metrics` - Detailed Performance Tracking
- Comprehensive metrics for each news article
- Real-time counters with automatic updates
- Last viewed timestamp for engagement analysis

#### `news_reports` - Content Moderation System
- User-generated content reports
- Moderation workflow with status tracking
- Admin review process

#### `news_shares` - Sharing Analytics
- Platform-specific sharing tracking
- Anonymous and authenticated sharing
- IP-based analytics for insights

### 3. Automated Systems

#### Triggers
- **Bookmark Counter**: Auto-updates when bookmarks added/removed
- **Comment Counter**: Auto-updates when comments added/removed
- **Timestamp Updates**: Automatic `updated_at` field management

#### Views
- **`news_with_metrics`**: Simplified access to news with metrics

## Migration Impact

### ✅ What's Working
1. **Existing Features**: All current functionality preserved
2. **Backward Compatibility**: Legacy columns maintained
3. **Data Integrity**: All existing data migrated safely
4. **Performance**: Improved query performance with denormalized counters

### 🔄 What Needs Frontend Updates

#### 1. Summary Field Usage
```javascript
// Old way - using excerpt
const newsItem = {
  title: news.title,
  excerpt: news.excerpt
};

// New way - using summary (with fallback)
const newsItem = {
  title: news.title,
  summary: news.summary || news.excerpt,
  excerpt: news.excerpt
};
```

#### 2. Enhanced Metrics Display
```javascript
// Old way - basic view count
<span>{news.view_count} views</span>

// New way - comprehensive metrics
<div className="news-metrics">
  <span>{metrics.view_count} views</span>
  <span>{metrics.share_count} shares</span>
  <span>{metrics.bookmark_count} bookmarks</span>
  <span>{metrics.comment_count} comments</span>
</div>
```

#### 3. Sharing Functionality
```javascript
// New sharing with tracking
const handleShare = async (platform) => {
  try {
    await fetch('/api/news/share', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        news_id: newsId,
        platform: platform
      })
    });
    // Update share count in UI
  } catch (error) {
    console.error('Share tracking failed:', error);
  }
};
```

#### 4. Reporting System
```javascript
// New reporting functionality
const handleReport = async (reason, description) => {
  try {
    await fetch('/api/news/report', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        news_id: newsId,
        reason: reason,
        description: description
      })
    });
    // Show success message
  } catch (error) {
    console.error('Report submission failed:', error);
  }
};
```

## Recommended Frontend Updates

### 1. News Components
Update news display components to use new metrics:
- `src/components/NewsCard.tsx`
- `src/components/NewsDetail.tsx`
- `src/app/berita/[slug]/page.tsx`

### 2. Profile Components
Enhance bookmark display with new metrics:
- `src/components/Profile/Profile.tsx`
- `src/components/Profile/TabButtons.tsx`

### 3. Analytics Dashboard (Future)
Create admin dashboard for:
- Sharing analytics by platform
- Content moderation interface
- Performance metrics overview

## API Enhancements Needed

### 1. Share Tracking Endpoint
```javascript
// POST /api/news/share
{
  "news_id": 123,
  "platform": "facebook"
}
```

### 2. Report Content Endpoint
```javascript
// POST /api/news/report
{
  "news_id": 123,
  "reason": "inappropriate_content",
  "description": "Contains misleading information"
}
```

### 3. Enhanced News API
```javascript
// GET /api/news/:id - Include metrics
{
  "id": 123,
  "title": "News Title",
  "content": "...",
  "summary": "AI-generated summary",
  "metrics": {
    "view_count": 1500,
    "share_count": 45,
    "bookmark_count": 23,
    "comment_count": 8
  }
}
```

## Testing Checklist

### ✅ Completed
- [x] Database migration successful
- [x] Existing bookmark functionality working
- [x] Reading history functionality working
- [x] Comment system integration working
- [x] Auto-increment triggers working

### 🔄 Needs Testing
- [ ] Summary field utilization in frontend
- [ ] New metrics display in news components
- [ ] Share tracking implementation
- [ ] Report system implementation
- [ ] Tag system integration

## Performance Considerations

### 1. Caching Strategy
- Use denormalized counters for quick access
- Consider Redis caching for frequently accessed metrics
- Implement pagination for reports and shares

### 2. Index Optimization
- New indexes created for optimal query performance
- Foreign key constraints ensure data integrity
- Composite indexes for common query patterns

### 3. Monitoring
- Track query performance on new tables
- Monitor trigger execution time
- Watch for potential deadlocks on high-traffic updates

## Rollback Plan

If issues arise, the migration can be rolled back:

```sql
-- Remove new columns from news table
ALTER TABLE news 
DROP COLUMN IF EXISTS summary,
DROP COLUMN IF EXISTS total_shares,
DROP COLUMN IF EXISTS total_reports,
DROP COLUMN IF EXISTS total_bookmarks;

-- Drop new tables
DROP TABLE IF EXISTS news_shares;
DROP TABLE IF EXISTS news_reports;
DROP TABLE IF EXISTS news_metrics;
DROP TABLE IF EXISTS news_tags;
DROP TABLE IF EXISTS tags;

-- Drop triggers and functions
DROP TRIGGER IF EXISTS update_news_timestamp ON news;
-- (continue with other cleanup...)
```

## Next Steps

1. **Update Controllers**: Enhance news, sharing, and reporting controllers
2. **Frontend Integration**: Implement new features in React components
3. **Admin Dashboard**: Create moderation interface
4. **Analytics**: Implement reporting and insights
5. **Testing**: Comprehensive testing of new features
6. **Documentation**: Update API documentation

## Support

For questions about this migration:
- Check logs: `server/migrations/` folder
- Review schema: `server/docs/DATABASE_SCHEMA.md`
- Test queries: Use provided examples in documentation
