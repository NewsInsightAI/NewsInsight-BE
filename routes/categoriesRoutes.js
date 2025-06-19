const express = require("express");
const router = express.Router();
const categoriesController = require("../controllers/categoriesController");
const middlewareAuth = require("../middleware/middlewareAuth");
const adminOnly = require("../middleware/adminOnly");

// Get all categories (public access for reading)
router.get("/", categoriesController.getAllCategories);

// Get category by ID (public access for reading)
router.get("/:id", categoriesController.getCategoryById);

// Create new category (admin only)
router.post(
  "/",
  middlewareAuth,
  adminOnly,
  categoriesController.createCategory
);

// Update category (admin only)
router.put(
  "/:id",
  middlewareAuth,
  adminOnly,
  categoriesController.updateCategory
);

// Delete category (admin only)
router.delete(
  "/:id",
  middlewareAuth,
  adminOnly,
  categoriesController.deleteCategory
);

// Bulk delete categories (admin only)
router.delete(
  "/",
  middlewareAuth,
  adminOnly,
  categoriesController.bulkDeleteCategories
);

module.exports = router;
