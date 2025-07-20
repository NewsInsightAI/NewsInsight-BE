# NewsInsight Database Schema Documentation

## Overview
This document describes the updated database schema for NewsInsight news portal, designed for optimal performance and scalability.

## Core Tables

### 1. `news` (Main News Table)
**Purpose**: Stores main news articles with essential metadata

| Column | Type | Description |
|--------|------|-------------|
| `id` | SERIAL PRIMARY KEY | Unique identifier |
| `title` | VARCHAR(500) | News headline/title |
| `content` | TEXT | Full article content |
| `excerpt` | TEXT | Short description/excerpt |
| `summary` | TEXT | AI-generated summary (cached) |
| `slug` | VARCHAR(600) | SEO-friendly URL slug |
| `featured_image` | VARCHAR(500) | Main image URL |
| `category_id` | INTEGER | References categories(id) |
| `status` | VARCHAR(20) | 'draft', 'published', 'archived' |
| `total_shares` | INTEGER | Denormalized share count |
| `total_reports` | INTEGER | Denormalized report count |
| `total_bookmarks` | INTEGER | Denormalized bookmark count |
| `view_count` | INTEGER | Legacy view count (use news_metrics) |
| `hashed_id` | VARCHAR(32) | Unique hash for URLs |
| `published_at` | TIMESTAMP | Publication date |
| `created_at` | TIMESTAMP | Record creation date |
| `updated_at` | TIMESTAMP | Last modification date |
| `created_by` | INTEGER | References users(id) |

### 2. `tags` (Tags Management)
**Purpose**: Centralized tag management for better normalization

| Column | Type | Description |
|--------|------|-------------|
| `id` | SERIAL PRIMARY KEY | Unique identifier |
| `name` | VARCHAR(100) | Tag name |
| `slug` | VARCHAR(120) | URL-friendly slug |
| `description` | TEXT | Tag description |
| `created_at` | TIMESTAMP | Record creation date |
| `updated_at` | TIMESTAMP | Last modification date |

### 3. `news_tags` (Many-to-Many Relationship)
**Purpose**: Links news articles to tags

| Column | Type | Description |
|--------|------|-------------|
| `id` | SERIAL PRIMARY KEY | Unique identifier |
| `news_id` | INTEGER | References news(id) |
| `tag_id` | INTEGER | References tags(id) |
| `tag_name` | VARCHAR(100) | Legacy tag name (for backward compatibility) |
| `created_at` | TIMESTAMP | Record creation date |

### 4. `news_metrics` (Performance Metrics)
**Purpose**: Tracks detailed metrics for each news article

| Column | Type | Description |
|--------|------|-------------|
| `id` | SERIAL PRIMARY KEY | Unique identifier |
| `news_id` | INTEGER | References news(id) UNIQUE |
| `view_count` | INTEGER | Total page views |
| `share_count` | INTEGER | Total shares across platforms |
| `bookmark_count` | INTEGER | Total bookmarks |
| `comment_count` | INTEGER | Total comments |
| `report_count` | INTEGER | Total reports |
| `last_viewed_at` | TIMESTAMP | Last view timestamp |
| `created_at` | TIMESTAMP | Record creation date |
| `updated_at` | TIMESTAMP | Last modification date |

### 5. `news_reports` (Content Moderation)
**Purpose**: Manages user reports for content moderation

| Column | Type | Description |
|--------|------|-------------|
| `id` | SERIAL PRIMARY KEY | Unique identifier |
| `news_id` | INTEGER | References news(id) |
| `user_id` | INTEGER | References users(id) |
| `reason` | VARCHAR(100) | Report reason |
| `description` | TEXT | Detailed description |
| `status` | VARCHAR(20) | 'pending', 'reviewed', 'dismissed', 'action_taken' |
| `reviewed_by` | INTEGER | References users(id) |
| `reviewed_at` | TIMESTAMP | Review timestamp |
| `created_at` | TIMESTAMP | Record creation date |
| `updated_at` | TIMESTAMP | Last modification date |

### 6. `news_shares` (Sharing Analytics)
**Purpose**: Tracks sharing activity across platforms

| Column | Type | Description |
|--------|------|-------------|
| `id` | SERIAL PRIMARY KEY | Unique identifier |
| `news_id` | INTEGER | References news(id) |
| `user_id` | INTEGER | References users(id) (nullable) |
| `platform` | VARCHAR(50) | 'facebook', 'twitter', 'whatsapp', etc. |
| `shared_at` | TIMESTAMP | Share timestamp |
| `ip_address` | INET | User IP address |

## Existing Related Tables

### 7. `comments` (User Comments)
**Purpose**: Stores user comments on news articles

| Column | Type | Description |
|--------|------|-------------|
| `id` | SERIAL PRIMARY KEY | Unique identifier |
| `news_id` | INTEGER | References news(id) |
| `reader_name` | VARCHAR(255) | Commenter name |
| `reader_email` | VARCHAR(255) | Commenter email |
| `content` | TEXT | Comment content |
| `status` | VARCHAR(20) | 'pending', 'approved', 'rejected' |
| `created_at` | TIMESTAMP | Record creation date |

### 8. `bookmarks` (User Bookmarks)
**Purpose**: Stores user bookmarked articles

| Column | Type | Description |
|--------|------|-------------|
| `id` | SERIAL PRIMARY KEY | Unique identifier |
| `user_id` | INTEGER | References users(id) |
| `news_id` | INTEGER | References news(id) |
| `created_at` | TIMESTAMP | Record creation date |

## Automated Features

### Triggers
1. **Auto-update timestamps**: Automatically updates `updated_at` columns
2. **Metrics synchronization**: Automatically updates counters when bookmarks/comments are added/removed
3. **Denormalization**: Keeps cached counts in sync with actual data

### Views
- **`news_with_metrics`**: Combines news data with current metrics for easier querying

### Functions
- **`update_news_metrics_on_bookmark()`**: Updates bookmark counts automatically
- **`update_news_metrics_on_comment()`**: Updates comment counts automatically

## Benefits of This Structure

### 1. **Performance Optimization**
- Denormalized counters for quick access
- Separate metrics table prevents locking main news table
- Optimized indexes for common queries

### 2. **Scalability**
- Separate tables for high-frequency operations (shares, reports)
- Efficient many-to-many relationships
- Better data distribution

### 3. **Analytics & Insights**
- Detailed tracking of user engagement
- Platform-specific sharing analytics
- Comprehensive moderation system

### 4. **Feature Support**
- AI summary caching (avoid re-generation)
- Advanced tagging system
- Content moderation workflow
- User engagement tracking

## Migration Notes

1. **Backward Compatibility**: Old view_count column maintained for legacy code
2. **Data Migration**: Existing view counts migrated to news_metrics table
3. **Default Tags**: Pre-populated with common Indonesian news categories
4. **Triggers**: Automatically maintain data consistency

## Usage Examples

### Get News with All Metrics
```sql
SELECT * FROM news_with_metrics WHERE status = 'published';
```

### Most Shared News This Week
```sql
SELECT n.title, nm.share_count 
FROM news n 
JOIN news_metrics nm ON n.id = nm.news_id 
WHERE n.published_at >= NOW() - INTERVAL '7 days'
ORDER BY nm.share_count DESC;
```

### Platform Sharing Analysis
```sql
SELECT platform, COUNT(*) as share_count
FROM news_shares 
WHERE shared_at >= NOW() - INTERVAL '30 days'
GROUP BY platform;
```
