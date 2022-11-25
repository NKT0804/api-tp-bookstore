import express from "express";
import expressAsyncHandler from "express-async-handler";
import { admin, protect } from "./../middleware/AuthMiddleware.js";
import { upload } from "./../middleware/UploadMiddleware.js";
import UserController from "../controllers/user.controller.js";

const userRouter = express.Router();

userRouter.get("/", protect, admin, expressAsyncHandler(UserController.getUsers));
userRouter.post("/", expressAsyncHandler(UserController.register));
userRouter.delete("/:id", protect, admin, expressAsyncHandler(UserController.deleteUser));
userRouter.post("/login", expressAsyncHandler(UserController.login));
userRouter.get("/profile", protect, expressAsyncHandler(UserController.getProfile));
userRouter.get("/profile/:id", protect, admin, expressAsyncHandler(UserController.getProfileByAdmin));
userRouter.put("/profile", protect, expressAsyncHandler(UserController.updateProfile));
userRouter.post("/updateAvatar/:id", protect, upload.single("file"), expressAsyncHandler(UserController.uploadAvatar));
userRouter.post("/:id/updatePassword", protect, expressAsyncHandler(UserController.updatePassword));
userRouter.patch("/forgotPassword", expressAsyncHandler(UserController.forgotPassword));
userRouter.patch("/resetPassword", expressAsyncHandler(UserController.resetPassword));
userRouter.patch("/verifyEmail", expressAsyncHandler(UserController.verifyEmail));
userRouter.patch("/:id/disable", protect, admin, expressAsyncHandler(UserController.disableUser));
userRouter.patch("/:id/restore", protect, admin, expressAsyncHandler(UserController.restoreUser));

export default userRouter;
