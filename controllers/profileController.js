const pool = require("../db");


exports.getAllProfiles = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT p.*, u.email, u.username FROM profile p JOIN users u ON p.user_id = u.id`
    );
    res.json({
      status: "success",
      message: "Daftar profile berhasil diambil",
      data: result.rows,
      error: null,
      metadata: null
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      status: "error",
      message: "Server error",
      data: null,
      error: { code: "SERVER_ERROR" },
      metadata: null
    });
  }
};


exports.getProfileByUserId = async (req, res) => {
  const { userId } = req.params;
  try {
    const result = await pool.query(
      `SELECT p.*, u.email, u.username FROM profile p JOIN users u ON p.user_id = u.id WHERE p.user_id = $1`,
      [userId]
    );
    if (result.rows.length === 0) return res.status(404).json({
      status: "error",
      message: "Profile not found",
      data: null,
      error: { code: "PROFILE_NOT_FOUND" },
      metadata: null
    });
    res.json({
      status: "success",
      message: "Profile ditemukan",
      data: result.rows[0],
      error: null,
      metadata: null
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      status: "error",
      message: "Server error",
      data: null,
      error: { code: "SERVER_ERROR" },
      metadata: null
    });
  }
};


exports.getMyProfile = async (req, res) => {  const userId = req.user.id; 
  
  try {
    const result = await pool.query(
      `SELECT p.*, u.email, u.username FROM profile p JOIN users u ON p.user_id = u.id WHERE p.user_id = $1`,
      [userId]
    );
      if (result.rows.length === 0) {
      
      await pool.query(
        "INSERT INTO profile (user_id, created_at, updated_at) VALUES ($1, NOW(), NOW())",
        [userId]
      );
      
      
      const userResult = await pool.query(
        "SELECT email, username FROM users WHERE id = $1",
        [userId]
      );
      
      if (userResult.rows.length === 0) {
        return res.status(404).json({
          status: "error",
          message: "User not found",
          data: null,
          error: { code: "USER_NOT_FOUND" },
          metadata: null
        });
      }        const emptyProfile = {
        user_id: userId,
        full_name: null,
        gender: null,
        date_of_birth: null,
        phone_number: null,
        domicile: null,
        news_interest: null,
        headline: null,
        biography: null,
        avatar: null,
        last_education: null,
        work_experience: null,
        cv_file: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        email: userResult.rows[0].email,
        username: userResult.rows[0].username || null,
      };
      
      return res.json({
        status: "success",
        message: "Profile ditemukan (kosong)",
        data: emptyProfile,
        error: null,
        metadata: { isEmpty: true }
      });    }
    
    res.json({
      status: "success",
      message: "Profile ditemukan",
      data: result.rows[0],
      error: null,      metadata: { isEmpty: false }
    });
  } catch (err) {
    console.error("Get profile error:", err);
    res.status(500).json({
      status: "error",
      message: "Server error",
      data: null,
      error: { code: "SERVER_ERROR" },
      metadata: null
    });
  }
}


exports.upsertProfile = async (req, res) => {
  const { userId } = req.params;
  const {
    full_name,
    gender,
    date_of_birth,
    phone_number,
    domicile,
    news_interest,
    headline,
    biography,
    avatar  } = req.body;
  
  let processedNewsInterest = news_interest;
  
  console.log("Processing news interest, type:", typeof news_interest);
  
  if (typeof news_interest === 'string') {
    try {
      
      const newsInterestArray = JSON.parse(news_interest);
      console.log("Parsed news interest array:", newsInterestArray);
        if (Array.isArray(newsInterestArray)) {
        
        const values = newsInterestArray.map(item => {
          if (typeof item === 'object' && item.value) {
            return item.value; 
          }
          return item; 
        });
        processedNewsInterest = values;
        console.log("Extracted values:", values);
      }
    } catch (error) {
      console.error("Error parsing news_interest:", error);
      processedNewsInterest = []; 
    }
  } else if (Array.isArray(news_interest)) {
    console.log("News interest is already an array:", news_interest);
    
    const values = news_interest.map(item => {
      if (typeof item === 'object' && item.value) {
        return item.value; 
      }
      return item; 
    });
    processedNewsInterest = values;
    console.log("Extracted values from array:", values);
  }
  
  console.log("Final processed news interest:", processedNewsInterest);

  try {
    const result = await pool.query(
      `INSERT INTO profile (user_id, full_name, gender, date_of_birth, phone_number, domicile, news_interest, headline, biography, avatar, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())
       ON CONFLICT (user_id) DO UPDATE SET
         full_name = EXCLUDED.full_name,
         gender = EXCLUDED.gender,
         date_of_birth = EXCLUDED.date_of_birth,
         phone_number = EXCLUDED.phone_number,
         domicile = EXCLUDED.domicile,
         news_interest = EXCLUDED.news_interest,
         headline = EXCLUDED.headline,
         biography = EXCLUDED.biography,
         avatar = EXCLUDED.avatar,
         updated_at = NOW()
       RETURNING *`,
      [userId, full_name, gender, date_of_birth, phone_number, domicile, processedNewsInterest, headline, biography, avatar]
    );
    res.json({
      status: "success",
      message: "Profile berhasil disimpan",
      data: result.rows[0],
      error: null,
      metadata: null
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      status: "error",
      message: "Server error",
      data: null,
      error: { code: "SERVER_ERROR" },
      metadata: null
    });
  }
};


exports.deleteProfile = async (req, res) => {
  const { userId } = req.params;
  try {
    const result = await pool.query(
      `DELETE FROM profile WHERE user_id = $1 RETURNING *`,
      [userId]
    );
    if (result.rows.length === 0) return res.status(404).json({
      status: "error",
      message: "Profile not found",
      data: null,
      error: { code: "PROFILE_NOT_FOUND" },
      metadata: null
    });
    res.json({
      status: "success",
      message: "Profile berhasil dihapus",
      data: result.rows[0],
      error: null,
      metadata: null
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      status: "error",
      message: "Server error",
      data: null,
      error: { code: "SERVER_ERROR" },
      metadata: null
    });
  }
};


exports.updateMyProfile = async (req, res) => {
  const userId = req.user.id; 
  const {
    full_name,
    username,
    gender,
    date_of_birth,
    phone_number,
    domicile,
    news_interest,
    headline,
    biography,
    avatar,
    last_education,
    work_experience,
    cv_file
  } = req.body;

  
  let processedNewsInterest = news_interest;
  if (typeof news_interest === 'string') {
    try {
      
      const newsInterestArray = JSON.parse(news_interest);
      if (Array.isArray(newsInterestArray)) {
        
        const values = newsInterestArray.map(item => {
          if (typeof item === 'object' && item.value) {
            return item.value; 
          }
          return item; 
        });
        processedNewsInterest = values;
      }
    } catch (error) {
      console.error("Error parsing news_interest:", error);
      processedNewsInterest = []; 
    }
  } else if (Array.isArray(news_interest)) {
    
    const values = news_interest.map(item => {
      if (typeof item === 'object' && item.value) {
        return item.value; 
      }
      return item; 
    });
    processedNewsInterest = values;
  }
  
  try {
    const existingProfile = await pool.query(
      "SELECT * FROM profile WHERE user_id = $1",
      [userId]
    );

    if (existingProfile.rows.length === 0) {
      const result = await pool.query(
        `INSERT INTO profile (user_id, full_name, gender, date_of_birth, phone_number, domicile, news_interest, headline, biography, avatar, last_education, work_experience, cv_file, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW(), NOW())
         RETURNING *`,
        [
          userId,
          full_name,
          gender,
          date_of_birth,
          phone_number,
          domicile,
          processedNewsInterest,
          headline,
          biography,
          avatar,
          last_education,
          work_experience,
          cv_file,
        ]
      );

      return res.json({
        status: "success",
        message: "Profile berhasil dibuat",
        data: result.rows[0],
        error: null,
        metadata: null,
      });
    }

    const updateFields = [];
    const updateValues = [];
    let paramIndex = 1;

    if (full_name !== undefined) {
      updateFields.push(`full_name = $${paramIndex}`);
      updateValues.push(full_name);
      paramIndex++;
    }

    if (username !== undefined) {
    }

    if (gender !== undefined) {
      updateFields.push(`gender = $${paramIndex}`);
      updateValues.push(gender);
      paramIndex++;
    }

    if (date_of_birth !== undefined) {
      updateFields.push(`date_of_birth = $${paramIndex}`);
      updateValues.push(date_of_birth);
      paramIndex++;
    }

    if (phone_number !== undefined) {
      updateFields.push(`phone_number = $${paramIndex}`);
      updateValues.push(phone_number);
      paramIndex++;
    }

    if (domicile !== undefined) {
      updateFields.push(`domicile = $${paramIndex}`);
      updateValues.push(domicile);
      paramIndex++;
    }

    if (processedNewsInterest !== undefined) {
      updateFields.push(`news_interest = $${paramIndex}`);
      updateValues.push(processedNewsInterest);
      paramIndex++;
    }

    if (headline !== undefined) {
      updateFields.push(`headline = $${paramIndex}`);
      updateValues.push(headline);
      paramIndex++;
    }

    if (biography !== undefined) {
      updateFields.push(`biography = $${paramIndex}`);
      updateValues.push(biography);
      paramIndex++;
    }
    if (avatar !== undefined) {
      updateFields.push(`avatar = $${paramIndex}`);
      updateValues.push(avatar);
      paramIndex++;
    }

    if (last_education !== undefined) {
      updateFields.push(`last_education = $${paramIndex}`);
      updateValues.push(last_education);
      paramIndex++;
    }

    if (work_experience !== undefined) {
      updateFields.push(`work_experience = $${paramIndex}`);
      updateValues.push(work_experience);
      paramIndex++;
    }

    if (cv_file !== undefined) {
      updateFields.push(`cv_file = $${paramIndex}`);
      updateValues.push(cv_file);
      paramIndex++;
    }

    updateFields.push(`updated_at = NOW()`);

    if (updateFields.length === 1) {
      return res.status(400).json({
        status: "error",
        message: "No fields to update",
        data: null,
        error: { code: "NO_FIELDS_TO_UPDATE" },
        metadata: null,
      });
    }

    updateValues.push(userId);

    const query = `UPDATE profile SET ${updateFields.join(
      ", "
    )} WHERE user_id = $${paramIndex} RETURNING *`;

    const result = await pool.query(query, updateValues);

    res.json({
      status: "success",
      message: "Profile berhasil diperbarui",
      data: result.rows[0],
      error: null,
      metadata: null,
    });
  } catch (err) {
    console.error("Profile update error:", err);
    res.status(500).json({
      status: "error",
      message: "Server error",
      data: null,
      error: { code: "SERVER_ERROR" },
      metadata: null
    });
  }
};

// Get user's font accessibility settings
exports.getFontSettings = async (req, res) => {
  const userId = req.user.id;
  
  try {
    const result = await pool.query(
      "SELECT open_dyslexic_enabled, high_contrast_enabled FROM profile WHERE user_id = $1",
      [userId]
    );
    
    if (result.rows.length === 0) {
      // Create default profile if not exists
      await pool.query(
        "INSERT INTO profile (user_id, open_dyslexic_enabled, high_contrast_enabled, created_at, updated_at) VALUES ($1, FALSE, FALSE, NOW(), NOW())",
        [userId]
      );
      
      return res.json({
        status: "success",
        message: "Font settings retrieved successfully",
        data: { 
          openDyslexicEnabled: false,
          highContrastEnabled: false 
        },
        error: null,
        metadata: null
      });
    }
    
    res.json({
      status: "success",
      message: "Font settings retrieved successfully",
      data: { 
        openDyslexicEnabled: result.rows[0].open_dyslexic_enabled || false,
        highContrastEnabled: result.rows[0].high_contrast_enabled || false
      },
      error: null,
      metadata: null
    });
  } catch (err) {
    console.error("Font settings fetch error:", err);
    res.status(500).json({
      status: "error",
      message: "Server error",
      data: null,
      error: { code: "SERVER_ERROR" },
      metadata: null
    });
  }
};

// Update user's font accessibility settings
exports.updateFontSettings = async (req, res) => {
  const userId = req.user.id;
  const { openDyslexicEnabled, highContrastEnabled } = req.body;
  
  try {
    // Validate input
    if (typeof openDyslexicEnabled !== 'boolean') {
      return res.status(400).json({
        status: "error",
        message: "Invalid input: openDyslexicEnabled must be a boolean",
        data: null,
        error: { code: "INVALID_INPUT" },
        metadata: null
      });
    }

    // Validate high contrast input if provided
    if (highContrastEnabled !== undefined && typeof highContrastEnabled !== 'boolean') {
      return res.status(400).json({
        status: "error",
        message: "Invalid input: highContrastEnabled must be a boolean",
        data: null,
        error: { code: "INVALID_INPUT" },
        metadata: null
      });
    }
    
    // Check if profile exists
    const checkResult = await pool.query(
      "SELECT id FROM profile WHERE user_id = $1",
      [userId]
    );
    
    if (checkResult.rows.length === 0) {
      // Create profile if not exists
      await pool.query(
        "INSERT INTO profile (user_id, open_dyslexic_enabled, high_contrast_enabled, created_at, updated_at) VALUES ($1, $2, $3, NOW(), NOW())",
        [userId, openDyslexicEnabled, highContrastEnabled || false]
      );
    } else {
      // Update existing profile
      if (highContrastEnabled !== undefined) {
        await pool.query(
          "UPDATE profile SET open_dyslexic_enabled = $1, high_contrast_enabled = $2, updated_at = NOW() WHERE user_id = $3",
          [openDyslexicEnabled, highContrastEnabled, userId]
        );
      } else {
        await pool.query(
          "UPDATE profile SET open_dyslexic_enabled = $1, updated_at = NOW() WHERE user_id = $2",
          [openDyslexicEnabled, userId]
        );
      }
    }
    
    res.json({
      status: "success",
      message: "Font settings updated successfully",
      data: { 
        openDyslexicEnabled,
        highContrastEnabled: highContrastEnabled || false
      },
      error: null,
      metadata: null
    });
  } catch (err) {
    console.error("Font settings update error:", err);
    res.status(500).json({
      status: "error",
      message: "Server error",
      data: null,
      error: { code: "SERVER_ERROR" },
      metadata: null
    });
  }
};


