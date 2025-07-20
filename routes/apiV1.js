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

router.use("/users", userRoutes);
router.use("/auth", authRoutes);
router.use("/profile", profileRoutes);
router.use("/upload", uploadRoutes);
router.use("/cities", citiesRoutes);
router.use("/mfa", mfaRoutes);
router.use("/categories", categoriesRoutes);
router.use("/", newsInteractionsRoutes); // Base path untuk news interactions - HARUS SEBELUM newsRoutes
router.use("/news", newsRoutes);
router.use("/comments", commentsRoutes);
router.use("/bookmarks", bookmarksRoutes);
router.use("/reading-history", readingHistoryRoutes);
router.use("/search", searchRoutes);
router.use("/dashboard", dashboardRoutes);
router.use("/analytics", analyticsRoutes);

module.exports = router;
