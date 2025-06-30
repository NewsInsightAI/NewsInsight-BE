const express = require("express");
const router = express.Router();
const newsController = require("../controllers/newsController");
const middlewareAuth = require("../middleware/middlewareAuth");
const adminOnly = require("../middleware/adminOnly");

router.get("/public", newsController.getAllNews);
router.get("/category/:categorySlug", newsController.getNewsByCategory);
router.get("/:hashedId/:slug", newsController.getNewsByHashedIdAndSlug);

router.get("/", middlewareAuth, newsController.getAllNews);
router.get("/:id", middlewareAuth, newsController.getNewsById);
router.post("/", middlewareAuth, newsController.createNews);
router.put("/:id", middlewareAuth, newsController.updateNews);
router.delete("/:id", middlewareAuth, newsController.deleteNews);
router.delete("/", middlewareAuth, newsController.bulkDeleteNews);

module.exports = router;
