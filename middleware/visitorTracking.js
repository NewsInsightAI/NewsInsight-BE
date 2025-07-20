const pool = require("../db");

// Track visitor activity for analytics
async function trackVisitor(req, res, next) {
  try {
    // Skip tracking for API routes, static files, and admin routes
    const skipPaths = [
      "/api/",
      "/static/",
      "/_next/",
      "/favicon.",
      "/robots.txt",
      "/sitemap.xml",
      ".css",
      ".js",
      ".png",
      ".jpg",
      ".jpeg",
      ".gif",
      ".svg",
      ".ico",
    ];

    const shouldSkip = skipPaths.some((path) => req.path.includes(path));

    if (shouldSkip) {
      return next();
    }

    // Get visitor info
    const userAgent = req.headers["user-agent"] || "";
    const ip = req.ip || req.connection.remoteAddress || "unknown";
    const page = req.path;
    const referer = req.headers.referer || null;
    const isAuthenticated = !!req.user;
    const userId = req.user ? req.user.userId : null;

    // Detect device type
    const isMobile = /Mobile|Android|iPhone|iPad/i.test(userAgent);
    const deviceType = isMobile ? "mobile" : "desktop";

    // Detect browser
    let browser = "other";
    if (userAgent.includes("Chrome")) browser = "chrome";
    else if (userAgent.includes("Firefox")) browser = "firefox";
    else if (userAgent.includes("Safari")) browser = "safari";
    else if (userAgent.includes("Edge")) browser = "edge";

    // Get today's date
    const today = new Date().toISOString().split("T")[0];

    // Generate session ID from IP and user agent (simple approach)
    const sessionId = require("crypto")
      .createHash("md5")
      .update(ip + userAgent + today)
      .digest("hex");

    // Record page visit
    await pool.query(
      `
      INSERT INTO page_visits (
        user_id, session_id, page_url, user_agent, ip_address, 
        device_type, browser, referrer, visited_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP)
    `,
      [userId, sessionId, page, userAgent, ip, deviceType, browser, referer]
    );

    // Update daily analytics
    await updateDailyAnalytics(today);

    next();
  } catch (error) {
    console.error("Error tracking visitor:", error);
    // Don't block the request if tracking fails
    next();
  }
}

// Update daily analytics aggregation
async function updateDailyAnalytics(date) {
  try {
    const result = await pool.query(
      `
      SELECT 
        COUNT(*) as total_page_views,
        COUNT(DISTINCT ip_address) as unique_visitors,
        COUNT(DISTINCT CASE WHEN user_id IS NOT NULL THEN user_id END) as registered_users_visits,
        COUNT(CASE WHEN user_id IS NULL THEN 1 END) as guest_visits
      FROM page_visits 
      WHERE DATE(visited_at) = $1
    `,
      [date]
    );

    const stats = result.rows[0];

    await pool.query(
      `
      INSERT INTO visitor_analytics (
        date, page_views, unique_visitors, 
        registered_users_visits, guest_visits
      ) VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (date) 
      DO UPDATE SET 
        page_views = $2,
        unique_visitors = $3,
        registered_users_visits = $4,
        guest_visits = $5,
        updated_at = CURRENT_TIMESTAMP
    `,
      [
        date,
        parseInt(stats.total_page_views),
        parseInt(stats.unique_visitors),
        parseInt(stats.registered_users_visits || 0),
        parseInt(stats.guest_visits),
      ]
    );
  } catch (error) {
    console.error("Error updating daily analytics:", error);
  }
}

module.exports = { trackVisitor, updateDailyAnalytics };
