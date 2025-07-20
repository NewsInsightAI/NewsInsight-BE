const pool = require("../db");

// Middleware to track page visits
const trackVisit = async (req, res, next) => {
  try {
    const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD format
    const isLoggedIn = req.user ? true : false;

    // Update or insert today's visit data
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
      [
        today,
        isLoggedIn ? 1 : 0, // registered_users_visits
        isLoggedIn ? 0 : 1, // guest_visits
      ]
    );

    next();
  } catch (error) {
    // Don't fail the request if tracking fails
    console.error("Error tracking visit:", error);
    next();
  }
};

module.exports = trackVisit;
