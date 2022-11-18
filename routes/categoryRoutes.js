import express from "express";
import expressAsyncHandler from "express-async-handler";
import { admin, protect, optional } from "../middleware/AuthMiddleware.js";
import CategoryController from "../controllers/category.controller.js";

const categoryRouter = express.Router();

// categoryRouter.get("/all", protect, admin, expressAsyncHandler());
// categoryRouter.get("/disabled", protect, admin, expressAsyncHandler());
categoryRouter.patch("/:id/disable", protect, admin, expressAsyncHandler(CategoryController.disableCategory));
categoryRouter.patch("/:id/restore", protect, admin, expressAsyncHandler(CategoryController.restoreCategory));
categoryRouter.put("/:id", protect, admin, expressAsyncHandler(CategoryController.updateCategory));
categoryRouter.delete("/:id", protect, admin, expressAsyncHandler(CategoryController.deleteCategory));
categoryRouter.post("/", protect, admin, expressAsyncHandler(CategoryController.createCategory));
categoryRouter.get("/", optional, expressAsyncHandler(CategoryController.getCategory));
// categoryRouter.get("/", expressAsyncHandler());

export default categoryRouter;
