import express from "express";
import expressAsyncHandler from "express-async-handler";
import { admin, protect } from "../middleware/AuthMiddleware.js";
import generateToken from "../utils/generateToken.js";
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
import { cloudinaryRemove, cloudinaryUpload } from "../utils/cloudinary.js";
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
            throw new Error("Tài khoản chưa được xác minh!");
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
        throw new Error("Email hoặc mật khẩu sai!");
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
        throw new Error("Email đã tồn tại!");
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
            throw new Error("Dữ liệu không hợp lệ!");
        }

        const newCart = await Cart.create({
            user: newUser._id,
            cartItems: []
        });
        if (!newCart) {
            res.status(500);
            throw new Error("Tạo giỏ hàng không thành công!");
        }

        const emailVerificationToken = newUser.getEmailVerificationToken();
        await newUser.save();
        const url = `${process.env.WEB_CLIENT_URL}/register/verify/${newUser.email}/${emailVerificationToken}`;
        const html = `
        <div style = "margin-left : 23%" >
            <img src="https://res.cloudinary.com/nkt2001/image/upload/v1664988644/logo/logo_vd616y.png?fbclid=IwAR0hgGY9-hFxr30G2dacxHMczMGUJ6SLjddCZHy8tkqEd4FCmNL--ckVPX8"
            style ="height: 100px">
            <div style = "padding: 20px;
            border: #e1e4e8 solid 1px;
            width: 500px; font-size : 17px">
            <span style = "font-size: 24px; font-weight: 600; margin-left: 29%">Xác thực tài khoản</span>
            <p>Để kích hoạt tài khoản TPBookstore của bạn. Vui lòng xác thực tài khoản email của bạn :</p>
            <a href="${url}" target="_blank"  style = "text-decoration: none; margin-left : 27%">
            <button style = "background-color: #4ac4fa;
            padding: 18px 30px;
            border: none;
            border-radius: 8px;
            font-size: 20px">
                Xác thực tài khoản
            </button>
            </a>
            <p>Trân trọng,</p>
            <p>TPBookStore</p>
            </div>
        </div>`;
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
        res.json({ message: "Đăng ký thành công, đã gửi yêu cầu xác minh tài khoản!" });
    } catch (error) {
        next(error);
    }
};

// verify email
const verifyEmail = async (req, res) => {
    const { verificationToken } = req.body || null;
    const hashedToken = crypto.createHash("sha256").update(verificationToken).digest("hex");
    const user = await User.findOne({ emailVerificationToken: hashedToken });
    if (!user) {
        res.status(400);
        throw new Error("Mã thông báo xác nhận email không tồn tại hoặc đã hết hạn!");
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

const getProfileByAdmin = async (req, res) => {
    const userId = req.params.id;
    const user = await User.findById(userId).select("-password");
    if (!user) {
        res.status(404);
        throw new Error("Tài khoản không tồn tại");
    }
    res.status(200).json({ success: true, user });
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
        throw new Error("Tài khoản không tồn tại!");
    }
    if (!(await user.matchPassword(currentPassword))) {
        res.status(400);
        throw new Error("Mật khẩu hiện tại không đúng!");
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
    const html = `
    <img src="https://res.cloudinary.com/nkt2001/image/upload/v1664988644/logo/logo_vd616y.png?fbclid=IwAR0hgGY9-hFxr30G2dacxHMczMGUJ6SLjddCZHy8tkqEd4FCmNL--ckVPX8"
    style ="height: 100px; margin-left: 29.5%; margin-bottom: -20px">
    <div style = "margin-left: 22.5%; font-size: 17px">
        <span style = "font-size: 24px; font-weight: 600; margin-left: 35px">
            Thiết lập lại mật khẩu đăng nhập TBBookSTore
        </span>
        <div style = "width: 514px;
            padding: 20px;
            margin: 28px;
            border: #e1e4e8 solid 1px;
            border-radius: 8px">
            <p style = "margin-left : 33%;
            font-size: 20px;
            font-weight: 600;">
            Đặt lại mật khẩu
            </p>
            <p>Xin chào ${user.name}</p>
            <p>Chúng tôi nhận được yêu cầu thiết lập lại mật khẩu cho tài khoản TPBookSTore của bạn. Vui lòng sử dụng nút sau để đặt lại  mật khẩu của bạn </p>
            <a href="${url}" target="_blank" 
                style = "text-decoration: none; margin-left: 32.5%;">
            <button style = "background-color: #4ac4fa;
                padding: 18px 30px;
                border: none;
                border-radius: 8px;
                font-size: 17px">
                    Đặt lại mật khẩu
            </button>
            </a>
            <p>Nếu bạn không sử dụng liên kết này trong vòng 1 giờ, liên kết này sẽ hết hạn.</p>
            <p>Trân trọng</p>
            <p>TPBookStore</p>
        </div>
    </div>
    `;
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
        throw new Error("Mật khẩu mới không hợp lệ!");
    }
    const hashedToken = crypto.createHash("sha256").update(resetPasswordToken).digest("hex");
    const user = await User.findOne({
        resetPasswordToken: hashedToken
    });
    if (!user) {
        res.status(400);
        throw new Error("Mã thông báo đặt lại mật khẩu không tồn tại!");
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
    res.json("Mật khẩu của bạn đã được đặt lại!");
};

//Admin get users
const getUsers = async (req, res) => {
    const limit = Number(req.query.limit) || 8;
    let page = Number(req.query.page) || 1;
    const statusFilter = validateConstants(userQueryParams, "status", req.query.status);
    const keyword = req.query.keyword
        ? {
              name: {
                  $regex: req.query.keyword,
                  $options: "i"
              }
          }
        : {};

    const count = await User.countDocuments({ ...keyword, ...statusFilter });
    if (count == 0) {
        res.status(204);
        throw new Error("Không có tài khoản nào!");
    }
    const pages = Math.ceil(count / limit);
    page = page <= pages ? page : 1;

    const users = await User.find({ ...keyword, ...statusFilter })
        .limit(limit)
        .skip(limit * (page - 1))
        .sort({ createdAt: "desc" });
    res.status(200).json({ users, page, pages, total: count });
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
        throw new Error("Tài khoản không tồn tại!");
    }
    const urlImage = await cloudinaryUpload(req.body.file, "TPBookstore/users", user._id);
    if (!urlImage.secure_url) {
        res.status(400);
        throw new Error(urlImage.err);
    }

    user.avatarUrl = urlImage.secure_url;
    const updateUser = await user.save();

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
        throw new Error("Tài khoản không tồn tại!");
    }
    const order = await Order.findOne({ user: user._id, isDisabled: false });
    if (order) {
        res.status(400);
        throw new Error("Không thể vô hiệu hóa tài khoản này!");
    }
    res.status(200).json(disabledUser);
};

//Admin restore disabled user
const restoreUser = async (req, res) => {
    const userId = req.params.id || null;
    const user = await User.findOne({ _id: userId, isDisabled: true });
    if (!user) {
        res.status(404);
        throw new Error("Tài khoản không tồn tại!");
    }
    const restoredUser = await User.findOneAndUpdate({ _id: user._id }, { isDisabled: false }, { new: true });
    res.status(200).json(restoredUser);
};

//Admin delete user
const deleteUser = async (req, res, next) => {
    const user = await User.findById(req.params.id);
    if (!user) {
        res.status(404);
        throw new Error("Tài khoản không tồn tại!");
    }
    const order = await Order.findOne({ user: user._id, isDisabled: false });
    if (order) {
        res.status(400);
        throw new Error("Không thể xóa tài khoản này!");
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
                throw new Error("Xóa tài khoản không thành công!");
            }
            const deletedAvatar = await cloudinaryRemove(user._id).session(session);
            if (!deletedAvatar) {
                await session.abortTransaction();
                throw new Error("Xóa avatar tài khoản không thành công!");
            }
            //delete refresh tokens
            const deletedRefreshToken = await RefreshToken.findOneAndDelete({
                user: user._id
            }).session(session);
            if (!deletedRefreshToken) {
                await session.abortTransaction();
                throw new Error("Xóa refresh token không thành công!");
            }
            //delete cart
            const deletedCart = await Cart.findOneAndDelete({
                user: deletedUser._id
            }).session(session);
            if (!deletedCart) {
                await session.abortTransaction();
                throw new Error("Xóa giỏ hàng không thành công!");
            }
            //delete comments
            const deletedComments = await Comment.deleteMany({
                user: deletedUser._id
            }).session(session);
            res.status(200).json({ message: "Tài khoản đã xóa thành công!" });
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
    getProfileByAdmin,
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
