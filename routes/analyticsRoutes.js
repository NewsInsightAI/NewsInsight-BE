const express = require("express");
const router = express.Router();
const analyticsController = require("../controllers/analyticsController");
const middlewareAuth = require("../middleware/middlewareAuth");

// Popular pages analytics (admin only)
router.get(
  "/popular-pages",
  middlewareAuth,
  analyticsController.getPopularPages
);

// Specific page analytics (admin only)
router.get("/page", middlewareAuth, analyticsController.getPageAnalytics);

// Device and browser analytics (admin only)
router.get(
  "/devices-browsers",
  middlewareAuth,
  analyticsController.getDeviceBrowserAnalytics
);

// Visit chart data for dashboard (admin only)
router.get("/visit-chart", middlewareAuth, analyticsController.getVisitChart);

// Alias routes for frontend compatibility
router.get(
  "/device-stats",
  middlewareAuth,
  analyticsController.getDeviceBrowserAnalytics
);
router.get(
  "/browser-stats",
  middlewareAuth,
  analyticsController.getDeviceBrowserAnalytics
);

module.exports = router;
