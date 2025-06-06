const { OAuth2Client } = require('google-auth-library');
const pool = require("../db");
const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET || "defaultsecret";
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const client = new OAuth2Client(GOOGLE_CLIENT_ID);

exports.googleAuth = async (req, res) => {
  const { googleToken } = req.body;

  if (!googleToken) {
    return res.status(400).json({
      status: "error",
      message: "Google token wajib diisi",
      data: null,
      error: { code: "GOOGLE_TOKEN_REQUIRED" },
      metadata: null
    });
  }

  try {
    
    const ticket = await client.verifyIdToken({
      idToken: googleToken,
      audience: GOOGLE_CLIENT_ID,
    });
    
    const payload = ticket.getPayload();
    const { sub: googleId, email, name, picture } = payload;    
    let userRes = await pool.query(
      "SELECT * FROM users WHERE email = $1 OR google_id = $2",
      [email, googleId]
    );
    
    let user = userRes.rows[0];
    let isNewUser = false;

    if (!user) {
      
      isNewUser = true;
      const username = email.split('@')[0] + '_' + Date.now(); 
      const dummyPassword = 'GOOGLE_OAUTH_' + googleId; 
      const newUserRes = await pool.query(
        "INSERT INTO users (email, username, password, role, email_verified, google_id, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW()) RETURNING *",
        [email, username, dummyPassword, "user", true, googleId]
      );
      user = newUserRes.rows[0];      
      await pool.query(
        "INSERT INTO profile (user_id, full_name, avatar, created_at, updated_at) VALUES ($1, $2, $3, NOW(), NOW())",
        [user.id, name, picture]
      );
      
      console.log(`New user registered via Google: ${email}`);    } else if (!user.google_id) {
      
      await pool.query(
        "UPDATE users SET google_id = $1, email_verified = true, updated_at = NOW() WHERE id = $2",
        [googleId, user.id]
      );
      
      
      await pool.query(
        "UPDATE profile SET full_name = COALESCE(NULLIF(full_name, ''), $1), avatar = $2, updated_at = NOW() WHERE user_id = $3",
        [name, picture, user.id]
      );
      
      user.google_id = googleId;
      user.email_verified = true;
      console.log(`Existing user linked with Google: ${email}`);
    } else {
      
      await pool.query(
        "UPDATE profile SET avatar = COALESCE(NULLIF(avatar, ''), $1), updated_at = NOW() WHERE user_id = $2",
        [picture, user.id]
      );
      console.log(`Returning Google user: ${email}`);
    }

    
    const token = jwt.sign(
      {
        id: user.id,
        role: user.role,
        email: user.email,
        username: user.username,
      },
      JWT_SECRET,
      { expiresIn: "2h" }
    );    res.json({
      status: "success",
      message: isNewUser ? "Selamat datang di NewsInsight!" : "Selamat datang kembali!",
      data: {
        account: {
          id: user.id,
          username: user.username,
          email: user.email,
          isVerified: true,
          isProfileComplete: true,
          createdAt: user.created_at,
          updatedAt: user.updated_at,
          role: user.role
        },
        token,
        isNewUser,
        expiresIn: 7200
      },
      error: null,
      metadata: null
    });

  } catch (err) {
    console.error("Google auth error:", err);
    res.status(400).json({
      status: "error",
      message: "Token Google tidak valid",
      data: null,
      error: { code: "INVALID_GOOGLE_TOKEN" },
      metadata: null
    });
  }
};
