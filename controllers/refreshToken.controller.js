import express from "express";
import expressAsyncHandler from "express-async-handler";
import { admin, protect } from "../middleware/AuthMiddleware.js";
import generateToken from "../utils/generateToken.js";
import RefreshToken from "../models/RefreshTokenModel.js";
import User from "../models/UserModel.js";

//get all refresh tokens (test-only api)
const getAllRefreshTokenForTest = async (req, res) => {
    const refreshTokens = await RefreshToken.find();
    res.status(200);
    res.json(refreshTokens);
};

//user create new refresh token (test-only api)
const createNewRefreshTokenForTest = async (req, res) => {
    const refreshToken = new RefreshToken({
        user: req.user._id,
        tokenValue: "this is parent refresh token"
    });
    await refreshToken.save();
    res.status(201);
    res.json(refreshToken);
};

//User refresh access token
const refreshAccessToken = async (req, res) => {
    const { refreshToken } = req.body || null;
    const parentRefreshToken = await RefreshToken.findOne({ refreshTokenItems: refreshToken });
    if (!parentRefreshToken) {
        res.status(404);
        throw new Error("Refresh token not found");
    }
    if (parentRefreshToken.refreshTokenItems.indexOf(refreshToken) != parentRefreshToken.refreshTokenItems.length - 1) {
        await RefreshToken.deleteOne({ _id: parentRefreshToken._id });
        res.status(401);
        throw new Error("Refresh token is expired, please login again");
    }
    const newAccessToken = generateToken(
        parentRefreshToken.user,
        process.env.ACCESS_TOKEN_SECRET,
        process.env.ACCESS_TOKEN_EXPIRESIN
    );
    const newRefreshToken = generateToken(
        parentRefreshToken.user,
        process.env.REFRESH_TOKEN_SECRET,
        process.env.REFRESH_TOKEN_EXPIRESIN
    );
    parentRefreshToken.refreshTokenItems.push(newRefreshToken);
    await parentRefreshToken.save();
    res.status(200);
    res.json({
        success: true,
        token: newAccessToken,
        refreshToken: newRefreshToken
    });
};

const RefreshTokenController = {
    getAllRefreshTokenForTest,
    createNewRefreshTokenForTest,
    refreshAccessToken
};

export default RefreshTokenController;
