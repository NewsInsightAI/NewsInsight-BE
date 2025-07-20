const express = require("express");
const router = express.Router();
const newsSummaryController = require("../controllers/newsSummaryController");
const middlewareAuth = require("../middleware/middlewareAuth");

// POST /api/v1/news/:newsId/summary - Generate news summary
router.post(
  "/:newsId/summary",
  middlewareAuth,
  newsSummaryController.generateSummary
);

// GET /api/v1/news/:newsId/summary - Get existing summary
router.get(
  "/:newsId/summary",
  middlewareAuth,
  newsSummaryController.getSummary
);

module.exports = router;
