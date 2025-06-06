const express = require("express");
const router = express.Router();

const userRoutes = require("./usersRoutes");
const authRoutes = require("./authRoutes");
const profileRoutes = require("./profileRoutes");
const uploadRoutes = require("./uploadRoutes");

router.use("/users", userRoutes);
router.use("/auth", authRoutes);
router.use("/profile", profileRoutes);
router.use("/upload", uploadRoutes);

module.exports = router;
