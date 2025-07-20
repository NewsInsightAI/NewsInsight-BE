const express = require("express");
const router = express.Router();
const searchController = require("../controllers/searchController");
const middlewareAuth = require("../middleware/middlewareAuth");
const optionalAuth = require("../middleware/optionalAuth");

// Public routes (no authentication required)
router.get("/trending", searchController.getTrendingSearches);
router.get("/popular-news", searchController.getPopularNews);
router.get("/popular-tags", searchController.getPopularTags);

// Routes with optional authentication
router.post("/history", optionalAuth, searchController.saveSearchHistory);

// Protected routes (authentication required)
router.get("/history", middlewareAuth, searchController.getUserSearchHistory);

module.exports = router;
