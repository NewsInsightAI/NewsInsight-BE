const express = require("express");
const router = express.Router();

const userRoutes = require("./usersRoutes");
const authRoutes = require("./authRoutes");
const profileRoutes = require("./profileRoutes");
const uploadRoutes = require("./uploadRoutes");
const citiesRoutes = require("./citiesRoutes");
const mfaRoutes = require("./mfaRoutes");
const categoriesRoutes = require("./categoriesRoutes");
const newsRoutes = require("./newsRoutes");
const commentsRoutes = require("./commentsRoutes");
const bookmarksRoutes = require("./bookmarksRoutes");
const readingHistoryRoutes = require("./readingHistoryRoutes");
const searchRoutes = require("./searchRoutes");
const dashboardRoutes = require("./dashboardRoutes");
const analyticsRoutes = require("./analyticsRoutes");
const newsInteractionsRoutes = require("./newsInteractionsRoutes");
const commentAnalysisRoutes = require("./commentAnalysisRoutes");
const factCheckRoutes = require("./factCheckRoutes");

// Debug middleware untuk melihat request yang masuk
router.use((req, res, next) => {
  console.log("[apiV1] Request:", req.method, req.path);
  next();
});

router.use("/users", userRoutes);
router.use("/auth", authRoutes);
router.use("/profile", profileRoutes);
router.use("/upload", uploadRoutes);
router.use("/cities", citiesRoutes);
router.use("/mfa", mfaRoutes);
router.use("/categories", categoriesRoutes);
router.use("/news", newsRoutes); // newsRoutes untuk /news/:id, /news/:id/summary, dll
router.use("/comments", commentsRoutes);
router.use("/bookmarks", bookmarksRoutes);
router.use("/reading-history", readingHistoryRoutes);
router.use("/search", searchRoutes);
router.use("/dashboard", dashboardRoutes);
router.use("/analytics", analyticsRoutes);
router.use("/comment-analysis", commentAnalysisRoutes);
router.use("/fact-check", factCheckRoutes);
router.use("/", newsInteractionsRoutes); // Base path untuk news interactions - HARUS PALING TERAKHIR

module.exports = router;
