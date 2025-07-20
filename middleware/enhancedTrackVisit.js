const pool = require("../db");
const { v4: uuidv4 } = require("uuid");

// Helper function to detect device type
const getDeviceType = (userAgent) => {
  if (!userAgent) return "unknown";

  const ua = userAgent.toLowerCase();
  if (ua.includes("mobile")) return "mobile";
  if (ua.includes("tablet") || ua.includes("ipad")) return "tablet";
  return "desktop";
};

// Helper function to extract browser info
const getBrowser = (userAgent) => {
  if (!userAgent) return "unknown";

  const ua = userAgent.toLowerCase();
  if (ua.includes("chrome")) return "Chrome";
  if (ua.includes("firefox")) return "Firefox";
  if (ua.includes("safari")) return "Safari";
  if (ua.includes("edge")) return "Edge";
  return "Other";
};

// Enhanced middleware to track page visits with detailed analytics
const trackPageVisit = async (req, res, next) => {
  try {
    const today = new Date().toISOString().split("T")[0];
    const isLoggedIn = req.user ? true : false;
    const userId = req.user?.id || null;

    // Generate or get session ID
    let sessionId = req.session?.id || req.headers["x-session-id"] || uuidv4();

    // Get page info
    const pageUrl = req.path || req.url;
    const pageTitle = req.headers["x-page-title"] || null;
    const referrer = req.headers.referer || req.headers.referrer || null;
    const userAgent = req.headers["user-agent"] || null;
    const ipAddress = req.ip || req.connection.remoteAddress;

    // Device and browser detection
    const deviceType = getDeviceType(userAgent);
    const browser = getBrowser(userAgent);

    // Insert individual page visit record
    await pool.query(
      `
      INSERT INTO page_visits (
        user_id, session_id, page_url, page_title, referrer, 
        user_agent, ip_address, device_type, browser, visited_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, CURRENT_TIMESTAMP)
    `,
      [
        userId,
        sessionId,
        pageUrl,
        pageTitle,
        referrer,
        userAgent,
        ipAddress,
        deviceType,
        browser,
      ]
    );

    // Update daily page analytics
    await pool.query(
      `
      INSERT INTO daily_page_analytics (
        date, page_url, page_title, total_visits, unique_visitors, 
        registered_visits, guest_visits, updated_at
      )
      VALUES ($1, $2, $3, 1, 1, $4, $5, CURRENT_TIMESTAMP)
      ON CONFLICT (date, page_url)
      DO UPDATE SET 
        total_visits = daily_page_analytics.total_visits + 1,
        unique_visitors = daily_page_analytics.unique_visitors + 1,
        registered_visits = daily_page_analytics.registered_visits + $4,
        guest_visits = daily_page_analytics.guest_visits + $5,
        page_title = COALESCE($3, daily_page_analytics.page_title),
        updated_at = CURRENT_TIMESTAMP
    `,
      [today, pageUrl, pageTitle, isLoggedIn ? 1 : 0, isLoggedIn ? 0 : 1]
    );

    // Update overall visitor analytics (keep existing functionality)
    await pool.query(
      `
      INSERT INTO visitor_analytics (date, page_views, unique_visitors, registered_users_visits, guest_visits)
      VALUES ($1, 1, 1, $2, $3)
      ON CONFLICT (date)
      DO UPDATE SET 
        page_views = visitor_analytics.page_views + 1,
        unique_visitors = visitor_analytics.unique_visitors + 1,
        registered_users_visits = visitor_analytics.registered_users_visits + $2,
        guest_visits = visitor_analytics.guest_visits + $3,
        updated_at = CURRENT_TIMESTAMP
    `,
      [today, isLoggedIn ? 1 : 0, isLoggedIn ? 0 : 1]
    );

    // Add session ID to response headers for frontend tracking
    res.setHeader("X-Session-ID", sessionId);

    next();
  } catch (error) {
    // Don't fail the request if tracking fails
    console.error("Error tracking page visit:", error);
    next();
  }
};

// Simple tracking middleware (backward compatibility)
const trackVisit = async (req, res, next) => {
  return trackPageVisit(req, res, next);
};

module.exports = { trackPageVisit, trackVisit };
