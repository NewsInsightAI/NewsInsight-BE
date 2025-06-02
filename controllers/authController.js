const pool = require("../db");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const validator = require("validator");
const sendEmail = require("../utils/sendEmail");
const crypto = require("crypto");

const JWT_SECRET = process.env.JWT_SECRET || "defaultsecret";

function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString(); 
}

exports.register = async (req, res) => {
  const { email, password, role, username } = req.body;

  if (!validator.isEmail(email)) {
    return res.status(400).json({ message: "Format email tidak valid" });
  }
  if (!username || typeof username !== "string" || username.trim() === "") {
    return res.status(400).json({ message: "Username wajib diisi" });
  }
  
  const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{8,}$/;
  if (!passwordRegex.test(password)) {
    return res.status(400).json({
      message:
        "Gunakan minimal 8 karakter dengan kombinasi huruf dan angka",
    });
  }

  try {
    const existingUser = await pool.query(
      "SELECT * FROM users WHERE email = $1",
      [email]
    );
    if (existingUser.rows.length > 0)
      return res.status(400).json({ message: "Email sudah digunakan" });

    const existingUsername = await pool.query(
      "SELECT * FROM users WHERE username = $1",
      [username]
    );
    if (existingUsername.rows.length > 0)
      return res.status(400).json({ message: "Username sudah digunakan" });

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    
    const otp = generateOTP();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); 
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8" />
          <title>Your NewsInsight Verification Code</title>
        </head>
        <body style="font-family: Arial, sans-serif; color: #222;">
          <h2>Your NewsInsight Verification Code</h2>
          <p>Your verification code is:</p>
          <div style="font-size: 2em; font-weight: bold; letter-spacing: 4px; margin: 16px 0;">${otp}</div>
          <p>This code will expire in 10 minutes.</p>
        </body>
      </html>
    `;

    
    try {
      await sendEmail(email, "Your OTP Code", html);
    } catch (err) {
      console.error("Failed to send OTP email:", err);
      return res.status(500).json({
        message: "Gagal mengirim email OTP. Registrasi dibatalkan.",
      });
    }

    
    const newUser = await pool.query(
      "INSERT INTO users (email, password, role, username) VALUES ($1, $2, $3, $4) RETURNING id, email, role, username, created_at",
      [email, hashedPassword, role || "user", username]
    );
    const userId = newUser.rows[0].id;
    await pool.query(
      "INSERT INTO email_verifications (user_id, otp_code, expires_at, attempts, verified) VALUES ($1, $2, $3, $4, $5)",
      [userId, otp, expiresAt, 0, false]
    );

    res.status(201).json(newUser.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).send("Terjadi kesalahan pada server");
  }
};

exports.login = async (req, res) => {
  const identifier = req.body.identifier || req.body.email || req.body.username;
  const { password } = req.body;

  if (
    !identifier ||
    typeof identifier !== "string" ||
    identifier.trim() === ""
  ) {
    return res.status(400).json({ message: "Email/username wajib diisi" });
  }
  if (!password || typeof password !== "string" || password.trim() === "") {
    return res.status(400).json({ message: "Password wajib diisi" });
  }

  try {
    let userRes;
    if (validator.isEmail(identifier)) {
      userRes = await pool.query("SELECT * FROM users WHERE email = $1", [
        identifier,
      ]);
    } else {
      userRes = await pool.query("SELECT * FROM users WHERE username = $1", [
        identifier,
      ]);
    }
    const user = userRes.rows[0];

    if (!user)
      return res
        .status(400)
        .json({ message: "Email/username atau password salah" });

    const validPass = await bcrypt.compare(password, user.password);
    if (!validPass)
      return res
        .status(400)
        .json({ message: "Email/username atau password salah" });

    
    if (!user.email_verified) {
      
      const otpRes = await pool.query(
        "SELECT id, otp_code, expires_at FROM email_verifications WHERE user_id = $1 AND verified = FALSE ORDER BY expires_at DESC LIMIT 1",
        [user.id]
      );
      let otp, expiresAt, otpResent = false;
      const now = new Date();
      if (otpRes.rows.length > 0 && new Date(otpRes.rows[0].expires_at) > now) {
        
        otp = otpRes.rows[0].otp_code;
        expiresAt = otpRes.rows[0].expires_at;
        
        otpResent = false;
      } else {
        
        otp = generateOTP();
        expiresAt = new Date(Date.now() + 10 * 60 * 1000);
        await pool.query(
          "INSERT INTO email_verifications (user_id, otp_code, expires_at, attempts, verified) VALUES ($1, $2, $3, $4, $5)",
          [user.id, otp, expiresAt, 0, false]
        );
        otpResent = true;
      }
      
      if (otpResent) {
        const html = `
          <!DOCTYPE html>
      <html lang="id">
        <head>
          <meta charset="UTF-8" />
          <title>Verifikasi Email Anda - NewsInsight</title>
          <style>
            body {
        font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
        background-color: #f4f4f7;
        margin: 0;
        padding: 0;
        color: #333;
            }
            .container {
        max-width: 600px;
        margin: 40px auto;
        background: #ffffff;
        border-radius: 8px;
        overflow: hidden;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
            }
            .header {
        background: linear-gradient(to right, #3BD5FF, #367AF2);
        color: white;
        text-align: center;
        padding: 30px 20px;
            }
            .header h1 {
        margin: 0;
        font-size: 22px;
            }
            .content {
        padding: 30px 40px;
        font-size: 16px;
        line-height: 1.6;
            }
            .otp-code {
        font-size: 32px;
        font-weight: bold;
        text-align: center;
        letter-spacing: 8px;
        margin: 24px 0;
        background-color: #f0f4ff;
        padding: 12px 0;
        border-radius: 6px;
        color: #2a2a2a;
            }
            .footer {
        font-size: 12px;
        text-align: center;
        color: #888;
        padding: 20px 30px;
        background-color: #fafafa;
            }
            @media only screen and (max-width: 600px) {
        .content {
          padding: 20px;
        }
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
        <h1>Verifikasi Email Diperlukan</h1>
            </div>
            <div class="content">
        <p>Halo, ${user.email}!</p>
        <p>Sebelum Anda dapat mengakses akun, silakan verifikasi email Anda menggunakan kode di bawah ini. Kode berlaku selama <strong>10 menit</strong>:</p>
        <div class="otp-code">${otp}</div>
        <p>Jika Anda tidak mencoba login, abaikan pesan ini.</p>
        <p>Terima kasih,<br>Tim NewsInsight</p>
            </div>
            <div class="footer">
        &copy; ${new Date().getFullYear()} NewsInsight. All rights reserved.
            </div>
          </div>
        </body>
      </html>
        `;
        try {
          await sendEmail(user.email, "Your OTP Code", html);
        } catch (err) {
          console.error("Failed to send OTP email (login):", err);
        }
      }
      return res.status(403).json({
        status: "unverified",
        message: "Email belum diverifikasi. Silakan cek email untuk kode verifikasi.",
        userId: user.id,
        email: user.email,
        otpResent
      });
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
    );

    res.json({ token });
  } catch (err) {
    console.error(err);
    res.status(500).send("Terjadi kesalahan pada server");
  }
};

exports.verifyEmail = async (req, res) => {
  const { userId, otp } = req.body;

  
  const result = await pool.query(
    "SELECT id, otp_code, expires_at, attempts FROM email_verifications WHERE user_id = $1 AND otp_code = $2 AND verified = FALSE",
    [userId, otp]
  );
  const record = result.rows[0];

  if (!record)
    return res.status(400).json({ message: "Kode tidak valid atau sudah expired" });

  
  if (record.attempts >= 5) {
    await pool.query("DELETE FROM email_verifications WHERE id = $1", [
      record.id,
    ]);
    return res.status(400).json({
      message: "Terlalu banyak percobaan gagal. Silakan minta kode baru.",
    });
  }

  if (new Date() > record.expires_at) {
    await pool.query("DELETE FROM email_verifications WHERE id = $1", [
      record.id,
    ]);
    return res.status(400).json({ message: "Kode sudah expired" });
  }

  
  await pool.query(
    "UPDATE email_verifications SET verified = TRUE WHERE id = $1",
    [record.id]
  );
  await pool.query("UPDATE users SET email_verified = TRUE WHERE id = $1", [
    userId,
  ]);
  await pool.query("DELETE FROM email_verifications WHERE id = $1", [
    record.id,
  ]);
  return res.json({ message: "Email berhasil diverifikasi" });
};

exports.resendOtp = async (req, res) => {
  const { userId, email } = req.body;
  try {
    let userRes;
    if (userId) {
      userRes = await pool.query("SELECT * FROM users WHERE id = $1", [userId]);
    } else if (email) {
      userRes = await pool.query("SELECT * FROM users WHERE email = $1", [email]);
    } else {
      return res.status(400).json({ message: "userId atau email wajib diisi" });
    }
    const user = userRes.rows[0];
    if (!user) return res.status(404).json({ message: "User tidak ditemukan" });
    if (user.email_verified) {
      return res.status(400).json({ message: "Email sudah diverifikasi" });
    }
    
    const otpRes = await pool.query(
      "SELECT id, otp_code, expires_at FROM email_verifications WHERE user_id = $1 AND verified = FALSE ORDER BY expires_at DESC LIMIT 1",
      [user.id]
    );
    let otp, expiresAt, otpResent = false;
    const now = new Date();
    if (otpRes.rows.length > 0 && new Date(otpRes.rows[0].expires_at) > now) {
      
      otp = otpRes.rows[0].otp_code;
      expiresAt = otpRes.rows[0].expires_at;
      otpResent = false;
    } else {
      
      otp = generateOTP();
      expiresAt = new Date(Date.now() + 10 * 60 * 1000);
      await pool.query(
        "INSERT INTO email_verifications (user_id, otp_code, expires_at, attempts, verified) VALUES ($1, $2, $3, $4, $5)",
        [user.id, otp, expiresAt, 0, false]
      );
      otpResent = true;
    }
    
    const html = `
      <!DOCTYPE html>
  <html lang="id">
    <head>
    <meta charset="UTF-8" />
    <title>Verifikasi Email Anda - NewsInsight</title>
    <style>
      body {
      font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
      background-color: #f4f4f7;
      margin: 0;
      padding: 0;
      color: #333;
      }
      .container {
      max-width: 600px;
      margin: 40px auto;
      background: #ffffff;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
      }
      .header {
      background: linear-gradient(to right, #3BD5FF, #367AF2);
      color: white;
      text-align: center;
      padding: 30px 20px;
      }
      .header h1 {
      margin: 0;
      font-size: 22px;
      }
      .content {
      padding: 30px 40px;
      font-size: 16px;
      line-height: 1.6;
      }
      .otp-code {
      font-size: 32px;
      font-weight: bold;
      text-align: center;
      letter-spacing: 8px;
      margin: 24px 0;
      background-color: #f0f4ff;
      padding: 12px 0;
      border-radius: 6px;
      color: #2a2a2a;
      }
      .footer {
      font-size: 12px;
      text-align: center;
      color: #888;
      padding: 20px 30px;
      background-color: #fafafa;
      }
      @media only screen and (max-width: 600px) {
      .content {
        padding: 20px;
      }
      }
    </style>
    </head>
    <body>
    <div class="container">
      <div class="header">
      <h1>Verifikasi Email Anda</h1>
      </div>
      <div class="content">
      <p>Halo, ${user.email}!</p>
      <p>Untuk menyelesaikan pendaftaran, gunakan kode verifikasi di bawah ini. Kode berlaku selama <strong>10 menit</strong>:</p>
      <div class="otp-code">${otp}</div>
      <p>Jika Anda tidak meminta kode ini, abaikan saja email ini. Tidak ada perubahan yang akan dilakukan.</p>
      <p>Terima kasih,<br>Tim NewsInsight</p>
      </div>
      <div class="footer">
      &copy; ${new Date().getFullYear()} NewsInsight. All rights reserved.
      </div>
    </div>
    </body>
  </html>
    `;
    try {
      await sendEmail(user.email, "Your OTP Code", html);
    } catch (err) {
      console.error("Failed to send OTP email (resend):", err);
      return res.status(500).json({ message: "Gagal mengirim email OTP" });
    }
    return res.json({
      status: "otp_sent",
      message: "Kode OTP berhasil dikirim ke email.",
      userId: user.id,
      email: user.email,
      otpResent
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Terjadi kesalahan pada server" });
  }
};


exports.requestResetPassword = async (req, res) => {
  const { email } = req.body;
  if (!validator.isEmail(email)) {
    return res.status(400).json({ message: "Format email tidak valid" });
  }
  try {
    const userRes = await pool.query("SELECT * FROM users WHERE email = $1", [email]);
    const user = userRes.rows[0];
    if (!user) return res.status(404).json({ message: "Email tidak ditemukan" });

    
    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000); 
    
    await pool.query(
      `INSERT INTO password_resets (user_id, token, expires_at) VALUES ($1, $2, $3)
       ON CONFLICT (user_id) DO UPDATE SET token = $2, expires_at = $3`,
      [user.id, token, expiresAt]
    );
    
    const resetLink = `http://localhost:3001/reset-password?token=${token}`;
    const html = `
      <!DOCTYPE html>
<html lang="id">
  <head>
    <meta charset="UTF-8" />
    <title>Reset Password - NewsInsight</title>
    <style>
      body {
        font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
        background-color: #f4f4f7;
        margin: 0;
        padding: 0;
        color: #333;
      }
      .container {
        max-width: 600px;
        margin: 40px auto;
        background: #ffffff;
        border-radius: 8px;
        overflow: hidden;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
      }
      .header {
        background: linear-gradient(to right, #3BD5FF, #367AF2);
        color: white;
        text-align: center;
        padding: 30px 20px;
      }
      .header h1 {
        margin: 0;
        font-size: 22px;
      }
      .content {
        padding: 30px 40px;
        font-size: 16px;
        line-height: 1.6;
      }
      .btn {
        display: inline-block;
        background-color: #367AF2;
        color: white;
        padding: 12px 24px;
        margin: 24px 0;
        text-decoration: none;
        border-radius: 6px;
        font-weight: bold;
      }
      .footer {
        font-size: 12px;
        text-align: center;
        color: #888;
        padding: 20px 30px;
        background-color: #fafafa;
      }
      @media only screen and (max-width: 600px) {
        .content {
          padding: 20px;
        }
      }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="header">
        <h1>Permintaan Reset Password</h1>
      </div>
      <div class="content">
        <p>Halo,</p>
        <p>Kami menerima permintaan untuk mengatur ulang password akun Anda di <strong>NewsInsight</strong>. Klik tombol di bawah ini untuk melanjutkan:</p>
        <p style="text-align: center;">
          <a href="${resetLink}" class="btn">Atur Ulang Password</a>
        </p>
        <p>Jika Anda tidak merasa melakukan permintaan ini, Anda bisa mengabaikan email ini. Link akan kedaluwarsa dalam <strong>30 menit</strong>.</p>
        <p>Salam hangat,<br>Tim NewsInsight</p>
      </div>
      <div class="footer">
        &copy; ${new Date().getFullYear()} NewsInsight. Semua hak dilindungi.
      </div>
    </div>
  </body>
</html>

    `;
    try {
      await sendEmail(user.email, "Reset Password NewsInsight", html);
    } catch (err) {
      console.error("Gagal mengirim email reset password:", err);
      return res.status(500).json({ message: "Gagal mengirim email reset password" });
    }
    res.json({ message: "Link reset password berhasil dikirim ke email" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Terjadi kesalahan pada server" });
  }
};


exports.resetPassword = async (req, res) => {
  const { token, password } = req.body;
  if (!token || !password) {
    return res.status(400).json({ message: "Token dan password baru wajib diisi" });
  }
  const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{8,}$/;
  if (!passwordRegex.test(password)) {
    return res.status(400).json({
      message: "Gunakan minimal 8 karakter dengan kombinasi huruf dan angka",
    });
  }
  try {
    const resetRes = await pool.query(
      "SELECT * FROM password_resets WHERE token = $1",
      [token]
    );
    const reset = resetRes.rows[0];
    if (!reset || new Date() > reset.expires_at) {
      return res.status(400).json({ message: "Token tidak valid atau sudah expired" });
    }
    
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    await pool.query("UPDATE users SET password = $1 WHERE id = $2", [hashedPassword, reset.user_id]);
    
    await pool.query("DELETE FROM password_resets WHERE user_id = $1", [reset.user_id]);
    res.json({ message: "Password berhasil direset. Silakan login dengan password baru." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Terjadi kesalahan pada server" });
  }
};


exports.checkResetToken = async (req, res) => {
  const { token } = req.body;
  if (!token) {
    return res.status(400).json({ message: "Token wajib diisi" });
  }
  try {
    const resetRes = await pool.query(
      "SELECT * FROM password_resets WHERE token = $1",
      [token]
    );
    const reset = resetRes.rows[0];
    if (!reset || new Date() > reset.expires_at) {
      return res.status(400).json({ valid: false, message: "Token tidak valid atau sudah expired" });
    }
    return res.json({ valid: true, message: "Token valid" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Terjadi kesalahan pada server" });
  }
};
