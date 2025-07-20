const express = require("express");
const router = express.Router();
const newsController = require("../controllers/newsController");
const middlewareAuth = require("../middleware/middlewareAuth");
const adminOnly = require("../middleware/adminOnly");
const { trackPageVisit } = require("../middleware/enhancedTrackVisit");

router.get("/public", trackPageVisit, newsController.getAllNews);
router.get("/search", trackPageVisit, newsController.searchNews); // Public search endpoint
router.get(
  "/category/:categorySlug",
  trackPageVisit,
  newsController.getNewsByCategory
);
router.get(
  "/:hashedId/:slug",
  trackPageVisit,
  newsController.getNewsByHashedIdAndSlug
);

router.get("/", middlewareAuth, newsController.getAllNews);
router.get("/:id", middlewareAuth, newsController.getNewsById);
router.post("/", middlewareAuth, newsController.createNews);
router.put("/:id", middlewareAuth, newsController.updateNews);
router.delete("/:id", middlewareAuth, newsController.deleteNews);
router.delete("/", middlewareAuth, newsController.bulkDeleteNews);

module.exports = router;
