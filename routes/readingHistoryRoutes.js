const express = require("express");
const router = express.Router();
const readingHistoryController = require("../controllers/readingHistoryController");
const authenticateToken = require("../middleware/middlewareAuth");

router.use(authenticateToken);

router.get("/", readingHistoryController.getUserReadingHistory);

router.post("/", readingHistoryController.addReadingHistory);

router.delete("/", readingHistoryController.clearReadingHistory);

router.get("/stats", readingHistoryController.getReadingStats);

module.exports = router;
