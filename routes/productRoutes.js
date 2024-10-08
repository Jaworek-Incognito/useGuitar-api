const express = require("express");
const router = express.Router();

const multer = require("multer");
const upload = multer();

const {
  createProduct,
  getAllProducts,
  getSingleProduct,
  updateProduct,
  deleteProduct,
  deleteProductImage,
  changeProductInventory,
} = require("../controllers/productController");
const {
  authenticateUser,
  permission,
} = require("../middleware/authentication");

router
  .route("/")
  .post(authenticateUser, permission("admin"), upload.any(), createProduct)
  .get(authenticateUser, permission("admin"), getAllProducts);

router
  .route("/deleteImage/:name")
  .delete(authenticateUser, permission("admin"), deleteProductImage);

router
  .route("/:name")
  .get(authenticateUser, permission("admin"), getSingleProduct)
  .patch(authenticateUser, permission("admin"), upload.any(), updateProduct)
  .delete(authenticateUser, permission("admin"), deleteProduct);

router
  .route("/inventory/:name")
  .patch(authenticateUser, permission("admin"), changeProductInventory);

module.exports = router;
