const express = require("express");
const router = express.Router();
const commentsController = require("../controllers/commentsController");
const middlewareAuth = require("../middleware/middlewareAuth");
const adminOnly = require("../middleware/adminOnly");

// Public routes for frontend comment functionality
router.get("/news/:newsId", commentsController.getCommentsForNews);
router.post("/", commentsController.createComment);
router.post("/:parent_id/reply", commentsController.createReply);
router.post("/:id/like", commentsController.likeComment);
router.get("/:id/likes", commentsController.getCommentLikes);
router.post("/:id/report", commentsController.reportComment);
router.delete("/:id/delete", commentsController.deleteUserComment); // New route for users to delete their own comments

// Admin routes
router.get("/", middlewareAuth, commentsController.getAllComments);
router.get("/:id", middlewareAuth, commentsController.getCommentById);
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
