import express from "express";
import expressAsyncHandler from "express-async-handler";
import bannerController from "../controllers/banner.controller.js";
import { admin, protect, optional } from "../middleware/AuthMiddleware.js";
import { upload } from "./../middleware/UploadMiddleware.js";

const bannerRouter = express.Router();

bannerRouter.patch("/:id/disable", protect, admin, expressAsyncHandler(bannerController.disableBanner));
bannerRouter.patch("/:id/restore", protect, admin, expressAsyncHandler(bannerController.restoreBanner));
bannerRouter.delete("/:id", protect, admin, expressAsyncHandler(bannerController.deleteBanner));
bannerRouter.put("/:id", protect, admin, upload.single("file"), expressAsyncHandler(bannerController.updateBanner));
bannerRouter.post("/", protect, admin, upload.single("file"), expressAsyncHandler(bannerController.createBanner));
bannerRouter.get("/", optional, expressAsyncHandler(bannerController.getBanner));
export default bannerRouter;
