const pool = require("../db");
const path = require('path');
const fs = require('fs');


exports.uploadAvatar = async (req, res) => {
  const userId = req.user.id;
  
  try {
    
    if (!req.file) {
      return res.status(400).json({
        status: 'error',
        message: 'No file uploaded',
        data: null,
        error: { code: 'NO_FILE' },
        metadata: null
      });
    }

    
    const filename = req.file.filename;
    const avatarUrl = `/uploads/avatars/${filename}`;

    
    const currentProfile = await pool.query(
      'SELECT avatar FROM profile WHERE user_id = $1',
      [userId]
    );

    
    const result = await pool.query(
      `INSERT INTO profile (user_id, avatar, updated_at)
       VALUES ($1, $2, NOW())
       ON CONFLICT (user_id) DO UPDATE SET
         avatar = EXCLUDED.avatar,
         updated_at = NOW()
       RETURNING *`,
      [userId, avatarUrl]
    );

    
    if (currentProfile.rows.length > 0 && currentProfile.rows[0].avatar) {
      const oldAvatar = currentProfile.rows[0].avatar;
      if (oldAvatar.startsWith('/uploads/avatars/')) {
        const oldFilePath = path.join(__dirname, '../uploads/avatars', path.basename(oldAvatar));
        if (fs.existsSync(oldFilePath)) {
          fs.unlinkSync(oldFilePath);
        }
      }
    }

    res.json({
      status: 'success',
      message: 'Avatar uploaded successfully',
      data: {
        avatar: avatarUrl,
        filename: filename
      },
      error: null,
      metadata: null
    });

  } catch (error) {
    console.error('Avatar upload error:', error);
    
    
    if (req.file) {
      const filePath = req.file.path;
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }

    res.status(500).json({
      status: 'error',
      message: 'Failed to upload avatar',
      data: null,
      error: { code: 'SERVER_ERROR' },
      metadata: null
    });
  }
};


exports.deleteAvatar = async (req, res) => {
  const userId = req.user.id;
  
  try {
    
    const currentProfile = await pool.query(
      'SELECT avatar FROM profile WHERE user_id = $1',
      [userId]
    );

    if (currentProfile.rows.length === 0 || !currentProfile.rows[0].avatar) {
      return res.status(404).json({
        status: 'error',
        message: 'No avatar found',
        data: null,
        error: { code: 'NO_AVATAR' },
        metadata: null
      });
    }

    const currentAvatar = currentProfile.rows[0].avatar;

    
    await pool.query(
      'UPDATE profile SET avatar = NULL, updated_at = NOW() WHERE user_id = $1',
      [userId]
    );

    
    if (currentAvatar.startsWith('/uploads/avatars/')) {
      const filePath = path.join(__dirname, '../uploads/avatars', path.basename(currentAvatar));
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }

    res.json({
      status: 'success',
      message: 'Avatar deleted successfully',
      data: null,
      error: null,
      metadata: null
    });

  } catch (error) {
    console.error('Avatar delete error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to delete avatar',
      data: null,
      error: { code: 'SERVER_ERROR' },
      metadata: null
    });
  }
};

// CV Upload functionality
exports.uploadCV = async (req, res) => {
  const userId = req.user.id;
  
  try {
    // Check if file was uploaded
    if (!req.file) {
      return res.status(400).json({
        status: 'error',
        message: 'No CV file uploaded',
        data: null,
        error: { code: 'NO_FILE' },
        metadata: null
      });
    }

    // Check file type (only PDF allowed)
    if (req.file.mimetype !== 'application/pdf') {
      // Delete the uploaded file if it's not PDF
      if (fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      return res.status(400).json({
        status: 'error',
        message: 'Only PDF files are allowed for CV upload',
        data: null,
        error: { code: 'INVALID_FILE_TYPE' },
        metadata: null
      });
    }

    const filename = req.file.filename;
    const cvUrl = `/uploads/cv/${filename}`;

    // Check for existing CV and delete it
    const currentProfile = await pool.query(
      'SELECT cv_file FROM profile WHERE user_id = $1',
      [userId]
    );

    // Update profile with new CV
    const result = await pool.query(
      `INSERT INTO profile (user_id, cv_file, updated_at)
       VALUES ($1, $2, NOW())
       ON CONFLICT (user_id) DO UPDATE SET
         cv_file = EXCLUDED.cv_file,
         updated_at = NOW()
       RETURNING *`,
      [userId, cvUrl]
    );

    // Delete old CV file if it exists
    if (currentProfile.rows.length > 0 && currentProfile.rows[0].cv_file) {
      const oldCV = currentProfile.rows[0].cv_file;
      if (oldCV.startsWith('/uploads/cv/')) {
        const oldFilePath = path.join(__dirname, '../uploads/cv', path.basename(oldCV));
        if (fs.existsSync(oldFilePath)) {
          fs.unlinkSync(oldFilePath);
        }
      }
    }

    res.json({
      status: 'success',
      message: 'CV uploaded successfully',
      data: {
        cv_file: cvUrl,
        filename: filename
      },
      error: null,
      metadata: null
    });

  } catch (error) {
    console.error('CV upload error:', error);
    
    // Clean up uploaded file on error
    if (req.file) {
      const filePath = req.file.path;
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }

    res.status(500).json({
      status: 'error',
      message: 'Failed to upload CV',
      data: null,
      error: { code: 'SERVER_ERROR' },
      metadata: null
    });
  }
};

exports.deleteCV = async (req, res) => {
  const userId = req.user.id;
  
  try {
    // Get current CV
    const currentProfile = await pool.query(
      'SELECT cv_file FROM profile WHERE user_id = $1',
      [userId]
    );

    if (currentProfile.rows.length === 0 || !currentProfile.rows[0].cv_file) {
      return res.status(404).json({
        status: 'error',
        message: 'No CV found',
        data: null,
        error: { code: 'NO_CV' },
        metadata: null
      });
    }

    const currentCV = currentProfile.rows[0].cv_file;

    // Update profile to remove CV
    await pool.query(
      'UPDATE profile SET cv_file = NULL, updated_at = NOW() WHERE user_id = $1',
      [userId]
    );

    // Delete file from filesystem
    if (currentCV.startsWith('/uploads/cv/')) {
      const filePath = path.join(__dirname, '../uploads/cv', path.basename(currentCV));
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }

    res.json({
      status: 'success',
      message: 'CV deleted successfully',
      data: null,
      error: null,
      metadata: null
    });

  } catch (error) {
    console.error('CV delete error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to delete CV',
      data: null,
      error: { code: 'SERVER_ERROR' },
      metadata: null
    });
  }
};
