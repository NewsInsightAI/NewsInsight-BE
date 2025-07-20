const express = require("express");
const router = express.Router();
const newsInteractionsController = require("../controllers/newsInteractionsController");
const authenticateToken = require("../middleware/middlewareAuth");

// Save/Unsave News Routes
router.post(
  "/news/:newsId/save",
  authenticateToken,
  newsInteractionsController.toggleSaveNews
);
router.get(
  "/news/:newsId/saved-status",
  authenticateToken,
  newsInteractionsController.checkSavedStatus
);
router.get(
  "/saved-news",
  authenticateToken,
  newsInteractionsController.getSavedNews
);

// Report News Routes
router.post(
  "/news/:newsId/report",
  authenticateToken,
  newsInteractionsController.reportNews
);

// Share News Routes (tracking)
router.post("/news/:newsId/share", newsInteractionsController.trackNewsShare); // No auth required for guest tracking

// Summary Routes
router.post(
  "/news/:newsId/summary",
  newsInteractionsController.generateSummary
); // No auth required
router.get("/news/:newsId/summary", newsInteractionsController.getSummary); // No auth required

module.exports = router;
