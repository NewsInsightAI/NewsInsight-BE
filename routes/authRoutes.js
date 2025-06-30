const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");
const googleAuthController = require("../controllers/googleAuthController");
const middlewareAuth = require("../middleware/middlewareAuth");

router.post("/register", authController.register);
router.post("/login", authController.login);
router.post("/verify-email", authController.verifyEmail);

router.get("/test-connection", (req, res) => {
  res.json({
    status: "success",
    message: "Backend connection successful",
    timestamp: new Date().toISOString(),
    data: { server: "NewsInsight Backend", version: "1.0.0" }
  });
});

router.post("/resend-otp", authController.resendOtp);
router.post("/request-reset-password", authController.requestResetPassword);
router.post("/reset-password", authController.resetPassword);
router.post("/check-reset-token", authController.checkResetToken);
router.post("/google", googleAuthController.googleAuth);
router.post("/verify-mfa-token", authController.verifyMfaToken);

router.get("/user-info", middlewareAuth, authController.getUserInfo);
router.put("/update-email", middlewareAuth, authController.updateEmail);
router.put("/update-password", middlewareAuth, authController.updatePassword);

module.exports = router;
