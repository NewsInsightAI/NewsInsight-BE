const pool = require("../db");

// Get dashboard statistics
const getDashboardStats = async (req, res) => {
  try {
    // Check if user is admin
    if (!req.user || req.user.role !== "admin") {
      return res.status(403).json({
        status: "error",
        message: "Akses hanya untuk admin",
        data: null,
        error: { code: "FORBIDDEN" },
        metadata: null,
      });
    }

    // Get today's date range
    const today = new Date();
    const startOfDay = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate()
    );
    const endOfDay = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate() + 1
    );

    // Parallel queries for better performance
    const [
      totalArticlesResult,
      totalCommentsResult,
      totalUsersResult,
      activeUsersResult,
      todayVisitsResult,
      popularNewsResult,
      topEditorsResult,
    ] = await Promise.all([
      // Total published articles
      pool.query(`
        SELECT COUNT(*) as total 
        FROM news 
        WHERE status = 'published'
      `),

      // Total comments (today)
      pool.query(
        `
        SELECT COUNT(*) as total 
        FROM comments 
        WHERE created_at >= $1 AND created_at < $2
      `,
        [startOfDay, endOfDay]
      ),

      // Total registered users
      pool.query(`
        SELECT COUNT(*) as total 
        FROM users
      `),

      // Active users (users with recent activity - using updated_at as proxy)
      pool.query(
        `
        SELECT COUNT(*) as total 
        FROM users 
        WHERE updated_at >= $1
      `,
        [new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)]
      ),

      // Today's page visits (from visitor_analytics table)
      pool.query(
        `
        SELECT 
          COALESCE(page_views, 0) as total_visits,
          COALESCE(unique_visitors, 0) as unique_visitors,
          COALESCE(registered_users_visits, 0) as registered_visits,
          COALESCE(guest_visits, 0) as guest_visits
        FROM visitor_analytics 
        WHERE date = CURRENT_DATE
      `
      ),

      // Popular news (most viewed in last 30 days)
      pool.query(
        `
        SELECT 
          n.id,
          n.title,
          n.hashed_id,
          n.featured_image,
          n.view_count,
          c.name as category_name
        FROM news n
        LEFT JOIN categories c ON n.category_id = c.id
        WHERE n.status = 'published' 
          AND n.created_at >= $1
        ORDER BY n.view_count DESC
        LIMIT 5
      `,
        [new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)]
      ),

      // Top editors (users with role 'editor' who have published the most articles)
      pool.query(`
        SELECT 
          u.id,
          p.full_name,
          u.username,
          p.avatar,
          COUNT(n.id) as article_count
        FROM users u
        LEFT JOIN profile p ON u.id = p.user_id
        INNER JOIN news n ON u.id = n.created_by AND n.status = 'published'
        WHERE u.role = 'editor'
        GROUP BY u.id, p.full_name, u.username, p.avatar
        ORDER BY article_count DESC
        LIMIT 5
      `),
    ]);

    // Calculate today's visits from real data
    const todayVisits = parseInt(todayVisitsResult.rows[0]?.total_visits || 0);
    const uniqueVisitors = parseInt(
      todayVisitsResult.rows[0]?.unique_visitors || 0
    );

    // Calculate monthly visitors (last 30 days)
    const monthlyVisitorsResult = await pool.query(
      `
      SELECT 
        COALESCE(SUM(unique_visitors), 0) as monthly_unique_visitors,
        COALESCE(SUM(page_views), 0) as monthly_page_views
      FROM visitor_analytics 
      WHERE date >= CURRENT_DATE - INTERVAL '30 days'
    `
    );

    const monthlyVisitors = parseInt(
      monthlyVisitorsResult.rows[0]?.monthly_unique_visitors || 0
    );

    // Format the response
    const dashboardStats = {
      quickInfo: {
        totalPublishedArticles: parseInt(
          totalArticlesResult.rows[0]?.total || 0
        ),
        totalNewComments: parseInt(totalCommentsResult.rows[0]?.total || 0),
        totalVisitors: monthlyVisitors, // Monthly unique visitors
        totalActiveUsers: parseInt(activeUsersResult.rows[0]?.total || 0),
      },
      todayVisits: {
        count: todayVisits,
        lastUpdated:
          new Date().toLocaleTimeString("id-ID", {
            hour: "2-digit",
            minute: "2-digit",
            timeZone: "Asia/Jakarta",
          }) + " WIB",
      },
      popularNews: popularNewsResult.rows.map((news) => ({
        id: news.id,
        title: news.title,
        hashed_id: news.hashed_id,
        featured_image: news.featured_image,
        category_name: news.category_name,
        view_count: news.view_count,
      })),
      topEditors: topEditorsResult.rows.map((editor) => ({
        id: editor.id,
        name: editor.full_name || editor.username || "Unknown Editor",
        avatar: editor.avatar,
        countArticles: parseInt(editor.article_count),
      })),
    };

    res.status(200).json({
      status: "success",
      message: "Dashboard statistics retrieved successfully",
      data: dashboardStats,
    });
  } catch (error) {
    console.error("Error getting dashboard stats:", error);
    res.status(500).json({
      status: "error",
      message: "Internal server error",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

// Get visit chart data (last 7 days)
const getVisitChartData = async (req, res) => {
  try {
    // Check if user is admin
    if (!req.user || req.user.role !== "admin") {
      return res.status(403).json({
        status: "error",
        message: "Akses hanya untuk admin",
        data: null,
        error: { code: "FORBIDDEN" },
        metadata: null,
      });
    }

    // Get visit data for the last 7 days from visitor_analytics table
    const chartDataResult = await pool.query(
      `
      SELECT 
        date,
        COALESCE(page_views, 0) as visits,
        COALESCE(unique_visitors, 0) as unique_visitors
      FROM visitor_analytics 
      WHERE date >= CURRENT_DATE - INTERVAL '6 days'
      ORDER BY date ASC
    `
    );

    const chartData = chartDataResult.rows.map((row) => ({
      date: row.date.toISOString().split("T")[0],
      day: new Date(row.date).toLocaleDateString("id-ID", { weekday: "short" }),
      visits: parseInt(row.visits),
      uniqueVisitors: parseInt(row.unique_visitors),
    }));

    // Fill missing dates with 0 if needed
    const today = new Date();
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split("T")[0];

      if (!chartData.find((item) => item.date === dateStr)) {
        chartData.push({
          date: dateStr,
          day: date.toLocaleDateString("id-ID", { weekday: "short" }),
          visits: 0,
          uniqueVisitors: 0,
        });
      }
    }

    // Sort by date
    chartData.sort((a, b) => new Date(a.date) - new Date(b.date));

    res.status(200).json({
      status: "success",
      message: "Visit chart data retrieved successfully",
      data: { chartData },
    });
  } catch (error) {
    console.error("Error getting visit chart data:", error);
    res.status(500).json({
      status: "error",
      message: "Internal server error",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

// Get popular categories
const getPopularCategories = async (req, res) => {
  try {
    // Check if user is admin
    if (!req.user || req.user.role !== "admin") {
      return res.status(403).json({
        status: "error",
        message: "Akses hanya untuk admin",
        data: null,
        error: { code: "FORBIDDEN" },
        metadata: null,
      });
    }

    const result = await pool.query(`
      SELECT 
        c.name,
        COUNT(n.id) as news_count
      FROM categories c
      LEFT JOIN news n ON c.id = n.category_id AND n.status = 'published'
      WHERE c.is_active = true
      GROUP BY c.id, c.name
      HAVING COUNT(n.id) > 0
      ORDER BY news_count DESC
      LIMIT 5
    `);

    const popularCategories = result.rows.map((cat) => cat.name);

    res.status(200).json({
      status: "success",
      message: "Popular categories retrieved successfully",
      data: { popularCategories },
    });
  } catch (error) {
    console.error("Error getting popular categories:", error);
    res.status(500).json({
      status: "error",
      message: "Internal server error",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

module.exports = {
  getDashboardStats,
  getVisitChartData,
  getPopularCategories,
};
