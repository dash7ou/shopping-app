const path = require("path");

const express = require("express");
const isAuth = require("../middleware/is-auth");
const adminController = require("../controllers/admin");
const { check, body } = require("express-validator");

const router = express.Router();

// /admin/add-product => GET
router.get("/add-product", isAuth, adminController.getAddProduct);

// /admin/products => GET
router.get("/products", isAuth, adminController.getProducts);

// /admin/add-product => POST
router.post(
  "/add-product",
  isAuth,
  [
    body("title")
      .isString()
      .isLength({ min: 3 })
      .trim(),
    body("price")
      .isFloat()
      .trim(),
    body("description")
      .isString()
      .trim()
      .isLength({ min: 5, max: 200 })
  ],
  adminController.postAddProduct
);

router.get("/edit-product/:productId", isAuth, adminController.getEditProduct);

router.post(
  "/edit-product",
  [
    body("title")
      .isString()
      .isLength({ min: 3 })
      .trim(),
    body("price")
      .isFloat()
      .trim(),
    body("description")
      .isString()
      .trim()
      .isLength({ min: 5, max: 200 })
  ],
  isAuth,
  adminController.postEditProduct
);

router.post("/delete-product", isAuth, adminController.postDeleteProduct);

module.exports = router;
