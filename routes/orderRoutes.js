import express from "express";
import expressAsyncHandler from "express-async-handler";
import { admin, protect } from "./../middleware/AuthMiddleware.js";
import OrderController from "../controllers/order.controller.js";

const orderRouter = express.Router();

orderRouter.get("/", protect, admin, expressAsyncHandler(OrderController.getOrderAdmin));
orderRouter.post("/", protect, expressAsyncHandler(OrderController.createNewOrder));
orderRouter.delete("/:id", protect, admin, expressAsyncHandler(OrderController.deleteOrder));
orderRouter.get("/:id", protect, expressAsyncHandler(OrderController.getDetailOrderById));
orderRouter.get("/ordered/:user", protect, expressAsyncHandler(OrderController.getOrder));
orderRouter.patch("/:id/delivered", protect, admin, expressAsyncHandler(OrderController.confirmDelivered));
orderRouter.patch("/:id/confirm", protect, admin, expressAsyncHandler(OrderController.confirmOrder));
orderRouter.patch("/:id/cancel-user", protect, expressAsyncHandler(OrderController.cancelOrderUser));
orderRouter.patch("/:id/cancel-admin", protect, admin, expressAsyncHandler(OrderController.cancelOrderAdmin));
orderRouter.patch("/:id/received", protect, expressAsyncHandler(OrderController.Received));
orderRouter.patch("/:id/payment", protect, admin, expressAsyncHandler(OrderController.orderPayment));
orderRouter.patch("/:id/disable", protect, admin, expressAsyncHandler(OrderController.disableOrder));
orderRouter.patch("/:id/restore", protect, admin, expressAsyncHandler(OrderController.restoreOrder));

export default orderRouter;
