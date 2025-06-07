const express = require("express");
const router = express.Router();
const citiesController = require("../controllers/citiesController");

router.get("/provinces", citiesController.getProvinces);

router.get("/regencies/:provinceId", citiesController.getRegenciesByProvince);

router.get("/regencies", citiesController.getAllRegencies);

router.get("/search", citiesController.searchRegencies);

module.exports = router;
