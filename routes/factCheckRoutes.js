const express = require("express");
const router = express.Router();
const FactCheckController = require("../controllers/factCheckController");
const middlewareAuth = require("../middleware/middlewareAuth");
const adminOnly = require("../middleware/adminOnly");

// Debug middleware
router.use((req, res, next) => {
  console.log("[factCheckRoutes] Request:", req.method, req.path);
  next();
});

// Single news fact check - requires authentication and admin role
router.post(
  "/:newsId/check",
  middlewareAuth,
  adminOnly,
  FactCheckController.checkNews
);

// Batch fact check multiple news - requires authentication and admin role
router.post(
  "/batch-check",
  middlewareAuth,
  adminOnly,
  FactCheckController.batchCheckNews
);

// Get fact check history for a news article - requires authentication and admin role
router.get(
  "/:newsId/history",
  middlewareAuth,
  adminOnly,
  FactCheckController.getFactCheckHistory
);

module.exports = router;
