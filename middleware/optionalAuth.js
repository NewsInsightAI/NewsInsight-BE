const jwt = require("jsonwebtoken");
const pool = require("../db");

// Optional authentication middleware - continues even if no token or invalid token
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      // No token provided, continue without user info
      req.user = null;
      return next();
    }

    const token = authHeader.substring(7);

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Get user from database
      const userResult = await pool.query(
        "SELECT id, email, username, role, email_verified FROM users WHERE id = $1",
        [decoded.userId]
      );

      if (userResult.rows.length > 0) {
        req.user = userResult.rows[0];
      } else {
        req.user = null;
      }
    } catch (jwtError) {
      // Invalid token, continue without user info
      req.user = null;
    }

    next();
  } catch (error) {
    // On any error, continue without user info
    req.user = null;
    next();
  }
};

module.exports = optionalAuth;
