const multer = require('multer');
const path = require('path');
const fs = require('fs');


const uploadsDir = path.join(__dirname, '../uploads/avatars');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}


const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    
    const userId = req.user?.id || 'unknown';
    const timestamp = Date.now();
    const extension = path.extname(file.originalname);
    const filename = `avatar-${userId}-${timestamp}${extension}`;
    cb(null, filename);
  }
});


const fileFilter = (req, file, cb) => {
  
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed!'), false);
  }
};


const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 2 * 1024 * 1024, 
  }
});


const uploadAvatar = upload.single('avatar');


const handleAvatarUpload = (req, res, next) => {
  uploadAvatar(req, res, function (err) {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({
          status: 'error',
          message: 'File too large. Maximum size is 2MB.',
          data: null,
          error: { code: 'FILE_TOO_LARGE' },
          metadata: null
        });
      }
      return res.status(400).json({
        status: 'error',
        message: 'File upload error: ' + err.message,
        data: null,
        error: { code: 'UPLOAD_ERROR' },
        metadata: null
      });
    } else if (err) {
      return res.status(400).json({
        status: 'error',
        message: err.message,
        data: null,
        error: { code: 'INVALID_FILE' },
        metadata: null
      });
    }
    next();
  });
};

module.exports = {
  handleAvatarUpload,
  uploadsDir
};
