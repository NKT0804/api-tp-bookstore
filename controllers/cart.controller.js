import express from "express";
import expressAsyncHandler from "express-async-handler";
import { admin, protect } from "../middleware/AuthMiddleware.js";
import Cart from "../models/CartModel.js";
//import User from "../models/CategoryModel.js";
import Product from "../models/ProductModel.js";

//User get their cart
const userGetTheirCart = async (req, res) => {
    const userId = req.user._id || null;
    const cart = await Cart.findOne({ user: userId }).populate("cartItems.product");
    if (!cart) {
        res.status(404);
        throw new Error("Giỏ hàng không tồn tại!");
    }
    if (cart.cartItems.length > 0) {
        cart.cartItems.forEach((item) => {
            if (item.product.countInStock < item.qty) {
                item.qty = item.product.countInStock;
            }
        });
    }
    const updateCart = await cart.save();
    res.status(200);
    res.json(updateCart);
};

//Create new cart - Not use
const createNewCart = async (req, res) => {
    const userId = req.user._id || null;
    const existedCart = await Cart.findOne({ user: userId });
    if (existedCart) {
        res.status(400);
        throw new Error("Giỏ hàng đã tồn tại!");
    }
    const newCart = await Cart.create({
        user: userId,
        cartItems: []
    });
    res.status(200);
    res.json(newCart);
};

//User add to cart
const userAddToCart = async (req, res) => {
    const userId = req.user._id || null;
    const { productId } = req.body;
    let { qty } = req.body;
    const cart = await Cart.findOne({ user: userId });
    if (!cart) {
        res.status(404);
        throw new Error("Giỏ hàng không tồn tại!");
    }
    // const { productId, qty } = req.body;
    if (qty <= 0) {
        res.status(400);
        throw new Error("Số lượng sản phẩm thêm phải lớn hơn 0!");
    }
    const product = await Product.findOne({ _id: productId, isDisabled: false });
    let addedItemIndex = cart.cartItems.findIndex((item) => item.product.toString() == productId.toString());
    if (addedItemIndex !== -1) {
        cart.cartItems[addedItemIndex].qty += qty;
        if (cart.cartItems[addedItemIndex].qty > product.countInStock)
            cart.cartItems[addedItemIndex].qty = product.countInStock;
    } else {
        if (!product) {
            res.status(404);
            throw new Error("Sản phẩm không tồn tại!");
        }
        if (qty > product.countInStock) qty = product.countInStock;
        const cartItem = {
            product: productId,
            qty: qty
        };
        cart.cartItems.unshift(cartItem);
    }
    const updatedCart = await cart.save();
    const returnCart = await Cart.findById(updatedCart._id).populate("cartItems.product");
    res.status(200);
    res.json(returnCart);
};

//User update existed cart item
const updateExisedtCart = async (req, res) => {
    const userId = req.user._id || null;
    const { productId, qty, isBuy } = req.body;
    const cart = await Cart.findOne({ user: userId });
    if (!cart) {
        res.status(404);
        throw new Error("Giỏ hàng không tồn tại!");
    }
    const addedItemIndex = cart.cartItems.findIndex((item) => item.product.toString() === productId.toString());
    if (addedItemIndex == -1) {
        throw new Error("Sản phẩm không tồn tại trong giỏ hàng!");
    }

    cart.cartItems[addedItemIndex].qty = qty;
    cart.cartItems[addedItemIndex].isBuy = isBuy;
    if (cart.cartItems[addedItemIndex].qty <= 0) {
        cart.cartItems.splice(addedItemIndex, 1);
        await cart.save();
        res.status(204);
        res.json({ message: "Sản phẩm đã bị xóa khỏi giỏ hàng!" });
    } else {
        const updatedCart = await cart.save();
        res.status(200);
        res.json(updatedCart.cartItems[addedItemIndex]);
    }
};

//User remove selected cart items.
const removeCart = async (req, res) => {
    const userId = req.user._id || null;
    const cart = await Cart.findOne({ user: userId });
    if (!cart) {
        res.status(404);
        throw new Error("Giỏ hàng không tồn tại!");
    }
    //productIds: [productId1, productId2, ...]
    const productIds = req.body.productIds;
    for (const productId of productIds) {
        let addedItemIndex = cart.cartItems.findIndex((item) => item.product.toString() == productId.toString());
        if (addedItemIndex != -1) {
            cart.cartItems.splice(addedItemIndex, 1);
        }
    }
    const updatedCart = await cart.save();
    const returnCart = await Cart.findById(updatedCart._id).populate("cartItems.product");
    res.status(200);
    res.json(returnCart);
};

const CartController = {
    userGetTheirCart,
    createNewCart,
    userAddToCart,
    updateExisedtCart,
    removeCart
};

export default CartController;
