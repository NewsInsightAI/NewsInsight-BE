const express = require("express");
const router = express.Router();
const {
  analyzeComment,
  batchAnalyzeComments,
  getAnalysisConfig,
} = require("../controllers/commentAnalysisController");

// Middleware for JSON parsing (if not already set globally)
router.use(express.json());

/**
 * @route POST /api/comment-analysis/analyze
 * @desc Analyze a single comment for toxicity
 * @access Public
 * @body { text: string }
 */
router.post("/analyze", analyzeComment);

/**
 * @route POST /api/comment-analysis/batch-analyze
 * @desc Analyze multiple comments for toxicity
 * @access Public
 * @body { texts: string[] }
 */
router.post("/batch-analyze", batchAnalyzeComments);

/**
 * @route GET /api/comment-analysis/config
 * @desc Get analysis configuration
 * @access Public
 */
router.get("/config", getAnalysisConfig);

module.exports = router;
