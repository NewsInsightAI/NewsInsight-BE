# API Enhancement Plan: NewsInsight v2

## Overview
This document outlines the required API enhancements to support the new database schema and provide advanced features for the NewsInsight news portal.

## New API Endpoints

### 1. News Sharing API

#### `POST /api/news/:id/share`
**Purpose**: Track news sharing across platforms

**Request Body**:
```json
{
  "platform": "facebook|twitter|whatsapp|telegram|email|copy_link"
}
```

**Response**:
```json
{
  "success": true,
  "message": "Share tracked successfully",
  "share_count": 145
}
```

**Implementation** (`server/controllers/newsController.js`):
```javascript
const shareNews = async (req, res) => {
  try {
    const { id } = req.params;
    const { platform } = req.body;
    const userId = req.user?.id; // Optional for authenticated users
    const ipAddress = req.ip;

    // Insert share record
    await db.query(
      'INSERT INTO news_shares (news_id, user_id, platform, ip_address) VALUES ($1, $2, $3, $4)',
      [id, userId, platform, ipAddress]
    );

    // Get updated share count
    const result = await db.query(
      'SELECT share_count FROM news_metrics WHERE news_id = $1',
      [id]
    );

    res.json({
      success: true,
      message: 'Share tracked successfully',
      share_count: result.rows[0]?.share_count || 0
    });
  } catch (error) {
    console.error('Share tracking error:', error);
    res.status(500).json({ error: 'Failed to track share' });
  }
};
```

### 2. Content Reporting API

#### `POST /api/news/:id/report`
**Purpose**: Allow users to report inappropriate content

**Request Body**:
```json
{
  "reason": "spam|inappropriate_content|misinformation|copyright|other",
  "description": "Detailed description of the issue"
}
```

**Response**:
```json
{
  "success": true,
  "message": "Report submitted successfully",
  "report_id": 123
}
```

**Implementation** (`server/controllers/newsController.js`):
```javascript
const reportNews = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason, description } = req.body;
    const userId = req.user?.id;

    // Check if user already reported this news
    const existingReport = await db.query(
      'SELECT id FROM news_reports WHERE news_id = $1 AND user_id = $2',
      [id, userId]
    );

    if (existingReport.rows.length > 0) {
      return res.status(400).json({ 
        error: 'You have already reported this news' 
      });
    }

    // Insert report
    const result = await db.query(
      'INSERT INTO news_reports (news_id, user_id, reason, description) VALUES ($1, $2, $3, $4) RETURNING id',
      [id, userId, reason, description]
    );

    res.json({
      success: true,
      message: 'Report submitted successfully',
      report_id: result.rows[0].id
    });
  } catch (error) {
    console.error('Report submission error:', error);
    res.status(500).json({ error: 'Failed to submit report' });
  }
};
```

### 3. Enhanced News Metrics API

#### `GET /api/news/:id/metrics`
**Purpose**: Get detailed metrics for a news article

**Response**:
```json
{
  "news_id": 123,
  "view_count": 1500,
  "share_count": 45,
  "bookmark_count": 23,
  "comment_count": 8,
  "report_count": 2,
  "last_viewed_at": "2024-01-15T10:30:00Z",
  "sharing_breakdown": {
    "facebook": 20,
    "twitter": 15,
    "whatsapp": 8,
    "telegram": 2
  }
}
```

### 4. Tag Management API

#### `GET /api/tags`
**Purpose**: Get all available tags

**Response**:
```json
{
  "tags": [
    {
      "id": 1,
      "name": "Politik",
      "slug": "politik",
      "description": "Berita politik dan pemerintahan"
    }
  ]
}
```

#### `GET /api/news/by-tag/:slug`
**Purpose**: Get news by tag

**Query Parameters**:
- `page` (optional): Page number
- `limit` (optional): Items per page

## Enhanced Existing Endpoints

### 1. Enhanced News List API

#### `GET /api/news`
**Enhanced Response** (include metrics):
```json
{
  "news": [
    {
      "id": 123,
      "title": "News Title",
      "excerpt": "Short description",
      "summary": "AI-generated summary",
      "featured_image": "image_url",
      "published_at": "2024-01-15T10:00:00Z",
      "metrics": {
        "view_count": 1500,
        "share_count": 45,
        "bookmark_count": 23,
        "comment_count": 8
      },
      "tags": ["Politik", "Ekonomi"]
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 100,
    "total_pages": 10
  }
}
```

### 2. Enhanced News Detail API

#### `GET /api/news/:id`
**Enhanced Response**:
```json
{
  "id": 123,
  "title": "News Title",
  "content": "Full content...",
  "excerpt": "Short description",
  "summary": "AI-generated summary",
  "featured_image": "image_url",
  "published_at": "2024-01-15T10:00:00Z",
  "author": {
    "name": "Author Name",
    "avatar": "avatar_url"
  },
  "category": {
    "id": 1,
    "name": "Politik"
  },
  "tags": [
    {
      "id": 1,
      "name": "Politik",
      "slug": "politik"
    }
  ],
  "metrics": {
    "view_count": 1500,
    "share_count": 45,
    "bookmark_count": 23,
    "comment_count": 8
  },
  "user_interactions": {
    "is_bookmarked": true,
    "has_reported": false
  }
}
```

## Admin APIs (Content Moderation)

### 1. Reports Management

#### `GET /api/admin/reports`
**Purpose**: Get all content reports for moderation

**Query Parameters**:
- `status`: `pending|reviewed|dismissed|action_taken`
- `page`, `limit`: Pagination

#### `PUT /api/admin/reports/:id`
**Purpose**: Update report status

**Request Body**:
```json
{
  "status": "reviewed|dismissed|action_taken",
  "admin_notes": "Review notes"
}
```

### 2. Analytics Dashboard

#### `GET /api/admin/analytics/overview`
**Purpose**: Get system-wide analytics

**Response**:
```json
{
  "total_news": 1500,
  "total_views": 45000,
  "total_shares": 2300,
  "total_bookmarks": 890,
  "top_shared_platforms": [
    { "platform": "facebook", "count": 1200 },
    { "platform": "whatsapp", "count": 800 }
  ],
  "recent_reports": 5,
  "pending_reports": 3
}
```

## Implementation Priority

### Phase 1: Core Features
1. ✅ Database schema migration (completed)
2. 🔄 News sharing API
3. 🔄 Enhanced metrics in existing endpoints
4. 🔄 Content reporting API

### Phase 2: Admin Features
1. Reports management API
2. Analytics dashboard API
3. Tag management API

### Phase 3: Advanced Features
1. AI summary generation
2. Advanced analytics
3. Automated content moderation

## Controller Updates Required

### 1. `newsController.js`
- Add `shareNews` function
- Add `reportNews` function
- Add `getNewsMetrics` function
- Enhance `getNewsById` to include metrics
- Enhance `getNews` to include metrics

### 2. `adminController.js` (new)
- Add reports management functions
- Add analytics functions
- Add tag management functions

### 3. `tagsController.js` (new)
- Add tag CRUD operations
- Add news-by-tag functions

## Route Updates Required

### 1. `newsRoutes.js`
```javascript
// Add new routes
router.post('/:id/share', requireAuth, shareNews);
router.post('/:id/report', requireAuth, reportNews);
router.get('/:id/metrics', getNewsMetrics);
```

### 2. `adminRoutes.js` (new)
```javascript
router.get('/reports', adminOnly, getReports);
router.put('/reports/:id', adminOnly, updateReport);
router.get('/analytics/overview', adminOnly, getAnalyticsOverview);
```

## Testing Strategy

### 1. Unit Tests
- Test sharing tracking functionality
- Test report submission and validation
- Test metrics calculation accuracy

### 2. Integration Tests
- Test API endpoints with real database
- Test trigger functionality
- Test data consistency

### 3. Performance Tests
- Test with high volume of shares/reports
- Monitor trigger performance
- Test query optimization

## Security Considerations

### 1. Rate Limiting
- Limit sharing requests per user/IP
- Limit report submissions per user
- Implement CAPTCHA for anonymous reports

### 2. Validation
- Validate platform names for sharing
- Validate report reasons
- Sanitize user input

### 3. Privacy
- Hash IP addresses for privacy
- Implement data retention policies
- Secure admin endpoints

## Monitoring & Logging

### 1. Metrics to Track
- Share API usage by platform
- Report submission rates
- False positive report rates
- API response times

### 2. Alerting
- High report volumes (potential spam)
- Failed trigger executions
- Unusual sharing patterns

This enhanced API structure will provide comprehensive analytics, content moderation, and user engagement features while maintaining performance and security standards.
