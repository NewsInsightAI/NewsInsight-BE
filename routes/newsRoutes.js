const express = require("express");
const router = express.Router();
const newsController = require("../controllers/newsController");
const newsSummaryController = require("../controllers/newsSummaryController");
const newsInteractionsController = require("../controllers/newsInteractionsController");
const readingHistoryController = require("../controllers/readingHistoryController");
const middlewareAuth = require("../middleware/middlewareAuth");
const adminOnly = require("../middleware/adminOnly");
const { trackPageVisit } = require("../middleware/enhancedTrackVisit");

// Public routes - no authentication required
router.get("/public", trackPageVisit, newsController.getAllNews);
router.get("/search", trackPageVisit, newsController.searchNews);
router.post("/track-view", readingHistoryController.trackNewsView);

// Summary routes - PALING ATAS untuk hindari konflik
router.get("/summary/:newsId", newsSummaryController.getSummary);
router.post("/summary/:newsId", newsSummaryController.generateSummary);

// Backward compatibility - route lama untuk frontend
router.get("/:newsId/summary", newsSummaryController.getSummary);
router.post("/:newsId/summary", newsSummaryController.generateSummary);

// News interactions routes - specific routes sebelum general routes
router.get(
  "/:newsId/saved-status",
  middlewareAuth,
  newsInteractionsController.checkSavedStatus
);
router.post(
  "/:newsId/save",
  middlewareAuth,
  newsInteractionsController.toggleSaveNews
);

// Static routes
router.get(
  "/category/:categorySlug",
  trackPageVisit,
  newsController.getNewsByCategory
);

// Dynamic routes dengan 2 params - lebih spesifik
router.get(
  "/:hashedId/:slug",
  trackPageVisit,
  newsController.getNewsByHashedIdAndSlug
);

// General routes
router.get("/", middlewareAuth, newsController.getAllNews);

// Status update route - specific route sebelum general :newsId
router.patch("/:newsId/status", middlewareAuth, adminOnly, newsController.updateNewsStatus);

// Single param route - PALING BAWAH karena paling umum
router.get("/:newsId", middlewareAuth, newsController.getNewsById);
router.post("/", middlewareAuth, newsController.createNews);
router.put("/:id", middlewareAuth, newsController.updateNews);
router.delete("/:id", middlewareAuth, newsController.deleteNews);
router.delete("/", middlewareAuth, newsController.bulkDeleteNews);

module.exports = router;
