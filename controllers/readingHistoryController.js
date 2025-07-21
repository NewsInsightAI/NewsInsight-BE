const db = require("../db");

const getUserReadingHistory = async (req, res) => {
  try {
    const userId = req.user.id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 12;
    const offset = (page - 1) * limit;

    const historyQuery = `
      SELECT DISTINCT ON (rh.news_id)
        rh.id,
        rh.read_at,
        rh.read_duration,
        rh.read_percentage,
        n.id as news_id,
        n.hashed_id,
        n.title,
        n.featured_image as image_url,
        n.published_at,
        n.status,
        c.name as category_name,
        c.id as category_id,
        COALESCE(
          array_agg(
            CASE WHEN na.author_name IS NOT NULL THEN
              json_build_object(
                'name', na.author_name,
                'location', na.location
              )
            END
          ) FILTER (WHERE na.author_name IS NOT NULL),
          ARRAY[]::json[]
        ) as authors
      FROM reading_history rh
      JOIN news n ON rh.news_id = n.id
      JOIN categories c ON n.category_id = c.id
      LEFT JOIN news_authors na ON n.id = na.news_id
      WHERE rh.user_id = $1 AND n.status = 'published'
      GROUP BY rh.id, rh.news_id, rh.read_at, rh.read_duration, rh.read_percentage, 
               n.id, n.hashed_id, n.title, n.featured_image, n.published_at, n.status, c.name, c.id
      ORDER BY rh.news_id, rh.read_at DESC
      LIMIT $2 OFFSET $3
    `;

    const countQuery = `
      SELECT COUNT(DISTINCT rh.news_id) as total
      FROM reading_history rh
      JOIN news n ON rh.news_id = n.id
      WHERE rh.user_id = $1 AND n.status = 'published'
    `;

    const [historyResult, countResult] = await Promise.all([
      db.query(historyQuery, [userId, limit, offset]),
      db.query(countQuery, [userId]),
    ]);

    const total = parseInt(countResult.rows[0].total);
    const totalPages = Math.ceil(total / limit);

    res.json({
      success: true,
      data: historyResult.rows,
      pagination: {
        current_page: page,
        total_pages: totalPages,
        total_items: total,
        items_per_page: limit,
        has_next: page < totalPages,
        has_prev: page > 1,
      },
    });
  } catch (error) {
    console.error("Error fetching reading history:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch reading history",
      error: error.message,
    });
  }
};

const addReadingHistory = async (req, res) => {
  try {
    const userId = req.user.id;
    const { news_id, read_duration = 0, read_percentage = 0.0 } = req.body;

    if (!news_id) {
      return res.status(400).json({
        success: false,
        message: "News ID is required",
      });
    }

    // Check if news exists and is published
    const newsCheck = await db.query(
      "SELECT id FROM news WHERE id = $1 AND status = $2",
      [news_id, "published"]
    );

    if (newsCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "News not found or not published",
      });
    }

    // Start transaction for atomic operations
    await db.query("BEGIN");

    try {
      // Add reading history entry
      const historyResult = await db.query(
        `INSERT INTO reading_history (user_id, news_id, read_duration, read_percentage) 
         VALUES ($1, $2, $3, $4) 
         RETURNING *`,
        [userId, news_id, read_duration, read_percentage]
      );

      // Update news_metrics table - increment view count and update last viewed
      await db.query(
        `INSERT INTO news_metrics (news_id, view_count, last_viewed_at, created_at, updated_at)
         VALUES ($1, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
         ON CONFLICT (news_id) 
         DO UPDATE SET 
           view_count = news_metrics.view_count + 1,
           last_viewed_at = CURRENT_TIMESTAMP,
           updated_at = CURRENT_TIMESTAMP`,
        [news_id]
      );

      // Commit transaction
      await db.query("COMMIT");

      res.status(201).json({
        success: true,
        message: "Reading history added successfully",
        data: historyResult.rows[0],
      });
    } catch (error) {
      // Rollback transaction on error
      await db.query("ROLLBACK");
      throw error;
    }
  } catch (error) {
    console.error("Error adding reading history:", error);
    res.status(500).json({
      success: false,
      message: "Failed to add reading history",
      error: error.message,
    });
  }
};

const clearReadingHistory = async (req, res) => {
  try {
    const userId = req.user.id;
    const { news_id } = req.body;

    let query, params;

    if (news_id) {
      query = "DELETE FROM reading_history WHERE user_id = $1 AND news_id = $2";
      params = [userId, news_id];
    } else {
      query = "DELETE FROM reading_history WHERE user_id = $1";
      params = [userId];
    }

    const result = await db.query(query, params);

    res.json({
      success: true,
      message: news_id
        ? "Reading history for news cleared successfully"
        : "All reading history cleared successfully",
      cleared_count: result.rowCount,
    });
  } catch (error) {
    console.error("Error clearing reading history:", error);
    res.status(500).json({
      success: false,
      message: "Failed to clear reading history",
      error: error.message,
    });
  }
};

const getReadingStats = async (req, res) => {
  try {
    const userId = req.user.id;

    const statsQuery = `
      SELECT 
        COUNT(DISTINCT news_id) as total_articles_read,
        SUM(read_duration) as total_reading_time,
        AVG(read_percentage) as avg_read_percentage,
        COUNT(*) as total_reading_sessions,
        DATE_TRUNC('day', read_at) as read_date,
        COUNT(DISTINCT news_id) as articles_per_day
      FROM reading_history 
      WHERE user_id = $1 
      GROUP BY DATE_TRUNC('day', read_at)
      ORDER BY read_date DESC
      LIMIT 30
    `;

    const result = await db.query(statsQuery, [userId]);

    res.json({
      success: true,
      data: result.rows,
    });
  } catch (error) {
    console.error("Error fetching reading stats:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch reading statistics",
      error: error.message,
    });
  }
};

// New function to track view count for both logged in and anonymous users
const trackNewsView = async (req, res) => {
  try {
    const { news_id } = req.body;

    if (!news_id) {
      return res.status(400).json({
        success: false,
        message: "News ID is required",
      });
    }

    // Check if news exists and is published
    const newsCheck = await db.query(
      "SELECT id FROM news WHERE id = $1 AND status = $2",
      [news_id, "published"]
    );

    if (newsCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "News not found or not published",
      });
    }

    // Update news_metrics table - increment view count
    await db.query(
      `INSERT INTO news_metrics (news_id, view_count, last_viewed_at, created_at, updated_at)
       VALUES ($1, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
       ON CONFLICT (news_id) 
       DO UPDATE SET 
         view_count = news_metrics.view_count + 1,
         last_viewed_at = CURRENT_TIMESTAMP,
         updated_at = CURRENT_TIMESTAMP`,
      [news_id]
    );

    res.json({
      success: true,
      message: "News view tracked successfully",
    });
  } catch (error) {
    console.error("Error tracking news view:", error);
    res.status(500).json({
      success: false,
      message: "Failed to track news view",
      error: error.message,
    });
  }
};

module.exports = {
  getUserReadingHistory,
  addReadingHistory,
  clearReadingHistory,
  getReadingStats,
  trackNewsView,
};
