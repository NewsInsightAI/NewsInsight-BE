const express = require("express");
const router = express.Router();

const userRoutes = require("./usersRoutes");
const authRoutes = require("./authRoutes");
const profileRoutes = require("./profileRoutes");

router.use("/users", userRoutes);
router.use("/auth", authRoutes);
router.use("/profile", profileRoutes);

module.exports = router;
