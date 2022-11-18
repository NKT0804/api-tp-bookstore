import express from "express";
import expressAsyncHandler from "express-async-handler";
import { admin, protect } from "../middleware/AuthMiddleware.js";
import generateToken from "../utils/generateToken.js";
import resize from "../utils/resizeImage.js";
import User from "../models/UserModel.js";
import Order from "../models/OrderModel.js";
import Cart from "../models/CartModel.js";
import Comment from "../models/CommentModel.js";
import { upload } from "../middleware/UploadMiddleware.js";
import path from "path";
import fs from "fs";
import mongoose from "mongoose";
import RefreshToken from "../models/RefreshTokenModel.js";
import { userQueryParams, validateConstants } from "../constants/searchConstants.js";
import uploadImage from "../utils/uploadImage.js";
import { sendMail } from "../utils/nodemailler.js";
import crypto from "crypto";
import schedule, { scheduleJob } from "node-schedule";

const __dirname = path.resolve();

//User login
const login = async (req, res) => {
    const { email, password } = req.body;
    const user = await User.findOne({ email: email, isDisabled: false });

    if (user && (await user.matchPassword(password))) {
        //check verify account
        if (!user.isVerified) {
            res.status(401);
            throw new Error("Tài khoản chưa được xác minh");
        }
        //delete old refresh token if existed
        await RefreshToken.deleteMany({ user: user._id });
        //create new refresh token
        const tokenValue = generateToken(
            user._id,
            process.env.REFRESH_TOKEN_SECRET,
            process.env.REFRESH_TOKEN_EXPIRESIN
        );
        const newRefreshToken = await new RefreshToken({
            user: user._id,
            tokenValue: tokenValue,
            refreshTokenItems: [tokenValue]
        }).save();
        res.status(200).json({
            _id: user._id,
            name: user.name,
            email: user.email,
            phone: user.phone,
            avatarUrl: user.avatarUrl || "./images/avatar/default.png",
            sex: user.sex,
            birthday: user.birthday,
            address: user.address,
            isAdmin: user.isAdmin,
            token: generateToken(user._id, process.env.ACCESS_TOKEN_SECRET, process.env.ACCESS_TOKEN_EXPIRESIN),
            refreshToken: newRefreshToken.tokenValue,
            createdAt: user.createdAt,
            isDisabled: user.isDisabled
        });
    } else {
        res.status(401);
        throw new Error("Invalid Email or Password");
    }
};

//Non-user register new account
const register = async (req, res, next) => {
    const { name, email, phone, password } = req.body;
    const isExistingUser = await User.findOne({
        email: email
    });
    if (isExistingUser) {
        res.status(409);
        throw new Error("Email of user already exists");
    }

    try {
        const newUser = await User.create({
            name,
            email,
            phone,
            password
        });
        if (!newUser) {
            res.status(400);
            throw new Error("Invalid user data");
        }

        const newCart = await Cart.create({
            user: newUser._id,
            cartItems: []
        });
        if (!newCart) {
            res.status(500);
            throw new Error("Failed to create user cart");
        }

        const emailVerificationToken = newUser.getEmailVerificationToken();
        await newUser.save();
        const url = `${process.env.WEB_CLIENT_URL}/register/verify/${newUser.email}/${emailVerificationToken}`;
        const html = `<a href="${url}" target="_blank"><button>Xác thực tài khoản</button></a>`;
        //start cron-job
        let scheduledJob = schedule.scheduleJob(
            Date.now() + process.env.EMAIL_VERIFY_EXPIED_TIME_IN_MINUTE * 60 * 1000,
            async () => {
                const deleteUser = await User.findOneAndDelete({ _id: newUser._id, isVerified: false });
                if (deleteUser) {
                    const deleteCart = await Cart.findOneAndDelete({ _id: newCart._id });
                }
                scheduledJob.cancel();
            }
        );
        //set up message options
        const messageOptions = {
            recipient: newUser.email,
            subject: "Xác thực tài khoản TP Bookstore",
            html: html
        };

        //send verify email
        await sendMail(messageOptions);
        res.status(200);
        res.json({ message: "Sending verification mail successfully" });
    } catch (error) {
        next(error);
    }
};

// verify email
const verifyEmail = async (req, res) => {
    const { verificationToken } = req.body || null;
    console.log(verificationToken);
    const hashedToken = crypto.createHash("sha256").update(verificationToken).digest("hex");
    console.log("================" + hashedToken);
    const user = await User.findOne({ emailVerificationToken: hashedToken });
    if (!user) {
        res.status(400);
        throw new Error("Email verification token is not valid");
    }
    user.isVerified = true;
    user.emailVerificationToken = null;
    await user.save();
    //create new refresh token
    const tokenValue = generateToken(user._id, process.env.REFRESH_TOKEN_SECRET, process.env.REFRESH_TOKEN_EXPIRESIN);
    const newRefreshToken = await new RefreshToken({
        user: user._id,
        tokenValue: tokenValue,
        refreshTokenItems: [tokenValue]
    }).save();
    res.status(200).json({
        _id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        avatarUrl: user.avatarUrl || "./images/avatar/default.png",
        sex: user.sex,
        birthday: user.birthday,
        address: user.address,
        isAdmin: user.isAdmin,
        token: generateToken(user._id, process.env.ACCESS_TOKEN_SECRET, process.env.ACCESS_TOKEN_EXPIRESIN),
        refreshToken: newRefreshToken.tokenValue,
        createdAt: user.createdAt,
        isDisabled: user.isDisabled
    });
};

//User get profile
const getProfile = async (req, res) => {
    res.status(200).json({
        _id: req.user._id,
        name: req.user.name,
        email: req.user.email,
        phone: req.user.phone,
        sex: req.user.sex,
        birthday: req.user.birthday,
        address: req.user.address,
        avatarUrl: req.user.avatarUrl || "./images/avatar/default.png",
        isAdmin: req.user.isAdmin,
        createAt: req.user.createAt,
        isDisabled: req.user.isDisabled
    });
};

//User update profile
const updateProfile = async (req, res) => {
    const user = req.user;
    user.name = req.body.name || user.name;
    user.email = req.body.email || user.email;
    user.phone = req.body.phone || user.phone;
    user.sex = req.body.sex || user.sex;
    user.birthday = req.body.birthday || user.birthday;
    user.address = req.body.address || user.address;

    const updatedUser = await user.save();
    res.status(200);
    res.json({
        _id: updatedUser._id,
        name: updatedUser.name,
        email: updatedUser.email,
        phone: updatedUser.phone,
        sex: updatedUser.sex,
        birthday: updatedUser.birthday,
        address: updatedUser.address,
        avatarUrl: updatedUser.avatarUrl || "./images/avatar/default.png",
        isAdmin: updatedUser.isAdmin,
        createAt: updatedUser.createAt,
        isDisabled: updatedUser.isDisabled,
        token: generateToken(updatedUser._id, process.env.ACCESS_TOKEN_SECRET, process.env.ACCESS_TOKEN_EXPIRESIN)
    });
};

// update password
const updatePassword = async (req, res) => {
    const userId = req.params.id;
    const { currentPassword, newPassword } = req.body;
    const user = await User.findById(userId);
    if (!user) {
        res.status(404);
        throw new Error("User not found");
    }
    if (!(await user.matchPassword(currentPassword))) {
        res.status(400);
        throw new Error("Password is not correct");
    }
    user.password = newPassword;

    const updatePassword = await user.save();
    if (updatePassword) {
        res.status(200);
        res.json({
            _id: updatePassword._id,
            statusUpdate: "success"
        });
    }
};

//  user Forgot password
const forgotPassword = async (req, res) => {
    const email = req.body.email || null;
    const user = await User.findOne({ email: email });
    if (!user) {
        res.status(404);
        throw new Error("Tài khoản không tồn tại");
    }
    //reset password
    const resetPasswordToken = user.getResetPasswordToken();
    await user.save();
    //send reset password email
    const url = `${process.env.WEB_CLIENT_URL}/resetPassword/${resetPasswordToken}`;
    const html = `<a href="${url}" target="_blank"><button>Đặt lại mật khẩu</button></a>`;
    //set up message options
    const messageOptions = {
        recipient: user.email,
        subject: "Đặt lại mật khẩu",
        html: html
    };
    //send verify email
    try {
        await sendMail(messageOptions);
        res.status(200);
        res.json("Gửi email thành công");
    } catch (error) {
        next(error);
    }
};

const resetPassword = async (req, res) => {
    const { resetPasswordToken, newPassword } = req.body || null;
    if (!newPassword) {
        res.status(400);
        throw new Error("Your new password is not valid");
    }
    const hashedToken = crypto.createHash("sha256").update(resetPasswordToken).digest("hex");
    const user = await User.findOne({
        resetPasswordToken: hashedToken
    });
    if (!user) {
        res.status(400);
        throw new Error("Reset password token is not valid");
    }
    if (user.resetPasswordTokenExpiryTime < Date.now()) {
        res.status(400);
        throw new Error("Yêu cầu đặt lại mật khẩu đã hết hạn");
    }

    user.password = newPassword;
    user.resetPasswordToken = null;
    user.resetPasswordTokenExpiryTime = null;
    await user.save();
    res.status(200);
    res.json("Your password has been reset");
};

//Admin get users
const getUsers = async (req, res) => {
    const dateOrderFilter = validateConstants(userQueryParams, "date", req.query.dateOrder);
    const statusFilter = validateConstants(userQueryParams, "status", req.query.status);
    const users = await User.find({ ...statusFilter }).sort({ ...dateOrderFilter });
    res.status(200);
    res.json(users);
};

//User upload avatar
const uploadAvatar = async (req, res) => {
    let user = await User.findOne({
        _id: req.user._id,
        isDisabled: false
    });
    if (user.isAdmin && mongoose.isValidObjectId(req.params.id)) {
        user = await User.findById(req.params.id);
    }
    if (!user) {
        res.status(400);
        throw new Error("User not Found");
    }
    //folder path to upload avatar
    const avatarPath = path.join(__dirname, "/public/images/avatar/");
    if (!req.file) {
        res.status(400);
        throw new Error("No provide an image");
    }

    //else
    const filename = await resize.save(avatarPath, req.file.buffer);
    // res.json(filename);

    const oldAvatar = user.avatarUrl;
    user.avatarUrl = `/images/avatar/${filename}`;
    const updateUser = await user.save();

    //delete old avatar
    if (oldAvatar != "/images/avatar/default.png") {
        fs.unlink(path.join(__dirname, "public", oldAvatar), (err) => {
            if (err) console.log("Delete old avatar have err:", err);
        });
    }

    res.status(200).json({
        _id: updateUser._id,
        name: updateUser.name,
        email: updateUser.email,
        phone: updateUser.phone,
        sex: updateUser.sex,
        birthday: updateUser.birthday,
        address: updateUser.address,
        avatarUrl: updateUser.avatarUrl,
        isAdmin: updateUser.isAdmin,
        token: generateToken(updateUser._id, process.env.ACCESS_TOKEN_SECRET, process.env.ACCESS_TOKEN_EXPIRESIN),
        isDisabled: updateUser.isDisabled,
        createAt: updateUser.createAt
    });
};

//Admin disable user
const disableUser = async (req, res) => {
    const userId = req.params.id || null;
    const user = await User.findOne({ _id: userId, isDisabled: false });
    if (!user) {
        res.status(404);
        throw new Error("User not found");
    }
    const order = await Order.findOne({ user: user._id, isDisabled: false });
    if (order) {
        res.status(400);
        throw new Error("Cannot disable user who had ordered");
    }
    res.status(200).json(disabledUser);
};

//Admin restore disabled user
const restoreUser = async (req, res) => {
    const userId = req.params.id || null;
    const user = await User.findOne({ _id: userId, isDisabled: true });
    if (!user) {
        res.status(404);
        throw new Error("User not found");
    }
    const restoredUser = await User.findOneAndUpdate({ _id: user._id }, { isDisabled: false }, { new: true });
    res.status(200).json(restoredUser);
};

//Admin delete user
const deleteUser = async (req, res, next) => {
    const user = await User.findById(req.params.id);
    if (!user) {
        res.status(404);
        throw new Error("User not found");
    }
    const order = await Order.findOne({ user: user._id, isDisabled: false });
    if (order) {
        res.status(400);
        throw new Error("Cannot delete user who had ordered");
    }
    const session = await mongoose.startSession();
    const transactionOptions = {
        readPreference: "primary",
        readConcern: { level: "local" },
        writeConcern: { w: "majority" }
    };
    try {
        await session.withTransaction(async () => {
            const deletedUser = await User.findOneAndDelete({
                _id: user._id
            }).session(session);
            if (!deletedUser) {
                await session.abortTransaction();
                throw new Error("Something wrong while deleting user");
            }
            //delete refresh tokens
            const deletedRefreshToken = await RefreshToken.findOneAndDelete({
                user: user._id
            }).session(session);
            if (!deletedRefreshToken) {
                await session.abortTransaction();
                throw new Error("Something wrong while deleting refresh token");
            }
            //delete cart
            const deletedCart = await Cart.findOneAndDelete({
                user: deletedUser._id
            }).session(session);
            if (!deletedCart) {
                await session.abortTransaction();
                throw new Error("Something wrong while deleting user cart");
            }
            //delete comments
            const deletedComments = await Comment.deleteMany({
                user: deletedUser._id
            }).session(session);
            res.status(200).json({ message: "User has been deleted" });
        }, transactionOptions);
    } catch (error) {
        next(error);
    } finally {
        await session.endSession();
    }
};

const UserController = {
    login,
    register,
    verifyEmail,
    getProfile,
    updateProfile,
    getUsers,
    uploadAvatar,
    disableUser,
    restoreUser,
    deleteUser,
    updatePassword,
    forgotPassword,
    resetPassword
};

export default UserController;
