const pool = require("../db");

// Save user search history
exports.saveSearchHistory = async (req, res) => {
  try {
    const { searchQuery } = req.body;
    const userId = req.user?.id;

    if (!searchQuery || searchQuery.trim() === "") {
      return res.status(400).json({
        status: "error",
        message: "Search query is required",
      });
    }

    const trimmedQuery = searchQuery.trim();

    if (userId) {
      // Save to user's search history (upsert)
      await pool.query(
        `
        INSERT INTO search_history (user_id, search_query, search_count, last_searched_at, updated_at)
        VALUES ($1, $2, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        ON CONFLICT (user_id, search_query)
        DO UPDATE SET 
          search_count = search_history.search_count + 1,
          last_searched_at = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP
      `,
        [userId, trimmedQuery]
      );
    }

    // Update global trending searches
    await pool.query(
      `
      INSERT INTO trending_searches (search_query, search_count, last_searched_at, updated_at)
      VALUES ($1, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      ON CONFLICT (search_query)
      DO UPDATE SET 
        search_count = trending_searches.search_count + 1,
        last_searched_at = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP,
        popularity_score = (trending_searches.search_count + 1) * 
          EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - trending_searches.created_at)) / 86400.0
    `,
      [trimmedQuery]
    );

    res.json({
      status: "success",
      message: "Search history saved successfully",
    });
  } catch (error) {
    console.error("Error saving search history:", error);
    res.status(500).json({
      status: "error",
      message: "Internal server error",
      error: error.message,
    });
  }
};

// Get user's search history
exports.getUserSearchHistory = async (req, res) => {
  try {
    const userId = req.user?.id;
    const { limit = 10 } = req.query;

    if (!userId) {
      return res.status(401).json({
        status: "error",
        message: "Authentication required",
      });
    }

    const result = await pool.query(
      `
      SELECT search_query, search_count, last_searched_at
      FROM search_history 
      WHERE user_id = $1 
      ORDER BY last_searched_at DESC 
      LIMIT $2
    `,
      [userId, limit]
    );

    res.json({
      status: "success",
      message: "Search history retrieved successfully",
      data: {
        searchHistory: result.rows,
      },
    });
  } catch (error) {
    console.error("Error fetching search history:", error);
    res.status(500).json({
      status: "error",
      message: "Internal server error",
      error: error.message,
    });
  }
};

// Get trending searches (public)
exports.getTrendingSearches = async (req, res) => {
  try {
    const { limit = 10 } = req.query;

    const result = await pool.query(
      `
      SELECT search_query, search_count, popularity_score
      FROM trending_searches 
      WHERE last_searched_at > CURRENT_TIMESTAMP - INTERVAL '30 days'
      ORDER BY popularity_score DESC, search_count DESC
      LIMIT $1
    `,
      [limit]
    );

    res.json({
      status: "success",
      message: "Trending searches retrieved successfully",
      data: {
        trendingSearches: result.rows,
      },
    });
  } catch (error) {
    console.error("Error fetching trending searches:", error);
    res.status(500).json({
      status: "error",
      message: "Internal server error",
      error: error.message,
    });
  }
};

// Get popular news (public)
exports.getPopularNews = async (req, res) => {
  try {
    const { limit = 10 } = req.query;

    const result = await pool.query(
      `
      SELECT 
        n.id,
        n.title,
        n.hashed_id,
        n.slug,
        n.featured_image,
        n.published_at,
        n.view_count,
        c.name as category_name,
        c.slug as category_slug,
        COALESCE(
          JSON_AGG(
            CASE 
              WHEN na.id IS NOT NULL 
              THEN JSON_BUILD_OBJECT('author_name', na.author_name, 'location', na.location)
              ELSE NULL 
            END
          ) FILTER (WHERE na.id IS NOT NULL), 
          '[]'::json
        ) as authors
      FROM news n
      LEFT JOIN categories c ON n.category_id = c.id
      LEFT JOIN news_authors na ON n.id = na.news_id
      WHERE n.status = 'published'
        AND n.published_at > CURRENT_TIMESTAMP - INTERVAL '7 days'
      GROUP BY n.id, c.name, c.slug
      ORDER BY n.view_count DESC, n.published_at DESC
      LIMIT $1
    `,
      [limit]
    );

    res.json({
      status: "success",
      message: "Popular news retrieved successfully",
      data: {
        popularNews: result.rows,
      },
    });
  } catch (error) {
    console.error("Error fetching popular news:", error);
    res.status(500).json({
      status: "error",
      message: "Internal server error",
      error: error.message,
    });
  }
};

// Get popular tags (public)
exports.getPopularTags = async (req, res) => {
  try {
    const { limit = 10 } = req.query;

    const result = await pool.query(
      `
      SELECT 
        name as tag_name, 
        usage_count,
        created_at,
        updated_at
      FROM tags 
      WHERE usage_count > 0
      ORDER BY usage_count DESC, name ASC
      LIMIT $1
    `,
      [limit]
    );

    res.json({
      status: "success",
      message: "Popular tags retrieved successfully",
      data: {
        popularTags: result.rows,
      },
    });
  } catch (error) {
    console.error("Error fetching popular tags:", error);
    res.status(500).json({
      status: "error",
      message: "Internal server error",
      error: error.message,
    });
  }
};

// Note: Tag popularity is now automatically tracked via database triggers
// when news_tags records are inserted/updated/deleted
