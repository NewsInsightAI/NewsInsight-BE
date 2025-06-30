const express = require("express");
const router = express.Router();
const commentsController = require("../controllers/commentsController");
const middlewareAuth = require("../middleware/middlewareAuth");
const adminOnly = require("../middleware/adminOnly");

router.get("/news/:newsId", commentsController.getAllComments);

router.get("/", middlewareAuth, commentsController.getAllComments);
router.get("/:id", middlewareAuth, commentsController.getCommentById);
router.post("/", commentsController.createComment);
router.put("/:id", middlewareAuth, commentsController.updateComment);
router.patch("/:id/approve", middlewareAuth, commentsController.approveComment);
router.patch("/:id/reject", middlewareAuth, commentsController.rejectComment);
router.delete("/:id", middlewareAuth, commentsController.deleteComment);

router.delete(
  "/",
  middlewareAuth,
  adminOnly,
  commentsController.bulkDeleteComments
);
router.put("/", middlewareAuth, adminOnly, commentsController.bulkUpdateStatus);

module.exports = router;
