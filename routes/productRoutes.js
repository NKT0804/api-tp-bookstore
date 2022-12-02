import express from "express";
import expressAsyncHandler from "express-async-handler";
import { admin, protect, optional } from "./../middleware/AuthMiddleware.js";
import ProductController from "../controllers/product.controller.js";
import { upload } from "./../middleware/UploadMiddleware.js";

const productRouter = express.Router();

productRouter.get("/", optional, expressAsyncHandler(ProductController.getProducts));
productRouter.post("/", protect, admin, upload.single("file"), expressAsyncHandler(ProductController.createProduct));
productRouter.get("/:id", expressAsyncHandler(ProductController.getDetailProductById));
productRouter.put("/:id", protect, admin, upload.single("file"), expressAsyncHandler(ProductController.updateProduct));
productRouter.delete("/:id", protect, admin, expressAsyncHandler(ProductController.deleteProduct));
productRouter.get("/slug/:slug", expressAsyncHandler(ProductController.getDetailProductBySlug));
productRouter.get("/:id/comments", expressAsyncHandler(ProductController.getProductComments));
productRouter.post("/:id/review", protect, expressAsyncHandler(ProductController.reviewProduct));
productRouter.patch("/:id/disable", protect, admin, expressAsyncHandler(ProductController.disableProduct));
productRouter.patch("/:id/restore", protect, admin, expressAsyncHandler(ProductController.restoreProduct));

export default productRouter;
