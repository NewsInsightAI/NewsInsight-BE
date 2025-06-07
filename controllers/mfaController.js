const pool = require("../db");
const speakeasy = require("speakeasy");
const QRCode = require("qrcode");
const crypto = require("crypto-js");
const jwt = require("jsonwebtoken");


function generateBackupCodes(count = 8) {
  const codes = [];
  for (let i = 0; i < count; i++) {
    codes.push(crypto.lib.WordArray.random(4).toString().substring(0, 8).toUpperCase());
  }
  return codes;
}


function generateMFACode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}


exports.getMFAStatus = async (req, res) => {
  const userId = req.user.id;

  try {
    const result = await pool.query(
      "SELECT is_enabled, enabled_methods FROM mfa_settings WHERE user_id = $1",
      [userId]
    );

    const mfaStatus = result.rows[0] || {
      is_enabled: false,
      enabled_methods: []
    };

    res.json({
      status: "success",
      message: "Status MFA berhasil diambil",
      data: {
        isEnabled: mfaStatus.is_enabled,
        enabledMethods: mfaStatus.enabled_methods || [],
        availableMethods: ["totp", "email", "sms"]
      },
      error: null,
      metadata: null
    });
  } catch (err) {
    console.error("Get MFA status error:", err);
    res.status(500).json({
      status: "error",
      message: "Terjadi kesalahan pada server",
      data: null,
      error: { code: "SERVER_ERROR" },
      metadata: null
    });
  }
};


exports.setupTOTP = async (req, res) => {
  const userId = req.user.id;

  try {
    
    const existingMFA = await pool.query(
      "SELECT * FROM mfa_settings WHERE user_id = $1",
      [userId]
    );

    if (existingMFA.rows.length > 0 && existingMFA.rows[0].enabled_methods?.includes('totp')) {
      return res.status(400).json({
        status: "error",
        message: "TOTP sudah diaktifkan untuk akun ini",
        data: null,
        error: { code: "TOTP_ALREADY_ENABLED" },
        metadata: null
      });
    }

    
    const userRes = await pool.query("SELECT email, username FROM users WHERE id = $1", [userId]);
    const user = userRes.rows[0];

    
    const secret = speakeasy.generateSecret({
      name: `NewsInsight (${user.email})`,
      issuer: "NewsInsight"
    });

    
    const qrCodeDataURL = await QRCode.toDataURL(secret.otpauth_url);

    
    if (existingMFA.rows.length > 0) {
      await pool.query(
        "UPDATE mfa_settings SET secret_key = $1 WHERE user_id = $2",
        [secret.base32, userId]
      );
    } else {
      await pool.query(
        "INSERT INTO mfa_settings (user_id, secret_key, is_enabled, enabled_methods) VALUES ($1, $2, FALSE, '{}')",
        [userId, secret.base32]
      );
    }

    res.json({
      status: "success",
      message: "Setup TOTP berhasil dimulai",
      data: {
        secret: secret.base32,
        qrCode: qrCodeDataURL,
        manualEntryKey: secret.base32
      },
      error: null,
      metadata: null
    });
  } catch (err) {
    console.error("Setup TOTP error:", err);
    res.status(500).json({
      status: "error",
      message: "Terjadi kesalahan saat setup TOTP",
      data: null,
      error: { code: "SERVER_ERROR" },
      metadata: null
    });
  }
};


exports.verifyTOTP = async (req, res) => {
  const userId = req.user.id;
  const { token } = req.body;

  if (!token) {
    return res.status(400).json({
      status: "error",
      message: "Token TOTP wajib diisi",
      data: null,
      error: { code: "TOKEN_REQUIRED" },
      metadata: null
    });
  }

  try {
    const result = await pool.query(
      "SELECT secret_key FROM mfa_settings WHERE user_id = $1",
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({
        status: "error",
        message: "Setup TOTP belum dimulai",
        data: null,
        error: { code: "TOTP_NOT_SETUP" },
        metadata: null
      });
    }

    const secret = result.rows[0].secret_key;

    
    const verified = speakeasy.totp.verify({
      secret: secret,
      encoding: 'base32',
      token: token,
      window: 2 
    });

    if (!verified) {
      return res.status(400).json({
        status: "error",
        message: "Token TOTP tidak valid",
        data: null,
        error: { code: "INVALID_TOKEN" },
        metadata: null
      });
    }

    
    const backupCodes = generateBackupCodes();

    
    const currentMethods = await pool.query(
      "SELECT enabled_methods FROM mfa_settings WHERE user_id = $1",
      [userId]
    );

    let enabledMethods = currentMethods.rows[0]?.enabled_methods || [];
    if (!enabledMethods.includes('totp')) {
      enabledMethods.push('totp');
    }

    await pool.query(
      "UPDATE mfa_settings SET is_enabled = TRUE, enabled_methods = $1, backup_codes = $2, updated_at = NOW() WHERE user_id = $3",
      [enabledMethods, backupCodes, userId]
    );

    res.json({
      status: "success",
      message: "TOTP berhasil diaktifkan",
      data: {
        backupCodes: backupCodes,
        enabledMethods: enabledMethods
      },
      error: null,
      metadata: null
    });
  } catch (err) {
    console.error("Verify TOTP error:", err);
    res.status(500).json({
      status: "error",
      message: "Terjadi kesalahan saat verifikasi TOTP",
      data: null,
      error: { code: "SERVER_ERROR" },
      metadata: null
    });
  }
};


exports.enableEmailMFA = async (req, res) => {
  const userId = req.user.id;

  try {
    
    const existingMFA = await pool.query(
      "SELECT * FROM mfa_settings WHERE user_id = $1",
      [userId]
    );

    let enabledMethods = [];
    if (existingMFA.rows.length > 0) {
      enabledMethods = existingMFA.rows[0].enabled_methods || [];
    }

    if (!enabledMethods.includes('email')) {
      enabledMethods.push('email');
    }

    if (existingMFA.rows.length > 0) {
      await pool.query(
        "UPDATE mfa_settings SET is_enabled = TRUE, enabled_methods = $1, updated_at = NOW() WHERE user_id = $2",
        [enabledMethods, userId]
      );
    } else {
      const backupCodes = generateBackupCodes();
      await pool.query(
        "INSERT INTO mfa_settings (user_id, is_enabled, enabled_methods, backup_codes) VALUES ($1, TRUE, $2, $3)",
        [userId, enabledMethods, backupCodes]
      );
    }

    res.json({
      status: "success",
      message: "MFA email berhasil diaktifkan",
      data: {
        enabledMethods: enabledMethods
      },
      error: null,
      metadata: null
    });
  } catch (err) {
    console.error("Enable email MFA error:", err);
    res.status(500).json({
      status: "error",
      message: "Terjadi kesalahan saat mengaktifkan MFA email",
      data: null,
      error: { code: "SERVER_ERROR" },
      metadata: null
    });
  }
};


exports.disableMFAMethod = async (req, res) => {
  const userId = req.user.id;
  const { method } = req.params;

  try {
    const result = await pool.query(
      "SELECT enabled_methods FROM mfa_settings WHERE user_id = $1",
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        status: "error",
        message: "MFA tidak ditemukan untuk user ini",
        data: null,
        error: { code: "MFA_NOT_FOUND" },
        metadata: null
      });
    }

    let enabledMethods = result.rows[0].enabled_methods || [];
    enabledMethods = enabledMethods.filter(m => m !== method);

    
    const isEnabled = enabledMethods.length > 0;

    let updateQuery, updateValues;
    if (method === 'totp') {
      updateQuery = "UPDATE mfa_settings SET is_enabled = $1, enabled_methods = $2, secret_key = NULL, updated_at = NOW() WHERE user_id = $3";
      updateValues = [isEnabled, enabledMethods, userId];
    } else {
      updateQuery = "UPDATE mfa_settings SET is_enabled = $1, enabled_methods = $2, updated_at = NOW() WHERE user_id = $3";
      updateValues = [isEnabled, enabledMethods, userId];
    }

    await pool.query(updateQuery, updateValues);

    res.json({
      status: "success",
      message: `MFA ${method} berhasil dinonaktifkan`,
      data: {
        isEnabled: isEnabled,
        enabledMethods: enabledMethods
      },
      error: null,
      metadata: null
    });
  } catch (err) {
    console.error("Disable MFA method error:", err);
    res.status(500).json({
      status: "error",
      message: "Terjadi kesalahan saat menonaktifkan MFA",
      data: null,
      error: { code: "SERVER_ERROR" },
      metadata: null
    });
  }
};


exports.sendMFACode = async (req, res) => {
  const { method, tempToken, purpose } = req.body;

  if (!method || !['email', 'sms'].includes(method)) {
    return res.status(400).json({
      status: "error",
      message: "Method tidak valid",
      data: null,
      error: { code: "INVALID_METHOD" },
      metadata: null
    });
  }

  try {
    let userId;
    
    
    if (purpose === "login" && tempToken) {
      
      const tempTokenResult = await pool.query(
        "SELECT user_id FROM temp_tokens WHERE token = $1 AND expires_at > NOW() AND used = FALSE",
        [tempToken]
      );
      
      if (tempTokenResult.rows.length === 0) {
        return res.status(400).json({
          status: "error",
          message: "Token tidak valid atau sudah kedaluwarsa",
          data: null,
          error: { code: "INVALID_TOKEN" },
          metadata: null
        });
      }
      
      userId = tempTokenResult.rows[0].user_id;
    } else {
      
      if (!req.user || !req.user.id) {
        return res.status(401).json({
          status: "error",
          message: "Akses ditolak",
          data: null,
          error: { code: "UNAUTHORIZED" },
          metadata: null
        });
      }
      userId = req.user.id;
    }

    
    const mfaResult = await pool.query(
      "SELECT enabled_methods FROM mfa_settings WHERE user_id = $1 AND is_enabled = TRUE",
      [userId]
    );

    if (mfaResult.rows.length === 0 || !mfaResult.rows[0].enabled_methods.includes(method)) {
      return res.status(400).json({
        status: "error",
        message: `MFA ${method} tidak diaktifkan`,
        data: null,
        error: { code: "MFA_NOT_ENABLED" },
        metadata: null
      });
    }

    
    const code = generateMFACode();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); 

    
    await pool.query(
      "INSERT INTO mfa_attempts (user_id, method, code, expires_at) VALUES ($1, $2, $3, $4)",
      [userId, method, code, expiresAt]
    );

    if (method === 'email') {
      
      const userRes = await pool.query("SELECT email FROM users WHERE id = $1", [userId]);
      const email = userRes.rows[0].email;

      
      const { sendEmail } = require("../utils/sendEmail");
      
      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <title>Kode Verifikasi MFA</title>
        </head>
        <body>
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>Kode Verifikasi MFA</h2>
            <p>Kode verifikasi MFA Anda adalah:</p>
            <div style="font-size: 24px; font-weight: bold; color: #367AF2; text-align: center; margin: 20px 0;">
              ${code}
            </div>
            <p>Kode ini akan kedaluwarsa dalam 10 menit.</p>
            <p>Jika Anda tidak meminta kode ini, abaikan email ini.</p>
          </div>
        </body>
        </html>
      `;

      await sendEmail(email, "Kode Verifikasi MFA - NewsInsight", html);
    }

    res.json({
      status: "success",
      message: `Kode MFA telah dikirim melalui ${method}`,
      data: {
        method: method,
        expiresAt: expiresAt
      },
      error: null,
      metadata: null
    });
  } catch (err) {
    console.error("Send MFA code error:", err);
    res.status(500).json({
      status: "error",
      message: "Terjadi kesalahan saat mengirim kode MFA",
      data: null,
      error: { code: "SERVER_ERROR" },
      metadata: null
    });
  }
};


exports.verifyMFACode = async (req, res) => {
  const { userId, method, code } = req.body;

  if (!userId || !method || !code) {
    return res.status(400).json({
      status: "error",
      message: "UserId, method, dan code wajib diisi",
      data: null,
      error: { code: "REQUIRED_FIELDS" },
      metadata: null
    });
  }

  try {
    if (method === 'totp') {
      
      const secretResult = await pool.query(
        "SELECT secret_key FROM mfa_settings WHERE user_id = $1",
        [userId]
      );

      if (secretResult.rows.length === 0) {
        return res.status(400).json({
          status: "error",
          message: "TOTP tidak dikonfigurasi",
          data: null,
          error: { code: "TOTP_NOT_CONFIGURED" },
          metadata: null
        });
      }

      const verified = speakeasy.totp.verify({
        secret: secretResult.rows[0].secret_key,
        encoding: 'base32',
        token: code,
        window: 2
      });

      if (!verified) {
        return res.status(400).json({
          status: "error",
          message: "Kode TOTP tidak valid",
          data: null,
          error: { code: "INVALID_TOTP" },
          metadata: null
        });
      }
    } else if (method === 'backup_code') {
      
      const backupResult = await pool.query(
        "SELECT backup_codes FROM mfa_settings WHERE user_id = $1",
        [userId]
      );

      if (backupResult.rows.length === 0) {
        return res.status(400).json({
          status: "error",
          message: "Backup codes tidak ditemukan",
          data: null,
          error: { code: "BACKUP_CODES_NOT_FOUND" },
          metadata: null
        });
      }

      const backupCodes = backupResult.rows[0].backup_codes || [];
      if (!backupCodes.includes(code.toUpperCase())) {
        return res.status(400).json({
          status: "error",
          message: "Backup code tidak valid",
          data: null,
          error: { code: "INVALID_BACKUP_CODE" },
          metadata: null
        });
      }

      
      const updatedCodes = backupCodes.filter(c => c !== code.toUpperCase());
      await pool.query(
        "UPDATE mfa_settings SET backup_codes = $1 WHERE user_id = $2",
        [updatedCodes, userId]
      );
    } else {
      
      const codeResult = await pool.query(
        "SELECT * FROM mfa_attempts WHERE user_id = $1 AND method = $2 AND code = $3 AND expires_at > NOW() AND is_used = FALSE ORDER BY created_at DESC LIMIT 1",
        [userId, method, code]
      );

      if (codeResult.rows.length === 0) {
        return res.status(400).json({
          status: "error",
          message: "Kode tidak valid atau sudah kedaluwarsa",
          data: null,
          error: { code: "INVALID_OR_EXPIRED_CODE" },
          metadata: null
        });
      }

      
      await pool.query(
        "UPDATE mfa_attempts SET is_used = TRUE WHERE id = $1",
        [codeResult.rows[0].id]
      );
    }

    res.json({
      status: "success",
      message: "Verifikasi MFA berhasil",
      data: {
        verified: true,
        method: method
      },
      error: null,
      metadata: null
    });
  } catch (err) {
    console.error("Verify MFA code error:", err);
    res.status(500).json({
      status: "error",
      message: "Terjadi kesalahan saat verifikasi MFA",
      data: null,
      error: { code: "SERVER_ERROR" },
      metadata: null
    });
  }
};


exports.getBackupCodes = async (req, res) => {
  const userId = req.user.id;

  try {
    const result = await pool.query(
      "SELECT backup_codes FROM mfa_settings WHERE user_id = $1",
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        status: "error",
        message: "MFA tidak dikonfigurasi",
        data: null,
        error: { code: "MFA_NOT_CONFIGURED" },
        metadata: null
      });
    }

    const backupCodes = result.rows[0].backup_codes || [];

    res.json({
      status: "success",
      message: "Backup codes berhasil diambil",
      data: {
        backupCodes: backupCodes,
        remaining: backupCodes.length
      },
      error: null,
      metadata: null
    });
  } catch (err) {
    console.error("Get backup codes error:", err);
    res.status(500).json({
      status: "error",
      message: "Terjadi kesalahan saat mengambil backup codes",
      data: null,
      error: { code: "SERVER_ERROR" },
      metadata: null
    });
  }
};


exports.generateNewBackupCodes = async (req, res) => {
  const userId = req.user.id;

  try {
    const newBackupCodes = generateBackupCodes();

    await pool.query(
      "UPDATE mfa_settings SET backup_codes = $1, updated_at = NOW() WHERE user_id = $2",
      [newBackupCodes, userId]
    );

    res.json({
      status: "success",
      message: "Backup codes baru berhasil dibuat",
      data: {
        backupCodes: newBackupCodes
      },
      error: null,
      metadata: null
    });
  } catch (err) {
    console.error("Generate new backup codes error:", err);
    res.status(500).json({
      status: "error",
      message: "Terjadi kesalahan saat membuat backup codes baru",
      data: null,
      error: { code: "SERVER_ERROR" },
      metadata: null
    });
  }
};


exports.verifyMFALogin = async (req, res) => {
  const { userId, code, method, trustDevice } = req.body;

  if (!userId || !code) {
    return res.status(400).json({
      status: "error",
      message: "User ID dan kode verifikasi wajib diisi",
      data: null,
      error: { code: "MISSING_PARAMETERS" },
      metadata: null
    });
  }

  try {
    
    const userRes = await pool.query("SELECT * FROM users WHERE id = $1", [userId]);
    const user = userRes.rows[0];

    if (!user) {
      return res.status(404).json({
        status: "error",
        message: "User tidak ditemukan",
        data: null,
        error: { code: "USER_NOT_FOUND" },
        metadata: null
      });
    }

    let isValid = false;
    let backupCodeUsed = false;

    if (method === "backup" || (!method && code.length > 6)) {      
      const backupResult = await pool.query(
        "SELECT backup_codes FROM mfa_settings WHERE user_id = $1",
        [userId]
      );

      if (backupResult.rows.length > 0) {
        const backupCodes = backupResult.rows[0].backup_codes || [];
        if (backupCodes.includes(code.toUpperCase())) {
          isValid = true;
          backupCodeUsed = true;
          
          
          const updatedCodes = backupCodes.filter(c => c !== code.toUpperCase());
          await pool.query(
            "UPDATE mfa_settings SET backup_codes = $1 WHERE user_id = $2",
            [updatedCodes, userId]
          );
        }
      }    } else {
      
      if (method === "totp") {
        
        const mfaSettingRes = await pool.query(
          "SELECT secret_key FROM mfa_settings WHERE user_id = $1 AND enabled_methods @> $2",
          [userId, '{"totp"}']
        );

        if (mfaSettingRes.rows.length > 0) {
          const secret = mfaSettingRes.rows[0].secret_key;
          isValid = speakeasy.totp.verify({
            secret: secret,
            encoding: 'base32',
            token: code,
            window: 2
          });
        }
      } else if (method === "email") {
        
        const attemptRes = await pool.query(
          "SELECT id FROM mfa_attempts WHERE user_id = $1 AND code = $2 AND method = 'email' AND expires_at > NOW() AND is_used = false ORDER BY created_at DESC LIMIT 1",
          [userId, code]
        );

        if (attemptRes.rows.length > 0) {
          isValid = true;
          
          
          await pool.query(
            "UPDATE mfa_attempts SET is_used = true WHERE id = $1",
            [attemptRes.rows[0].id]
          );
        }
      }
    }

    if (!isValid) {
      return res.status(400).json({
        status: "error",
        message: "Kode verifikasi tidak valid atau sudah kedaluwarsa",
        data: null,
        error: { code: "INVALID_MFA_CODE" },
        metadata: null
      });
    }

    
    if (trustDevice && !backupCodeUsed) {
      const deviceFingerprint = req.headers['user-agent'] || 'unknown';
      const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); 
      
      await pool.query(
        "INSERT INTO trusted_devices (user_id, device_fingerprint, expires_at) VALUES ($1, $2, $3) ON CONFLICT (user_id, device_fingerprint) DO UPDATE SET expires_at = $3",
        [userId, deviceFingerprint, expiresAt]
      );
    }    
    const token = jwt.sign(
      {
        userId: user.id,
        id: user.id,
        role: user.role,
        email: user.email,
        username: user.username,
        mfaVerified: true
      },
      process.env.JWT_SECRET || 'defaultsecret',
      { expiresIn: "2h" }
    );

    
    const profileResult = await pool.query(
      "SELECT full_name, gender, date_of_birth, phone_number, domicile, news_interest, headline, biography FROM profile WHERE user_id = $1",
      [user.id]
    );
    
    let isProfileComplete = false;
    if (profileResult.rows.length > 0) {
      const profile = profileResult.rows[0];
      
      isProfileComplete = !!(
        profile.full_name &&
        profile.gender &&
        profile.date_of_birth &&
        profile.phone_number &&
        profile.domicile &&
        profile.news_interest &&
        profile.headline &&
        profile.biography
      );
    }

    res.json({
      status: "success",
      message: "Login berhasil dengan verifikasi MFA",
      data: {
        account: {
          id: user.id,
          username: user.username,
          email: user.email,
          isVerified: user.email_verified,
          isProfileComplete: isProfileComplete,
          createdAt: user.created_at,
          updatedAt: user.updated_at,
          role: user.role
        },
        token,
        expiresIn: 7200,
        backupCodeUsed: backupCodeUsed
      },
      error: null,
      metadata: null
    });

  } catch (error) {
    console.error("Error verifying MFA login:", error);
    res.status(500).json({
      status: "error",
      message: "Terjadi kesalahan pada server",
      data: null,
      error: { code: "SERVER_ERROR" },
      metadata: null
    });
  }
};

module.exports = exports;
