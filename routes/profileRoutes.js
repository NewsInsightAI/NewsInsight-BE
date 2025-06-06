const express = require("express");
const router = express.Router();
const profileController = require("../controllers/profileController");
const middlewareAuth = require("../middleware/middlewareAuth");

router.get("/", middlewareAuth, profileController.getAllProfiles);
router.get("/:userId", middlewareAuth, profileController.getProfileByUserId);
router.post("/:userId", middlewareAuth, profileController.upsertProfile);
router.delete("/:userId", middlewareAuth, profileController.deleteProfile);

module.exports = router;
