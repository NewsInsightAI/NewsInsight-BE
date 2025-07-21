const express = require("express");
const router = express.Router();
const readingHistoryController = require("../controllers/readingHistoryController");
const authenticateToken = require("../middleware/middlewareAuth");

// Public route for tracking news views (doesn't require authentication)
router.post("/track-view", readingHistoryController.trackNewsView);

// All other routes require authentication
router.use(authenticateToken);

router.get("/", readingHistoryController.getUserReadingHistory);

router.post("/", readingHistoryController.addReadingHistory);

router.delete("/", readingHistoryController.clearReadingHistory);

router.get("/stats", readingHistoryController.getReadingStats);

module.exports = router;
