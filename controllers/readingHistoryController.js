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
        n.title,
        n.image_url,
        n.published_at,
        n.status,
        c.name as category_name,
        c.id as category_id,
        array_agg(
          json_build_object(
            'id', a.id,
            'name', a.name,
            'avatar_url', a.avatar_url
          )
        ) as authors
      FROM reading_history rh
      JOIN news n ON rh.news_id = n.id
      JOIN categories c ON n.category_id = c.id
      LEFT JOIN news_authors na ON n.id = na.news_id
      LEFT JOIN authors a ON na.author_id = a.id
      WHERE rh.user_id = $1 AND n.status = 'published'
      GROUP BY rh.id, rh.news_id, rh.read_at, rh.read_duration, rh.read_percentage, 
               n.id, n.title, n.image_url, n.published_at, n.status, c.name, c.id
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

    const result = await db.query(
      `INSERT INTO reading_history (user_id, news_id, read_duration, read_percentage) 
       VALUES ($1, $2, $3, $4) 
       RETURNING *`,
      [userId, news_id, read_duration, read_percentage]
    );

    res.status(201).json({
      success: true,
      message: "Reading history added successfully",
      data: result.rows[0],
    });
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

module.exports = {
  getUserReadingHistory,
  addReadingHistory,
  clearReadingHistory,
  getReadingStats,
};
