const express = require("express");
const router = express.Router();
const userController = require("../controllers/usersController");
const middlewareAuth = require("../middleware/middlewareAuth");
const adminOnly = require("../middleware/adminOnly");

router.get("/", middlewareAuth, adminOnly, userController.getAllUsers);
router.get("/:id", middlewareAuth, adminOnly, userController.getUserById);
router.post("/", middlewareAuth, adminOnly, userController.createUser);
router.put("/:id", middlewareAuth, adminOnly, userController.updateUser);
router.delete("/:id", middlewareAuth, adminOnly, userController.deleteUser);

module.exports = router;
