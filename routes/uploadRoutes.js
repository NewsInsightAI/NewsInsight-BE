const express = require('express');
const router = express.Router();
const middlewareAuth = require('../middleware/middlewareAuth');
const {
  handleAvatarUpload,
  handleCVUpload,
  handleImageUpload,
} = require("../middleware/uploadMiddleware");
const uploadController = require("../controllers/uploadController");

router.post(
  "/avatar",
  middlewareAuth,
  handleAvatarUpload,
  uploadController.uploadAvatar
);
router.delete("/avatar", middlewareAuth, uploadController.deleteAvatar);
router.post("/cv", middlewareAuth, handleCVUpload, uploadController.uploadCV);
router.delete("/cv", middlewareAuth, uploadController.deleteCV);
router.post(
  "/image",
  middlewareAuth,
  handleImageUpload,
  uploadController.uploadImage
);

module.exports = router;
