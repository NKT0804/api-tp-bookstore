import express from "express";
import mongoose, { isObjectIdOrHexString } from "mongoose";
import expressAsyncHandler from "express-async-handler";
import { admin, protect } from "../middleware/AuthMiddleware.js";
import Order from "../models/OrderModel.js";
import Product from "../models/ProductModel.js";
import Cart from "../models/CartModel.js";
import { orderQueryParams, validateConstants } from "../constants/searchConstants.js";
import { sendMail } from "../utils/nodemailler.js";

//User place new order
const createNewOrder = async (req, res, next) => {
    const { orderItems, receiver, phone, shippingAddress, paymentMethod, itemsPrice, shippingPrice, totalPrice } =
        req.body;
    const orderItemsId = orderItems.map((orderItem) => orderItem.product);
    if (orderItems && orderItems.length === 0) {
        res.status(400);
        throw new Error("Đơn hàng không có sản phẩm nào!");
    }
    const cart = await Cart.findOne({ user: req.user._id });
    if (!cart) {
        res.status(404);
        throw new Error("Giỏ hàng không tồn tại!");
    }
    const session = await mongoose.startSession();
    const transactionOptions = {
        readPreference: "primary",
        readConcern: { level: "local" },
        writeConcern: { w: "majority" }
    };
    try {
        await session.withTransaction(async () => {
            const order = new Order({
                orderItems,
                user: req.user._id,
                receiver,
                phone,
                shippingAddress,
                paymentMethod,
                itemsPrice,
                shippingPrice,
                totalPrice
            });
            for (const orderItem of orderItems) {
                const orderedProduct = await Product.findOneAndUpdate(
                    { _id: orderItem.product, isDisabled: false, countInStock: { $gte: orderItem.qty } },
                    { $inc: { countInStock: -orderItem.qty, totalSales: +orderItem.qty } },
                    { new: true }
                ).session(session);
                if (!orderedProduct) {
                    await session.abortTransaction();
                    res.status(400);
                    throw new Error("Đơn hàng có sản phẩm đã vượt số lượng sản phẩm trong kho!");
                }
            }
            const updatedCart = await Cart.findOneAndUpdate(
                { user: req.user._id },
                { $pull: { cartItems: { product: { $in: orderItemsId } } } }
            );
            if (!updatedCart) {
                await session.abortTransaction();
                res.status(500);
                throw new Error("Xóa sản phẩm trong giỏ hàng không thành công!");
            }
            const createdOrder = await order.save();
            const url = `${process.env.WEB_CLIENT_URL}`;
            const html = `<img
            src="https://res.cloudinary.com/nkt2001/image/upload/v1664988644/logo/logo_vd616y.png?fbclid=IwAR0hgGY9-hFxr30G2dacxHMczMGUJ6SLjddCZHy8tkqEd4FCmNL--ckVPX8"
            style="height: 100px; margin-left: 29.5%; margin-bottom: -20px"
          />
          <div style="margin-left: 22.5%; font-size: 17px">
            
            <div
              style="
                width: 514px;
                padding: 20px;
                margin: 28px;
                border: #e1e4e8 solid 1px;
                border-radius: 8px;
              "
            >
              <p>Xin chào ${req.user.name}, Cảm ơn bạn đã mua hàng tại của hàng chúng tôi.</p>
              <h4>Thông tin chi tiết đơn hàng.</h4>
              <p>Mã đơn hàng: ${createdOrder._id}</p>
              <p>Tên người nhận: ${createdOrder.receiver}</p>
              <p>Địa chỉ: ${createdOrder.shippingAddress}</p>
              <p>Ngày đặt hàng: ${createdOrder.createdAt}</p>
              <p>Số điện thoại: ${createdOrder.phone}</p>
              <p>Phí vận chuyển: ${
                  String(createdOrder.shippingPrice)
                      .split("")
                      .reverse()
                      .reduce((prev, next, index) => {
                          return (index % 3 ? next : next + ".") + prev;
                      }) + " ₫"
              }</p>
              <p>Thành tiền: ${
                  String(createdOrder.totalPrice)
                      .split("")
                      .reverse()
                      .reduce((prev, next, index) => {
                          return (index % 3 ? next : next + ".") + prev;
                      }) + " ₫"
              }</p>
              <p>Phương thức thanh toán: ${createdOrder.paymentMethod}</p>
              <div style="margin: auto">
                <table
                  style="
                    border: 1px solid black;
                    border-collapse: collapse;
                    padding: 5px;
                  "
                >
                  <thead>
                    <tr>
                      <th style="border: 1px solid black">Tên sách</th>
                      <th style="border: 1px solid black">Số lượng</th>
                      <th style="border: 1px solid black">Giá</th>
                    </tr>
                  </thead>
                  <tbody>
                  ${createdOrder.orderItems.map((order) => {
                      return `
                    <tr>
                    <td style="border: 1px solid black; padding: 4px">${order.name}</td>
                    <td style="border: 1px solid black; padding: 4px">${order.qty}</td>
                    <td style="border: 1px solid black; padding: 4px">${
                        String(order.price)
                            .split("")
                            .reverse()
                            .reduce((prev, next, index) => {
                                return (index % 3 ? next : next + ".") + prev;
                            }) + " ₫"
                    }</td>
                    </tr>
                    `;
                  })}
                  </tbody>
                </table>
              </div>
              <a
                href="${url}"
                target="_blank"
                style="text-decoration: none; margin-left: 32.5%"
              >
                <div style="display: flex; justify-content: space-around">
                  <button
                    style="
                      background-color: #4ac4fa;
                      padding: 15px 25px;
                      border: none;
                      border-radius: 8px;
                      font-size: 17px;
                    "
                  >
                    Đi đến website cửa hàng
                  </button>
                </div>
              </a>
              <p style="text-align: right">Trân trọng.</p>
              <p style="text-align: right">TPBookStore</p>
            </div>
          </div>`;
            const messageOptions = {
                recipient: req.user.email,
                subject: "Đơn hàng của bạn",
                html: html
            };
            //send verify email
            await sendMail(messageOptions);

            res.status(201);
            res.json(createdOrder);
        }, transactionOptions);
    } catch (error) {
        next(error);
    } finally {
        await session.endSession();
    }
};

//Get order
const getOrderAdmin = async (req, res) => {
    let page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 20;
    const keyword = req.query.keyword || "";

    const statusFilter = validateConstants(orderQueryParams, "status", req.query.status);
    const count = await Order.countDocuments({ ...statusFilter });
    if (count == 0) {
        res.status(204);
        throw new Error("Không có đơn hàng nào!");
    }
    const pages = Math.ceil(count / limit);
    page = page <= pages ? page : 1;
    const orders = await Order.find({ ...statusFilter })
        .limit(limit)
        .skip(limit * (page - 1))
        .sort({ createdAt: "desc" })
        .populate("user shipper", "-password");
    res.status(200);
    res.json({ orders, page, pages, total: count });
};

//Get order
const getOrderShipper = async (req, res) => {
    let page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 20;
    const keyword = req.query.keyword || "";

    const statusFilter = validateConstants(orderQueryParams, "status", req.query.status);
    const count = await Order.countDocuments({ shipper: req.user._id, ...statusFilter });
    if (count == 0) {
        res.status(204);
        throw new Error("Không có đơn hàng nào!");
    }
    const pages = Math.ceil(count / limit);
    page = page <= pages ? page : 1;
    const orders = await Order.find({ shipper: req.user._id, ...statusFilter })
        .limit(limit)
        .skip(limit * (page - 1))
        .sort({ createdAt: "desc" })
        .populate("user", "-password");
    res.status(200);
    res.json({ orders, page, pages, total: count });
};
/**
 * Read: ADMIN GET ALL ORDERS
 */
// orderRouter.get(
//     "/all",
//     protect,
//     admin,
//     expressAsyncHandler(async (req, res) => {
//         //await Order.updateMany({}, { $set: { isDisabled: false } }, {multi: true});
//         const orders = await Order.find({ isDisabled: false }).sort({ _id: -1 }).populate("user", "-password");
//         res.json(orders);
//     })
// );

// //Admin get all disabled orders
// orderRouter.get(
//     "/disabled",
//     protect,
//     admin,
//     expressAsyncHandler(async (req, res) => {
//         const orders = await Order.find({ isDisabled: true });
//         if (orders.length != 0) {
//             res.status(200);
//             res.json(orders);
//         } else {
//             res.status(204);
//             res.json({ message: "No orders are disabled" });
//         }
//     })
// );

/**
 * Read: USER LOGIN ORDERS
 */
const getOrder = async (req, res) => {
    const orders = await Order.find({ user: req.params.user, isDisabled: false })
        .sort({ createdAt: "desc" })
        .populate("user", "-password");
    res.json(orders);
};

/**
 * Read: GET ORDER BY ID
 */
const getDetailOrderById = async (req, res) => {
    const orderId = req.params.id || null;
    const order = await Order.findOne({ _id: orderId }).populate("user orderItems.product shipper", "-password");
    if (!order) {
        res.status(404);
        throw new Error("Đơn hàng không tồn tại!");
    }
    res.status(200);
    res.json(order);
};

/**
 * Update: ORDER IS PAID
 */
const orderPayment = async (req, res) => {
    const orderId = req.params.id || null;
    const order = await Order.findOne({ _id: orderId, isDisabled: false });
    if (!order) {
        res.status(404);
        throw new Error("Đơn hàng không tồn tại!");
    }
    order.isPaid = true;
    order.paidAt = Date.now();
    const updateOrder = await order.save();
    res.json(updateOrder);
};

/**
 * Update: ORDER IS DELIVERED
 */
const confirmDelivered = async (req, res) => {
    const orderId = req.params.id || null;
    const order = await Order.findOne({ _id: orderId, isDisabled: false });
    if (!order) {
        res.status(404);
        throw new Error("Đơn hàng không tồn tại!");
    }
    if (!order.confirmed) {
        res.status(400);
        throw new Error("Đơn hàng chưa được xác nhận!");
    }
    order.delivered = true;
    order.deliveredAt = Date.now();
    order.isPaid = true;
    order.paidAt = Date.now();
    const updateOrder = await order.save();
    res.status(200);
    res.json(updateOrder);
};

/**
 * Update: CONFIRM ORDER
 */
const confirmOrder = async (req, res) => {
    const orderId = req.params.id || null;
    const order = await Order.findOne({ _id: orderId, isDisabled: false });
    if (!order) {
        res.status(404);
        throw new Error("Đơn hàng không tồn tại!");
    }
    order.confirmed = true;
    const updateOrder = await order.save();
    res.status(200);
    res.json(updateOrder);
};
/**
 * Update: SELECT SHIPPER
 */
const selectShipper = async (req, res) => {
    const orderId = req.params.id || null;
    const order = await Order.findOne({ _id: orderId, isDisabled: false });
    if (!order) {
        res.status(404);
        throw new Error("Đơn hàng không tồn tại!");
    }
    order.shipper = req.body.shipper || order.shipper;
    order.estimatedDeliveryDate = req.body.estimatedDeliveryDate || order.estimatedDeliveryDate;
    const updateOrder = await order.save();
    res.status(200);
    res.json(updateOrder);
};
/**
 * Update: CANCEL ORDER ADMIN
 */
const cancelOrderAdmin = async (req, res) => {
    const orderId = req.params.id || null;
    const order = await Order.findOne({ _id: orderId, isDisabled: false });
    if (!order) {
        res.status(404);
        throw new Error("Đơn hàng không tồn tại!");
    }
    if (order.delivered) {
        res.status(400);
        throw new Error("Đơn hàng đã giao thành công không thể hủy được!");
    }
    order.cancelled = true;
    for (const orderItem of order.orderItems) {
        const orderedProduct = await Product.findOneAndUpdate(
            { _id: orderItem.product },
            { $inc: { countInStock: +orderItem.qty, totalSales: -orderItem.qty } },
            { new: true }
        );
    }
    const updateOrder = await order.save();
    res.status(200);
    res.json(updateOrder);
};

/**
 * Update: CANCEL ORDER USER
 */
const cancelOrderUser = async (req, res) => {
    const orderId = req.params.id || null;
    const userId = req.user._id || null;
    const order = await Order.findOne({ _id: orderId, user: userId, isDisabled: false });
    if (!order) {
        res.status(404);
        throw new Error("Đơn hàng không tồn tại!");
    }
    if (order.confirmed) {
        res.status(400);
        throw new Error("Đơn hàng đã được xác nhận không thể hủy, vui lòng liên hệ cửa hàng để được hỗ trợ!");
    }
    order.cancelled = true;
    for (const orderItem of order.orderItems) {
        const orderedProduct = await Product.findOneAndUpdate(
            { _id: orderItem.product },
            { $inc: { countInStock: +orderItem.qty, totalSales: -orderItem.qty } },
            { new: true }
        );
    }
    const updateOrder = await order.save();
    res.status(200);
    res.json(updateOrder);
};

/**
 * Update: ORDER IS RECEIVED
 */
const Received = async (req, res) => {
    const orderId = req.params.id || null;
    const order = await Order.findOne({ _id: orderId, isDisabled: false });
    if (!order) {
        res.status(404);
        throw new Error("Đơn hàng không tồn tại!");
    }
    order.received = true;
    const updateOrder = await order.save();
    res.status(200);
    res.json(updateOrder);
};
//Admin disable order
const disableOrder = async (req, res) => {
    const order = await Order.findById(req.params.id);
    if (!order) {
        res.status(404);
        throw new Error("Đơn hàng không tồn tại!");
    }
    if (order.cancelled || order.delivered) {
        order.isDisabled = true;
        await order.save();
        res.status(200);
        res.json({ message: "Đơn hàng đã bị vô hiệu hóa!" });
    } else {
        res.status(400);
        throw new Error("Đơn hàng không thể ẩn khi chưa giao hàng thành công hoặc chưa bị hủy!");
    }
};

//Admin restore disabled order
const restoreOrder = async (req, res) => {
    const orderId = req.params.id || null;
    const order = await Order.findOne({ _id: orderId, isDisabled: true });
    if (!order) {
        res.status(404);
        throw new Error("Đơn hàng không tồn tại!");
    }
    order.isDisabled = false;
    const updateOrder = await order.save();
    res.status(200);
    res.json(updateOrder);
};

//Admin delete order
const deleteOrder = async (req, res) => {
    const order = await Order.findById(req.params.id);
    if (!order) {
        res.status(404);
        throw new Error("Đơn hàng không tồn tại!");
    }
    if (order.cancelled || order.delivered) {
        await order.remove();
        res.status(200);
        res.json({ message: "Đơn hàng đã được xóa!" });
    } else {
        res.status(400);
        throw new Error("Đơn hàng không thể xóa khi chưa giao hàng thành công hoặc chưa bị hủy!");
    }
};

const OrderController = {
    createNewOrder,
    getOrderAdmin,
    getOrderShipper,
    getOrder,
    getDetailOrderById,
    orderPayment,
    confirmDelivered,
    confirmOrder,
    selectShipper,
    cancelOrderAdmin,
    cancelOrderUser,
    Received,
    disableOrder,
    restoreOrder,
    deleteOrder
};

export default OrderController;
