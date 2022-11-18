import express from "express";
import expressAsyncHandler from "express-async-handler";
import { admin, protect } from "../middleware/AuthMiddleware.js";
import CartController from "../controllers/cart.controller.js";

const cartRouter = express.Router();

cartRouter.patch("/add", protect, expressAsyncHandler(CartController.userAddToCart));
cartRouter.patch("/update", protect, expressAsyncHandler(CartController.updateExisedtCart));
cartRouter.patch("/remove", protect, expressAsyncHandler(CartController.removeCart));
cartRouter.get("/", protect, expressAsyncHandler(CartController.userGetTheirCart));
cartRouter.post("/", protect, expressAsyncHandler(CartController.createNewCart));

export default cartRouter;
