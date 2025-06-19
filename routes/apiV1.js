const express = require("express");
const router = express.Router();

const userRoutes = require("./usersRoutes");
const authRoutes = require("./authRoutes");
const profileRoutes = require("./profileRoutes");
const uploadRoutes = require("./uploadRoutes");
const citiesRoutes = require("./citiesRoutes");
const mfaRoutes = require("./mfaRoutes");
const categoriesRoutes = require("./categoriesRoutes");

router.use("/users", userRoutes);
router.use("/auth", authRoutes);
router.use("/profile", profileRoutes);
router.use("/upload", uploadRoutes);
router.use("/cities", citiesRoutes);
router.use("/mfa", mfaRoutes);
router.use("/categories", categoriesRoutes);

module.exports = router;
