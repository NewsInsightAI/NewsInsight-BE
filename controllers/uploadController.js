const pool = require("../db");
const path = require('path');
const fs = require('fs');

// Upload avatar controller
exports.uploadAvatar = async (req, res) => {
  const userId = req.user.id;
  
  try {
    // Check if file was uploaded
    if (!req.file) {
      return res.status(400).json({
        status: 'error',
        message: 'No file uploaded',
        data: null,
        error: { code: 'NO_FILE' },
        metadata: null
      });
    }

    // Get the uploaded file info
    const filename = req.file.filename;
    const avatarUrl = `/uploads/avatars/${filename}`;

    // Get current avatar to delete old file
    const currentProfile = await pool.query(
      'SELECT avatar FROM profile WHERE user_id = $1',
      [userId]
    );

    // Update avatar in database
    const result = await pool.query(
      `INSERT INTO profile (user_id, avatar, updated_at)
       VALUES ($1, $2, NOW())
       ON CONFLICT (user_id) DO UPDATE SET
         avatar = EXCLUDED.avatar,
         updated_at = NOW()
       RETURNING *`,
      [userId, avatarUrl]
    );

    // Delete old avatar file if it exists and is not the default
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
    
    // Delete uploaded file if database update failed
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

// Delete avatar controller
exports.deleteAvatar = async (req, res) => {
  const userId = req.user.id;
  
  try {
    // Get current avatar
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

    // Update database to remove avatar
    await pool.query(
      'UPDATE profile SET avatar = NULL, updated_at = NOW() WHERE user_id = $1',
      [userId]
    );

    // Delete file if it's an uploaded file
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
