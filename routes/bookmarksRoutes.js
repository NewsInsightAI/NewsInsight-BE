const express = require("express");
const router = express.Router();
const bookmarksController = require("../controllers/bookmarksController");
const authenticateToken = require("../middleware/middlewareAuth");

router.use(authenticateToken);

router.get("/", bookmarksController.getUserBookmarks);

router.post("/", bookmarksController.addBookmark);

router.delete("/:news_id", bookmarksController.removeBookmark);

router.get("/check/:news_id", bookmarksController.checkBookmark);

module.exports = router;
