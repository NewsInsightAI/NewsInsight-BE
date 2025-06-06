const pool = require("../db");

exports.getAllUsers = async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT id, email, username, role, created_at, updated_at, email_verified FROM users"
    );
    res.json({
      status: "success",
      message: "Daftar user berhasil diambil",
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

exports.getUserById = async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(
      "SELECT id, email, username, role, created_at, updated_at, email_verified FROM users WHERE id = $1",
      [id]
    );
    if (result.rows.length === 0) return res.status(404).json({
      status: "error",
      message: "User not found",
      data: null,
      error: { code: "USER_NOT_FOUND" },
      metadata: null
    });
    res.json({
      status: "success",
      message: "User ditemukan",
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

exports.createUser = async (req, res) => {
  const { email, username, password, role } = req.body;
  try {
    const result = await pool.query(
      "INSERT INTO users (email, username, password, role) VALUES ($1, $2, $3, $4) RETURNING id, email, username, role, created_at, updated_at, email_verified",
      [email, username, password, role || "user"]
    );
    res.status(201).json({
      status: "success",
      message: "User berhasil dibuat",
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

exports.updateUser = async (req, res) => {
  const { id } = req.params;
  const { email, username, role } = req.body;
  try {
    const result = await pool.query(
      "UPDATE users SET email = $1, username = $2, role = $3, updated_at = NOW() WHERE id = $4 RETURNING id, email, username, role, created_at, updated_at, email_verified",
      [email, username, role, id]
    );
    if (result.rows.length === 0) return res.status(404).json({
      status: "error",
      message: "User not found",
      data: null,
      error: { code: "USER_NOT_FOUND" },
      metadata: null
    });
    res.json({
      status: "success",
      message: "User berhasil diupdate",
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

exports.deleteUser = async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(
      "DELETE FROM users WHERE id = $1 RETURNING id, email, username, role, created_at, updated_at, email_verified",
      [id]
    );
    if (result.rows.length === 0) return res.status(404).json({
      status: "error",
      message: "User not found",
      data: null,
      error: { code: "USER_NOT_FOUND" },
      metadata: null
    });
    res.json({
      status: "success",
      message: "User berhasil dihapus",
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
