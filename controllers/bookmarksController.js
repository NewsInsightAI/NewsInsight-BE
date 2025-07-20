const db = require("../db");

const getUserBookmarks = async (req, res) => {
  try {
    const userId = req.user.id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 12;
    const offset = (page - 1) * limit;

    const bookmarksQuery = `
      SELECT 
        b.id,
        b.created_at as bookmarked_at,
        n.id as news_id,
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
      FROM bookmarks b
      JOIN news n ON b.news_id = n.id
      JOIN categories c ON n.category_id = c.id
      LEFT JOIN news_authors na ON n.id = na.news_id
      WHERE b.user_id = $1 AND n.status = 'published'
      GROUP BY b.id, b.created_at, n.id, n.title, n.featured_image, n.published_at, n.status, c.name, c.id
      ORDER BY b.created_at DESC
      LIMIT $2 OFFSET $3
    `;

    const countQuery = `
      SELECT COUNT(DISTINCT b.id) as total
      FROM bookmarks b
      JOIN news n ON b.news_id = n.id
      WHERE b.user_id = $1 AND n.status = 'published'
    `;

    const [bookmarksResult, countResult] = await Promise.all([
      db.query(bookmarksQuery, [userId, limit, offset]),
      db.query(countQuery, [userId]),
    ]);

    const total = parseInt(countResult.rows[0].total);
    const totalPages = Math.ceil(total / limit);

    res.json({
      success: true,
      data: bookmarksResult.rows,
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
    console.error("Error fetching bookmarks:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch bookmarks",
      error: error.message,
    });
  }
};

const addBookmark = async (req, res) => {
  try {
    const userId = req.user.id;
    const { news_id } = req.body;

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
      `INSERT INTO bookmarks (user_id, news_id) 
       VALUES ($1, $2) 
       ON CONFLICT (user_id, news_id) DO NOTHING 
       RETURNING *`,
      [userId, news_id]
    );

    if (result.rows.length === 0) {
      return res.status(200).json({
        success: true,
        message: "News already bookmarked",
      });
    }

    res.status(201).json({
      success: true,
      message: "Bookmark added successfully",
      data: result.rows[0],
    });
  } catch (error) {
    console.error("Error adding bookmark:", error);
    res.status(500).json({
      success: false,
      message: "Failed to add bookmark",
      error: error.message,
    });
  }
};

const removeBookmark = async (req, res) => {
  try {
    const userId = req.user.id;
    const { news_id } = req.params;

    const result = await db.query(
      "DELETE FROM bookmarks WHERE user_id = $1 AND news_id = $2 RETURNING *",
      [userId, news_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Bookmark not found",
      });
    }

    res.json({
      success: true,
      message: "Bookmark removed successfully",
    });
  } catch (error) {
    console.error("Error removing bookmark:", error);
    res.status(500).json({
      success: false,
      message: "Failed to remove bookmark",
      error: error.message,
    });
  }
};

const checkBookmark = async (req, res) => {
  try {
    const userId = req.user.id;
    const { news_id } = req.params;

    const result = await db.query(
      "SELECT id FROM bookmarks WHERE user_id = $1 AND news_id = $2",
      [userId, news_id]
    );

    res.json({
      success: true,
      is_bookmarked: result.rows.length > 0,
    });
  } catch (error) {
    console.error("Error checking bookmark:", error);
    res.status(500).json({
      success: false,
      message: "Failed to check bookmark status",
      error: error.message,
    });
  }
};

module.exports = {
  getUserBookmarks,
  addBookmark,
  removeBookmark,
  checkBookmark,
};
