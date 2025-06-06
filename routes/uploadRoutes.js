const express = require('express');
const router = express.Router();
const middlewareAuth = require('../middleware/middlewareAuth');
const { handleAvatarUpload } = require('../middleware/uploadMiddleware');
const uploadController = require('../controllers/uploadController');

// Upload avatar
router.post('/avatar', middlewareAuth, handleAvatarUpload, uploadController.uploadAvatar);

// Delete avatar
router.delete('/avatar', middlewareAuth, uploadController.deleteAvatar);

module.exports = router;
