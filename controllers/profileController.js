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
    biography
  } = req.body;
  try {
    const result = await pool.query(
      `INSERT INTO profile (user_id, full_name, gender, date_of_birth, phone_number, domicile, news_interest, headline, biography, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
       ON CONFLICT (user_id) DO UPDATE SET
         full_name = EXCLUDED.full_name,
         gender = EXCLUDED.gender,
         date_of_birth = EXCLUDED.date_of_birth,
         phone_number = EXCLUDED.phone_number,
         domicile = EXCLUDED.domicile,
         news_interest = EXCLUDED.news_interest,
         headline = EXCLUDED.headline,
         biography = EXCLUDED.biography,
         updated_at = NOW()
       RETURNING *`,
      [userId, full_name, gender, date_of_birth, phone_number, domicile, news_interest, headline, biography]
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
