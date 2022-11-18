import express from "express";
import expressAsyncHandler from "express-async-handler";
import { admin, protect } from "./../middleware/AuthMiddleware.js";
import CommentController from "../controllers/comment.controller.js";
const commentRouter = express.Router();

commentRouter.post("/", protect, expressAsyncHandler(CommentController.createComment));
commentRouter.get("/", protect, admin, expressAsyncHandler(CommentController.getCommentByAdmin));
commentRouter.delete("/:id", protect, expressAsyncHandler(CommentController.deleteComment));
commentRouter.patch("/:id/content", protect, expressAsyncHandler(CommentController.editComment));
commentRouter.patch("/:id/disable", protect, admin, expressAsyncHandler(CommentController.disableComment));
commentRouter.patch("/:id/restore", protect, admin, expressAsyncHandler(CommentController.restoreComment));

export default commentRouter;
