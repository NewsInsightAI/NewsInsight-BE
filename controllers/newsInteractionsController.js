const db = require("../db");

// Save/Unsave News (Bookmark)
exports.toggleSaveNews = async (req, res) => {
  try {
    const { newsId } = req.params;
    const userId = req.user.id;

    // Check if already saved
    const existingResult = await db.query(
      "SELECT id FROM saved_news WHERE user_id = $1 AND news_id = $2",
      [userId, newsId]
    );

    if (existingResult.rows.length > 0) {
      // Remove from saved
      await db.query(
        "DELETE FROM saved_news WHERE user_id = $1 AND news_id = $2",
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
        "INSERT INTO saved_news (user_id, news_id) VALUES ($1, $2)",
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

// Check if news is saved by user
exports.checkSavedStatus = async (req, res) => {
  console.log("=== checkSavedStatus called ===");
  console.log("Params:", req.params);
  console.log("User:", req.user);

  try {
    const { newsId } = req.params;
    const userId = req.user.id;

    console.log("Checking saved status for:", { userId, newsId });

    const result = await db.query(
      "SELECT id FROM saved_news WHERE user_id = $1 AND news_id = $2",
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

// Get user's saved news
exports.getSavedNews = async (req, res) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 12 } = req.query;
    const offset = (page - 1) * limit;

    console.log("=== getSavedNews called ===");
    console.log("User ID:", userId);
    console.log("Page:", page, "Limit:", limit);

    const savedNewsQuery = `
      SELECT 
        sn.id,
        sn.created_at as bookmarked_at,
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
      FROM saved_news sn
      JOIN news n ON sn.news_id = n.id
      JOIN categories c ON n.category_id = c.id
      LEFT JOIN news_authors na ON n.id = na.news_id
      WHERE sn.user_id = $1 AND n.status = 'published'
      GROUP BY sn.id, sn.created_at, n.id, n.title, n.featured_image, n.published_at, n.status, c.name, c.id
      ORDER BY sn.created_at DESC
      LIMIT $2 OFFSET $3
    `;

    const countQuery = `
      SELECT COUNT(DISTINCT sn.id) as total
      FROM saved_news sn
      JOIN news n ON sn.news_id = n.id
      WHERE sn.user_id = $1 AND n.status = 'published'
    `;

    const [savedNewsResult, countResult] = await Promise.all([
      db.query(savedNewsQuery, [userId, limit, offset]),
      db.query(countQuery, [userId]),
    ]);

    const total = parseInt(countResult.rows[0].total);
    const totalPages = Math.ceil(total / limit);

    console.log("=== getSavedNews Debug ===");
    console.log(
      "Raw saved news data:",
      JSON.stringify(savedNewsResult.rows, null, 2)
    );
    console.log("Total items:", total);

    res.json({
      success: true,
      data: savedNewsResult.rows,
      pagination: {
        current_page: parseInt(page),
        total_pages: totalPages,
        total_items: total,
        items_per_page: parseInt(limit),
        has_next: parseInt(page) < totalPages,
        has_prev: parseInt(page) > 1,
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

// Generate News Summary
exports.generateSummary = async (req, res) => {
  try {
    const { newsId } = req.params;

    // Check if summary already exists
    const existingSummary = await db.query(
      "SELECT * FROM news_summaries WHERE news_id = $1",
      [newsId]
    );

    if (existingSummary.rows.length > 0) {
      return res.json({
        success: true,
        data: {
          id: existingSummary.rows[0].id,
          newsId: existingSummary.rows[0].news_id,
          summaryText: existingSummary.rows[0].summary_text,
          keyPoints: existingSummary.rows[0].key_points,
          createdAt: existingSummary.rows[0].created_at,
        },
      });
    }

    // For demo purposes, generate a mock summary
    // In real implementation, this would use AI/ML service
    const mockSummary = `Ringkasan berita ini memberikan poin-poin utama dari artikel yang telah disajikan. 
    
Berita ini membahas topik penting yang relevan dengan masyarakat saat ini. Informasi yang disajikan telah diverifikasi dan bersumber dari narasumber yang kredibel.

Dampak dari peristiwa ini diperkirakan akan mempengaruhi berbagai aspek kehidupan masyarakat, sehingga perlu mendapat perhatian khusus dari berbagai pihak terkait.`;

    const keyPoints = [
      "Topik utama yang dibahas dalam berita",
      "Narasumber kredibel telah dikonfirmasi",
      "Dampak signifikan terhadap masyarakat",
      "Memerlukan perhatian dari pihak terkait",
      "Informasi telah diverifikasi",
    ];

    // Insert summary
    const result = await db.query(
      `INSERT INTO news_summaries (news_id, summary_text, key_points) 
       VALUES ($1, $2, $3) 
       RETURNING *`,
      [newsId, mockSummary, JSON.stringify(keyPoints)]
    );

    res.json({
      success: true,
      data: {
        id: result.rows[0].id,
        newsId: result.rows[0].news_id,
        summaryText: result.rows[0].summary_text,
        keyPoints: result.rows[0].key_points,
        createdAt: result.rows[0].created_at,
      },
    });
  } catch (error) {
    console.error("Error generating summary:", error);
    res.status(500).json({
      success: false,
      message: "Terjadi kesalahan saat membuat ringkasan",
      error: error.message,
    });
  }
};

// Get News Summary
exports.getSummary = async (req, res) => {
  try {
    const { newsId } = req.params;

    const result = await db.query(
      "SELECT * FROM news_summaries WHERE news_id = $1",
      [newsId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Ringkasan tidak ditemukan",
      });
    }

    res.json({
      success: true,
      data: {
        id: result.rows[0].id,
        newsId: result.rows[0].news_id,
        summaryText: result.rows[0].summary_text,
        keyPoints: result.rows[0].key_points,
        createdAt: result.rows[0].created_at,
      },
    });
  } catch (error) {
    console.error("Error getting summary:", error);
    res.status(500).json({
      success: false,
      message: "Terjadi kesalahan saat mengambil ringkasan",
      error: error.message,
    });
  }
};
