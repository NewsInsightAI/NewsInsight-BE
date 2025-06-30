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

router.use("/users", userRoutes);
router.use("/auth", authRoutes);
router.use("/profile", profileRoutes);
router.use("/upload", uploadRoutes);
router.use("/cities", citiesRoutes);
router.use("/mfa", mfaRoutes);
router.use("/categories", categoriesRoutes);
router.use("/news", newsRoutes);
router.use("/comments", commentsRoutes);
router.use("/bookmarks", bookmarksRoutes);
router.use("/reading-history", readingHistoryRoutes);

module.exports = router;
