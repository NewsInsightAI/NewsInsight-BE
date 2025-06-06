const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");
const googleAuthController = require("../controllers/googleAuthController");

router.post("/register", authController.register);
router.post("/login", authController.login);
router.post("/verify-email", authController.verifyEmail);
router.post("/resend-otp", authController.resendOtp);
router.post("/request-reset-password", authController.requestResetPassword);
router.post("/reset-password", authController.resetPassword);
router.post("/check-reset-token", authController.checkResetToken);
router.post("/google", googleAuthController.googleAuth);

module.exports = router;
