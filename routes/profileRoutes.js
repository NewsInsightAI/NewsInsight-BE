const express = require("express");
const router = express.Router();
const profileController = require("../controllers/profileController");
const middlewareAuth = require("../middleware/middlewareAuth");
const adminOnly = require("../middleware/adminOnly");

router.get("/", middlewareAuth, profileController.getAllProfiles);
router.get("/me", middlewareAuth, profileController.getMyProfile);
router.put("/me", middlewareAuth, profileController.updateMyProfile);

// Font accessibility settings routes
router.get("/font-settings", middlewareAuth, profileController.getFontSettings);
router.put("/font-settings", middlewareAuth, profileController.updateFontSettings);

router.get("/:userId", middlewareAuth, profileController.getProfileByUserId);
router.post(
  "/:userId",
  middlewareAuth,
  adminOnly,
  profileController.upsertProfile
);
router.delete(
  "/:userId",
  middlewareAuth,
  adminOnly,
  profileController.deleteProfile
);

module.exports = router;
