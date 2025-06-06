const express = require('express');
const router = express.Router();
const middlewareAuth = require('../middleware/middlewareAuth');
const { handleAvatarUpload } = require('../middleware/uploadMiddleware');
const uploadController = require('../controllers/uploadController');

router.post('/avatar', middlewareAuth, handleAvatarUpload, uploadController.uploadAvatar);
router.delete('/avatar', middlewareAuth, uploadController.deleteAvatar);

module.exports = router;
