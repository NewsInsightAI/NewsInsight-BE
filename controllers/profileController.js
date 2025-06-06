const pool = require("../db");

// Get all profiles
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

// Get profile by user_id
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

// Get my profile (authenticated user)
exports.getMyProfile = async (req, res) => {  const userId = req.user.id; // Assuming user ID is stored in req.user by middleware
  
  try {
    const result = await pool.query(
      `SELECT p.*, u.email, u.username FROM profile p JOIN users u ON p.user_id = u.id WHERE p.user_id = $1`,
      [userId]
    );
      if (result.rows.length === 0) {
      // If profile doesn't exist, create an empty one
      await pool.query(
        "INSERT INTO profile (user_id, created_at, updated_at) VALUES ($1, NOW(), NOW())",
        [userId]
      );
      
      // Get user data to return with empty profile
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
      }
        const emptyProfile = {
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
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        email: userResult.rows[0].email,
        username: userResult.rows[0].username
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

// Create or update profile (upsert)
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
  // Handle news_interest conversion - extract only values for database storage
  let processedNewsInterest = news_interest;
  
  console.log("Processing news interest, type:", typeof news_interest);
  
  if (typeof news_interest === 'string') {
    try {
      // Parse the JSON string to get the array of objects
      const newsInterestArray = JSON.parse(news_interest);
      console.log("Parsed news interest array:", newsInterestArray);
        if (Array.isArray(newsInterestArray)) {
        // Extract only the values from objects and store as array
        const values = newsInterestArray.map(item => {
          if (typeof item === 'object' && item.value) {
            return item.value; // Extract only the value
          }
          return item; // If it's already a string, keep it
        });
        processedNewsInterest = values;
        console.log("Extracted values:", values);
      }
    } catch (error) {
      console.error("Error parsing news_interest:", error);
      processedNewsInterest = []; // Default to empty array
    }
  } else if (Array.isArray(news_interest)) {
    console.log("News interest is already an array:", news_interest);
    // If it's already an array, extract values and store as array
    const values = news_interest.map(item => {
      if (typeof item === 'object' && item.value) {
        return item.value; // Extract only the value
      }
      return item; // If it's already a string, keep it
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

// Delete profile by user_id
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

// Update my profile (authenticated user only)
exports.updateMyProfile = async (req, res) => {
  const userId = req.user.id; // Get user ID from JWT token
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
    avatar  } = req.body;
      // Handle news_interest conversion - extract only values for database storage
  let processedNewsInterest = news_interest;
  if (typeof news_interest === 'string') {
    try {
      // Parse the JSON string to get the array of objects
      const newsInterestArray = JSON.parse(news_interest);
      if (Array.isArray(newsInterestArray)) {
        // Extract only the values from objects and store as JSON array of strings
        const values = newsInterestArray.map(item => {
          if (typeof item === 'object' && item.value) {
            return item.value; // Extract only the value
          }
          return item; // If it's already a string, keep it
        });
        processedNewsInterest = values;
      }
    } catch (error) {
      console.error("Error parsing news_interest:", error);
      processedNewsInterest = []; // Default to empty array
    }
  } else if (Array.isArray(news_interest)) {
    // If it's already an array, extract values and convert to array
    const values = news_interest.map(item => {
      if (typeof item === 'object' && item.value) {
        return item.value; // Extract only the value
      }
      return item; // If it's already a string, keep it
    });
    processedNewsInterest = values;
  }
  
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
      [userId, full_name, gender, date_of_birth, phone_number, domicile, processedNewsInterest, headline, biography, avatar]    );

    res.json({
      status: "success",
      message: "Profile berhasil diperbarui",
      data: result.rows[0],
      error: null,
      metadata: null
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

// Create or update profile (upsert) - Admin only
