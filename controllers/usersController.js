const pool = require("../db");
const bcrypt = require("bcrypt");

exports.getAllUsers = async (req, res) => {
  try {
    const { search, page = 1, limit = 10, role, status } = req.query;

    let query = `
      SELECT 
        u.id, 
        u.email, 
        u.username, 
        u.role, 
        u.created_at, 
        u.updated_at, 
        u.email_verified,
        u.google_id,
        u.auth_provider,
        p.full_name,
        CASE 
          WHEN u.email_verified = true THEN 'active'
          ELSE 'inactive'
        END as status
      FROM users u
      LEFT JOIN profile p ON u.id = p.user_id
      WHERE 1=1
    `;

    const queryParams = [];
    let paramCount = 0;

    if (search) {
      paramCount++;
      query += ` AND (
        LOWER(u.username) LIKE LOWER($${paramCount}) OR 
        LOWER(u.email) LIKE LOWER($${paramCount}) OR 
        LOWER(COALESCE(p.full_name, '')) LIKE LOWER($${paramCount})
      )`;
      queryParams.push(`%${search}%`);
    }

    if (role) {
      paramCount++;
      query += ` AND u.role = $${paramCount}`;
      queryParams.push(role);
    }

    if (status) {
      if (status === "active") {
        query += ` AND u.email_verified = true`;
      } else if (status === "inactive") {
        query += ` AND u.email_verified = false`;
      }
    }

    query += ` ORDER BY u.created_at DESC`;

    const offset = (page - 1) * limit;
    paramCount++;
    query += ` LIMIT $${paramCount}`;
    queryParams.push(limit);

    paramCount++;
    query += ` OFFSET $${paramCount}`;
    queryParams.push(offset);

    const result = await pool.query(query, queryParams);

    let countQuery = `
      SELECT COUNT(*) 
      FROM users u
      LEFT JOIN profile p ON u.id = p.user_id
      WHERE 1=1
    `;

    const countParams = [];
    let countParamCount = 0;

    if (search) {
      countParamCount++;
      countQuery += ` AND (
        LOWER(u.username) LIKE LOWER($${countParamCount}) OR 
        LOWER(u.email) LIKE LOWER($${countParamCount}) OR 
        LOWER(COALESCE(p.full_name, '')) LIKE LOWER($${countParamCount})
      )`;
      countParams.push(`%${search}%`);
    }

    if (role) {
      countParamCount++;
      countQuery += ` AND u.role = $${countParamCount}`;
      countParams.push(role);
    }

    if (status) {
      if (status === "active") {
        countQuery += ` AND u.email_verified = true`;
      } else if (status === "inactive") {
        countQuery += ` AND u.email_verified = false`;
      }
    }

    const countResult = await pool.query(countQuery, countParams);
    const totalUsers = parseInt(countResult.rows[0].count);
    const totalPages = Math.ceil(totalUsers / limit);

    res.json({
      status: "success",
      message: "Daftar user berhasil diambil",
      data: result.rows.map((user) => ({
        id: user.id,
        fullName: user.full_name || "",
        username: user.username || null,
        email: user.email,
        role: user.role,
        status: user.status,
        createdAt: user.created_at,
        updatedAt: user.updated_at,
        googleId: user.google_id || null,
        authProvider: user.auth_provider || "email",
      })),
      error: null,
      metadata: {
        pagination: {
          currentPage: parseInt(page),
          totalPages,
          totalUsers,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1,
        },
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      status: "error",
      message: "Server error",
      data: null,
      error: { code: "SERVER_ERROR" },
      metadata: null,
    });
  }
};

exports.getUserById = async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(
      `
      SELECT 
        u.id, 
        u.email, 
        u.username, 
        u.role, 
        u.created_at, 
        u.updated_at, 
        u.email_verified,
        p.full_name,
        CASE 
          WHEN u.email_verified = true THEN 'active'
          ELSE 'inactive'
        END as status
      FROM users u
      LEFT JOIN profile p ON u.id = p.user_id
      WHERE u.id = $1
    `,
      [id]
    );

    if (result.rows.length === 0)
      return res.status(404).json({
        status: "error",
        message: "User not found",
        data: null,
        error: { code: "USER_NOT_FOUND" },
        metadata: null,
      });

    const user = result.rows[0];
    res.json({
      status: "success",
      message: "User ditemukan",
      data: {
        id: user.id,
        fullName: user.full_name || "",
        username: user.username || null,
        email: user.email,
        role: user.role,
        status: user.status,
        createdAt: user.created_at,
        updatedAt: user.updated_at,
      },
      error: null,
      metadata: null,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      status: "error",
      message: "Server error",
      data: null,
      error: { code: "SERVER_ERROR" },
      metadata: null,
    });
  }
};

exports.createUser = async (req, res) => {
  const { email, username, password, role, fullName, status } = req.body;

  if (!email || !username || !password) {
    return res.status(400).json({
      status: "error",
      message: "Email, username, and password are required",
      data: null,
      error: { code: "VALIDATION_ERROR" },
      metadata: null,
    });
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const existingUser = await client.query(
      "SELECT id FROM users WHERE email = $1 OR username = $2",
      [email, username]
    );

    if (existingUser.rows.length > 0) {
      await client.query("ROLLBACK");
      return res.status(400).json({
        status: "error",
        message: "Email or username already exists",
        data: null,
        error: { code: "USER_EXISTS" },
        metadata: null,
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const emailVerified = status === "active";

    const userResult = await client.query(
      "INSERT INTO users (email, username, password, role, email_verified) VALUES ($1, $2, $3, $4, $5) RETURNING id, email, username, role, created_at, updated_at, email_verified",
      [email, username, hashedPassword, role || "user", emailVerified]
    );

    const newUser = userResult.rows[0];

    if (fullName) {
      await client.query(
        "INSERT INTO profile (user_id, full_name) VALUES ($1, $2)",
        [newUser.id, fullName]
      );
    }

    await client.query("COMMIT");

    res.status(201).json({
      status: "success",
      message: "User berhasil dibuat",
      data: {
        id: newUser.id,
        fullName: fullName || "",
        username: newUser.username || null,
        email: newUser.email,
        role: newUser.role,
        status: newUser.email_verified ? "active" : "inactive",
        createdAt: newUser.created_at,
        updatedAt: newUser.updated_at,
      },
      error: null,
      metadata: null,
    });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error(err);
    res.status(500).json({
      status: "error",
      message: "Server error",
      data: null,
      error: { code: "SERVER_ERROR" },
      metadata: null,
    });
  } finally {
    client.release();
  }
};

exports.updateUser = async (req, res) => {
  const { id } = req.params;
  const { email, username, role, fullName, status, password } = req.body;

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const existingUser = await client.query(
      "SELECT id FROM users WHERE id = $1",
      [id]
    );

    if (existingUser.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({
        status: "error",
        message: "User not found",
        data: null,
        error: { code: "USER_NOT_FOUND" },
        metadata: null,
      });
    }

    if (email || username) {
      const duplicateCheck = await client.query(
        "SELECT id FROM users WHERE (email = $1 OR username = $2) AND id != $3",
        [email, username, id]
      );

      if (duplicateCheck.rows.length > 0) {
        await client.query("ROLLBACK");
        return res.status(400).json({
          status: "error",
          message: "Email or username already exists",
          data: null,
          error: { code: "USER_EXISTS" },
          metadata: null,
        });
      }
    }

    const updateFields = [];
    const updateValues = [];
    let paramCount = 0;

    if (email) {
      paramCount++;
      updateFields.push(`email = $${paramCount}`);
      updateValues.push(email);
    }

    if (username) {
      paramCount++;
      updateFields.push(`username = $${paramCount}`);
      updateValues.push(username);
    }

    if (role) {
      paramCount++;
      updateFields.push(`role = $${paramCount}`);
      updateValues.push(role);
    }

    if (status) {
      paramCount++;
      updateFields.push(`email_verified = $${paramCount}`);
      updateValues.push(status === "active");
    }

    if (password && password.trim()) {
      const hashedPassword = await bcrypt.hash(password, 10);
      paramCount++;
      updateFields.push(`password = $${paramCount}`);
      updateValues.push(hashedPassword);
    }

    paramCount++;
    updateFields.push(`updated_at = $${paramCount}`);
    updateValues.push(new Date());

    paramCount++;
    updateValues.push(id);

    const userQuery = `
      UPDATE users 
      SET ${updateFields.join(", ")} 
      WHERE id = $${paramCount} 
      RETURNING id, email, username, role, created_at, updated_at, email_verified
    `;

    const userResult = await client.query(userQuery, updateValues);
    const updatedUser = userResult.rows[0];

    if (fullName !== undefined) {
      const profileExists = await client.query(
        "SELECT id FROM profile WHERE user_id = $1",
        [id]
      );

      if (profileExists.rows.length > 0) {
        await client.query(
          "UPDATE profile SET full_name = $1, updated_at = NOW() WHERE user_id = $2",
          [fullName, id]
        );
      } else {
        await client.query(
          "INSERT INTO profile (user_id, full_name) VALUES ($1, $2)",
          [id, fullName]
        );
      }
    }

    const profileResult = await client.query(
      "SELECT full_name FROM profile WHERE user_id = $1",
      [id]
    );

    await client.query("COMMIT");

    res.json({
      status: "success",
      message: "User berhasil diupdate",
      data: {
        id: updatedUser.id,
        fullName: profileResult.rows[0]?.full_name || "",
        username: updatedUser.username || null,
        email: updatedUser.email,
        role: updatedUser.role,
        status: updatedUser.email_verified ? "active" : "inactive",
        createdAt: updatedUser.created_at,
        updatedAt: updatedUser.updated_at,
      },
      error: null,
      metadata: null,
    });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error(err);
    res.status(500).json({
      status: "error",
      message: "Server error",
      data: null,
      error: { code: "SERVER_ERROR" },
      metadata: null,
    });
  } finally {
    client.release();
  }
};

exports.deleteUser = async (req, res) => {
  const { id } = req.params;

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const userResult = await client.query(
      `
      SELECT 
        u.id, 
        u.email, 
        u.username, 
        u.role, 
        u.created_at, 
        u.updated_at, 
        u.email_verified,
        p.full_name
      FROM users u
      LEFT JOIN profile p ON u.id = p.user_id
      WHERE u.id = $1
    `,
      [id]
    );

    if (userResult.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({
        status: "error",
        message: "User not found",
        data: null,
        error: { code: "USER_NOT_FOUND" },
        metadata: null,
      });
    }

    const user = userResult.rows[0];

    await client.query("DELETE FROM profile WHERE user_id = $1", [id]);

    await client.query("DELETE FROM users WHERE id = $1", [id]);

    await client.query("COMMIT");

    res.json({
      status: "success",
      message: "User berhasil dihapus",
      data: {
        id: user.id,
        fullName: user.full_name || "",
        username: user.username || null,
        email: user.email,
        role: user.role,
        status: user.email_verified ? "active" : "inactive",
        createdAt: user.created_at,
        updatedAt: user.updated_at,
      },
      error: null,
      metadata: null,
    });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error(err);
    res.status(500).json({
      status: "error",
      message: "Server error",
      data: null,
      error: { code: "SERVER_ERROR" },
      metadata: null,
    });
  } finally {
    client.release();
  }
};

exports.bulkDeleteUsers = async (req, res) => {
  const { userIds } = req.body;

  if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
    return res.status(400).json({
      status: "error",
      message: "User IDs array is required",
      data: null,
      error: { code: "VALIDATION_ERROR" },
      metadata: null,
    });
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const placeholders = userIds.map((_, index) => `$${index + 1}`).join(",");
    const usersResult = await client.query(
      `
      SELECT 
        u.id, 
        u.email, 
        u.username, 
        u.role, 
        u.created_at, 
        u.updated_at, 
        u.email_verified,
        p.full_name
      FROM users u
      LEFT JOIN profile p ON u.id = p.user_id
      WHERE u.id IN (${placeholders})
    `,
      userIds
    );

    if (usersResult.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({
        status: "error",
        message: "No users found",
        data: null,
        error: { code: "USERS_NOT_FOUND" },
        metadata: null,
      });
    }

    await client.query(
      `DELETE FROM profile WHERE user_id IN (${placeholders})`,
      userIds
    );

    await client.query(
      `DELETE FROM users WHERE id IN (${placeholders})`,
      userIds
    );

    await client.query("COMMIT");

    const deletedUsers = usersResult.rows.map((user) => ({
      id: user.id,
      fullName: user.full_name || "",
      username: user.username || null,
      email: user.email,
      role: user.role,
      status: user.email_verified ? "active" : "inactive",
      createdAt: user.created_at,
      updatedAt: user.updated_at,
    }));

    res.json({
      status: "success",
      message: `${deletedUsers.length} users berhasil dihapus`,
      data: deletedUsers,
      error: null,
      metadata: {
        deletedCount: deletedUsers.length,
      },
    });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error(err);
    res.status(500).json({
      status: "error",
      message: "Server error",
      data: null,
      error: { code: "SERVER_ERROR" },
      metadata: null,
    });
  } finally {
    client.release();
  }
};
