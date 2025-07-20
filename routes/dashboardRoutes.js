const express = require("express");
const router = express.Router();
const dashboardController = require("../controllers/dashboardController");
const middlewareAuth = require("../middleware/middlewareAuth");

// Dashboard statistics (admin only)
router.get("/stats", middlewareAuth, dashboardController.getDashboardStats);

// Dashboard chart data (admin only)
router.get(
  "/chart-data",
  middlewareAuth,
  dashboardController.getVisitChartData
);

// Popular categories (admin only)
router.get(
  "/popular-categories",
  middlewareAuth,
  dashboardController.getPopularCategories
);

module.exports = router;
