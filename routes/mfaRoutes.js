const express = require("express");
const router = express.Router();
const mfaController = require("../controllers/mfaController");
const middlewareAuth = require("../middleware/middlewareAuth");

router.get("/status", middlewareAuth, mfaController.getMFAStatus);
router.post("/totp/setup", middlewareAuth, mfaController.setupTOTP);
router.post("/totp/verify", middlewareAuth, mfaController.verifyTOTP);
router.post("/email/enable", middlewareAuth, mfaController.enableEmailMFA);
router.delete("/method/:method", middlewareAuth, mfaController.disableMFAMethod);
router.post("/send-code", mfaController.sendMFACode);
router.post("/verify-code", mfaController.verifyMFACode);
router.post("/verify-login", mfaController.verifyMFALogin);
router.get("/backup-codes", middlewareAuth, mfaController.getBackupCodes);
router.post("/backup-codes/regenerate", middlewareAuth, mfaController.generateNewBackupCodes);

module.exports = router;
