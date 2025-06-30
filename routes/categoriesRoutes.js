const express = require("express");
const router = express.Router();
const categoriesController = require("../controllers/categoriesController");
const middlewareAuth = require("../middleware/middlewareAuth");
const adminOnly = require("../middleware/adminOnly");


router.get("/", categoriesController.getAllCategories);

router.get("/:id", categoriesController.getCategoryById);

router.post(
  "/",
  middlewareAuth,
  adminOnly,
  categoriesController.createCategory
);

router.put(
  "/:id",
  middlewareAuth,
  adminOnly,
  categoriesController.updateCategory
);

router.delete(
  "/:id",
  middlewareAuth,
  adminOnly,
  categoriesController.deleteCategory
);


router.delete(
  "/",
  middlewareAuth,
  adminOnly,
  categoriesController.bulkDeleteCategories
);

module.exports = router;
