import express from "express";
import expressAsyncHandler from "express-async-handler";
import { admin, protect } from "../middleware/AuthMiddleware.js";
import RefreshTokenController from "../controllers/refreshToken.controller.js";

const refreshTokenRouter = express.Router();

refreshTokenRouter.patch("/refresh", protect, expressAsyncHandler(RefreshTokenController.refreshAccessToken));
// refreshTokenRouter.get("/", expressAsyncHandler(RefreshTokenController.getAllRefreshTokenForTest));
refreshTokenRouter.post("/", protect, expressAsyncHandler(RefreshTokenController.createNewRefreshTokenForTest));

export default refreshTokenRouter;
