const express = require("express");
const router = express.Router();
const newsInteractionsController = require("../controllers/newsInteractionsController");
const authenticateToken = require("../middleware/middlewareAuth");

// Debug middleware untuk melihat request yang masuk
router.use((req, res, next) => {
  console.log("[newsInteractionsRoutes] Request:", req.method, req.path);
  next();
});

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

module.exports = router;
