const pool = require("../db");

// Get popular pages analytics
const getPopularPages = async (req, res) => {
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

    const { days = 7, limit = 10 } = req.query;

    const result = await pool.query(
      `
      SELECT 
        page_url,
        page_title,
        SUM(total_visits) as total_visits,
        SUM(unique_visitors) as unique_visitors,
        AVG(avg_duration_seconds) as avg_duration,
        AVG(bounce_rate) as avg_bounce_rate,
        SUM(registered_visits) as registered_visits,
        SUM(guest_visits) as guest_visits
      FROM daily_page_analytics 
      WHERE date >= CURRENT_DATE - INTERVAL '${parseInt(days)} days'
      GROUP BY page_url, page_title
      ORDER BY total_visits DESC
      LIMIT $1
    `,
      [parseInt(limit)]
    );

    const popularPages = result.rows.map((page) => ({
      url: page.page_url,
      title: page.page_title || page.page_url,
      totalVisits: parseInt(page.total_visits),
      uniqueVisitors: parseInt(page.unique_visitors),
      avgDuration: Math.round(page.avg_duration || 0),
      bounceRate: parseFloat(page.avg_bounce_rate || 0).toFixed(1),
      registeredVisits: parseInt(page.registered_visits),
      guestVisits: parseInt(page.guest_visits),
    }));

    res.status(200).json({
      status: "success",
      message: "Popular pages retrieved successfully",
      data: { popularPages },
    });
  } catch (error) {
    console.error("Error getting popular pages:", error);
    res.status(500).json({
      status: "error",
      message: "Internal server error",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

// Get page analytics for specific page
const getPageAnalytics = async (req, res) => {
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

    const { pageUrl, days = 30 } = req.query;

    if (!pageUrl) {
      return res.status(400).json({
        status: "error",
        message: "Page URL is required",
      });
    }

    // Get daily analytics for the page
    const dailyResult = await pool.query(
      `
      SELECT 
        date,
        total_visits,
        unique_visitors,
        avg_duration_seconds,
        bounce_rate,
        registered_visits,
        guest_visits
      FROM daily_page_analytics 
      WHERE page_url = $1 
        AND date >= CURRENT_DATE - INTERVAL '${parseInt(days)} days'
      ORDER BY date ASC
    `,
      [pageUrl]
    );

    // Get recent individual visits for more details
    const recentVisitsResult = await pool.query(
      `
      SELECT 
        visited_at,
        device_type,
        browser,
        referrer,
        user_id,
        duration_seconds
      FROM page_visits 
      WHERE page_url = $1 
        AND visited_at >= NOW() - INTERVAL '7 days'
      ORDER BY visited_at DESC
      LIMIT 50
    `,
      [pageUrl]
    );

    const analytics = {
      pageUrl,
      dailyData: dailyResult.rows.map((row) => ({
        date: row.date,
        visits: parseInt(row.total_visits),
        uniqueVisitors: parseInt(row.unique_visitors),
        avgDuration: parseInt(row.avg_duration_seconds || 0),
        bounceRate: parseFloat(row.bounce_rate || 0),
        registeredVisits: parseInt(row.registered_visits),
        guestVisits: parseInt(row.guest_visits),
      })),
      recentVisits: recentVisitsResult.rows.map((row) => ({
        timestamp: row.visited_at,
        deviceType: row.device_type,
        browser: row.browser,
        referrer: row.referrer,
        isRegistered: row.user_id ? true : false,
        duration: parseInt(row.duration_seconds || 0),
      })),
    };

    res.status(200).json({
      status: "success",
      message: "Page analytics retrieved successfully",
      data: analytics,
    });
  } catch (error) {
    console.error("Error getting page analytics:", error);
    res.status(500).json({
      status: "error",
      message: "Internal server error",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

// Get device and browser analytics
const getDeviceBrowserAnalytics = async (req, res) => {
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

    const { days = 30 } = req.query;

    // Get device type distribution
    const deviceResult = await pool.query(
      `
      SELECT 
        device_type,
        COUNT(*) as count
      FROM page_visits 
      WHERE visited_at >= NOW() - INTERVAL '${parseInt(days)} days'
      GROUP BY device_type
      ORDER BY count DESC
    `
    );

    // Get browser distribution
    const browserResult = await pool.query(
      `
      SELECT 
        browser,
        COUNT(*) as count
      FROM page_visits 
      WHERE visited_at >= NOW() - INTERVAL '${parseInt(days)} days'
      GROUP BY browser
      ORDER BY count DESC
    `
    );

    const analytics = {
      devices: deviceResult.rows.map((row) => ({
        type: row.device_type,
        count: parseInt(row.count),
      })),
      browsers: browserResult.rows.map((row) => ({
        name: row.browser,
        count: parseInt(row.count),
      })),
    };

    res.status(200).json({
      status: "success",
      message: "Device and browser analytics retrieved successfully",
      data: analytics,
    });
  } catch (error) {
    console.error("Error getting device/browser analytics:", error);
    res.status(500).json({
      status: "error",
      message: "Internal server error",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

// Get visit chart data for dashboard
const getVisitChart = async (req, res) => {
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

    const days = parseInt(req.query.days) || 7;

    // Get visitor analytics data for the specified number of days
    const result = await pool.query(
      `
      SELECT 
        date,
        page_views,
        unique_visitors,
        registered_users_visits,
        guest_visits
      FROM visitor_analytics 
      WHERE date >= CURRENT_DATE - INTERVAL '${days} days'
      ORDER BY date ASC
      `
    );

    // If no data exists, return empty array
    if (result.rows.length === 0) {
      return res.json({
        success: true,
        data: [],
        message:
          "Belum ada data kunjungan. Data akan muncul setelah ada aktivitas user.",
      });
    }

    res.json({
      success: true,
      data: result.rows,
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

module.exports = {
  getPopularPages,
  getPageAnalytics,
  getDeviceBrowserAnalytics,
  getVisitChart,
};
