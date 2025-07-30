const db = require("../db");

// Save/Unsave News (Bookmark) - Using bookmarks table for consistency
exports.toggleSaveNews = async (req, res) => {
  try {
    const { newsId } = req.params;
    const userId = req.user.id;

    // Check if already saved
    const existingResult = await db.query(
      "SELECT id FROM bookmarks WHERE user_id = $1 AND news_id = $2",
      [userId, newsId]
    );

    if (existingResult.rows.length > 0) {
      // Remove from saved
      await db.query(
        "DELETE FROM bookmarks WHERE user_id = $1 AND news_id = $2",
        [userId, newsId]
      );

      res.json({
        success: true,
        message: "Berita berhasil dihapus dari simpanan",
        saved: false,
      });
    } else {
      // Add to saved
      await db.query(
        "INSERT INTO bookmarks (user_id, news_id) VALUES ($1, $2)",
        [userId, newsId]
      );

      res.json({
        success: true,
        message: "Berita berhasil disimpan",
        saved: true,
      });
    }
  } catch (error) {
    console.error("Error toggling save news:", error);
    res.status(500).json({
      success: false,
      message: "Terjadi kesalahan saat menyimpan berita",
      error: error.message,
    });
  }
};

// Check if news is saved by user - Using bookmarks table for consistency
exports.checkSavedStatus = async (req, res) => {
  console.log("=== checkSavedStatus called ===");
  console.log("Params:", req.params);
  console.log("User:", req.user);

  try {
    const { newsId } = req.params;
    const userId = req.user.id;

    console.log("Checking saved status for:", { userId, newsId });

    const result = await db.query(
      "SELECT id FROM bookmarks WHERE user_id = $1 AND news_id = $2",
      [userId, newsId]
    );

    console.log("Database result:", result.rows);

    res.json({
      success: true,
      saved: result.rows.length > 0,
    });
  } catch (error) {
    console.error("Error checking saved status:", error);
    res.status(500).json({
      success: false,
      message: "Terjadi kesalahan saat mengecek status simpanan",
      error: error.message,
    });
  }
};

// Get user's saved news - Using bookmarks table for consistency
exports.getSavedNews = async (req, res) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;

    const result = await db.query(
      `SELECT 
        b.news_id,
        b.created_at as saved_at,
        COUNT(*) OVER() as total_count
       FROM bookmarks b
       WHERE b.user_id = $1
       ORDER BY b.created_at DESC
       LIMIT $2 OFFSET $3`,
      [userId, limit, offset]
    );

    res.json({
      success: true,
      data: result.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: result.rows[0]?.total_count || 0,
      },
    });
  } catch (error) {
    console.error("Error getting saved news:", error);
    res.status(500).json({
      success: false,
      message: "Terjadi kesalahan saat mengambil berita tersimpan",
      error: error.message,
    });
  }
};

// Report News
exports.reportNews = async (req, res) => {
  try {
    const { newsId } = req.params;
    const { reason, description } = req.body;
    const userId = req.user.id;

    // Validate required fields
    if (!reason) {
      return res.status(400).json({
        success: false,
        message: "Alasan laporan harus diisi",
      });
    }

    // Check if user already reported this news
    const existingReport = await db.query(
      "SELECT id FROM news_reports WHERE user_id = $1 AND news_id = $2",
      [userId, newsId]
    );

    if (existingReport.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Anda sudah melaporkan berita ini sebelumnya",
      });
    }

    // Insert report
    const result = await db.query(
      `INSERT INTO news_reports (user_id, news_id, reason, description) 
       VALUES ($1, $2, $3, $4) 
       RETURNING id`,
      [userId, newsId, reason, description]
    );

    res.json({
      success: true,
      message: "Laporan berhasil dikirim. Terima kasih atas partisipasi Anda.",
      reportId: result.rows[0].id,
    });
  } catch (error) {
    console.error("Error reporting news:", error);
    res.status(500).json({
      success: false,
      message: "Terjadi kesalahan saat mengirim laporan",
      error: error.message,
    });
  }
};

// Track News Share
exports.trackNewsShare = async (req, res) => {
  try {
    const { newsId } = req.params;
    const { shareType, platform } = req.body;
    const userId = req.user?.id || null; // Optional for guest users

    // Insert share tracking
    await db.query(
      "INSERT INTO news_shares (user_id, news_id, share_type, platform) VALUES ($1, $2, $3, $4)",
      [userId, newsId, shareType, platform]
    );

    res.json({
      success: true,
      message: "Share berhasil dicatat",
    });
  } catch (error) {
    console.error("Error tracking news share:", error);
    res.status(500).json({
      success: false,
      message: "Terjadi kesalahan saat mencatat share",
      error: error.message,
    });
  }
};

// Get News Engagement Metrics
exports.getNewsEngagementMetrics = async (req, res) => {
  try {
    const { newsId } = req.params;

    // Query for all engagement metrics using correct table names
    const [
      viewsResult,
      commentsResult,
      sharesResult,
      bookmarksResult
    ] = await Promise.all([
      // Views from reading_history table
      db.query("SELECT COUNT(*) as views FROM reading_history WHERE news_id = $1", [newsId]),
      
      // Comments from comments table
      db.query("SELECT COUNT(*) as comments FROM comments WHERE news_id = $1 AND status = 'published'", [newsId]),
      
      // Shares from news_shares table
      db.query("SELECT COUNT(*) as shares FROM news_shares WHERE news_id = $1", [newsId]),
      
      // Bookmarks from bookmarks table
      db.query("SELECT COUNT(*) as bookmarks FROM bookmarks WHERE news_id = $1", [newsId])
    ]);

    const metrics = {
      views: parseInt(viewsResult.rows[0]?.views || 0),
      comments: parseInt(commentsResult.rows[0]?.comments || 0),
      shares: parseInt(sharesResult.rows[0]?.shares || 0),
      bookmarks: parseInt(bookmarksResult.rows[0]?.bookmarks || 0)
    };

    res.json({
      success: true,
      data: metrics
    });
  } catch (error) {
    console.error("Error getting news engagement metrics:", error);
    res.status(500).json({
      success: false,
      message: "Terjadi kesalahan saat mengambil metrics engagement",
      error: error.message,
    });
  }
};

// Get Engagement Metrics for Multiple News
exports.getBulkNewsEngagementMetrics = async (req, res) => {
  try {
    const { newsIds } = req.body; // Array of news IDs

    if (!newsIds || !Array.isArray(newsIds)) {
      return res.status(400).json({
        success: false,
        message: "newsIds array is required"
      });
    }

    // Create placeholders for IN clause
    const placeholders = newsIds.map((_, index) => `$${index + 1}`).join(',');

    const [
      viewsResult,
      commentsResult,
      sharesResult,
      bookmarksResult
    ] = await Promise.all([
      // Views from reading_history table
      db.query(`
        SELECT news_id, COUNT(*) as views 
        FROM reading_history 
        WHERE news_id IN (${placeholders}) 
        GROUP BY news_id
      `, newsIds),
      
      // Comments from comments table
      db.query(`
        SELECT news_id, COUNT(*) as comments 
        FROM comments 
        WHERE news_id IN (${placeholders}) AND status = 'published'
        GROUP BY news_id
      `, newsIds),
      
      // Shares from news_shares table
      db.query(`
        SELECT news_id, COUNT(*) as shares 
        FROM news_shares 
        WHERE news_id IN (${placeholders})
        GROUP BY news_id
      `, newsIds),
      
      // Bookmarks from bookmarks table only (fixing parameter count)
      db.query(`
        SELECT news_id, COUNT(*) as bookmarks 
        FROM bookmarks 
        WHERE news_id IN (${placeholders})
        GROUP BY news_id
      `, newsIds)
    ]);

    // Organize data by news_id
    const metricsMap = {};
    
    // Initialize all news with zero values
    newsIds.forEach(newsId => {
      metricsMap[newsId] = {
        views: 0,
        comments: 0,
        shares: 0,
        bookmarks: 0
      };
    });

    // Populate with actual data
    viewsResult.rows.forEach(row => {
      metricsMap[row.news_id].views = parseInt(row.views);
    });
    
    commentsResult.rows.forEach(row => {
      metricsMap[row.news_id].comments = parseInt(row.comments);
    });
    
    sharesResult.rows.forEach(row => {
      metricsMap[row.news_id].shares = parseInt(row.shares);
    });
    
    bookmarksResult.rows.forEach(row => {
      metricsMap[row.news_id].bookmarks = parseInt(row.bookmarks);
    });

    res.json({
      success: true,
      data: metricsMap
    });
  } catch (error) {
    console.error("Error getting bulk news engagement metrics:", error);
    res.status(500).json({
      success: false,
      message: "Terjadi kesalahan saat mengambil bulk metrics engagement",
      error: error.message,
    });
  }
};
