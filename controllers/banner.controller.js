import express from "express";
import expressAsyncHandler from "express-async-handler";
import { admin, protect, optional } from "../middleware/AuthMiddleware.js";
import Banner from "../models/BannerModel.js";
const createBanner = async (req, res) => {
    const { name, index, image, linkTo, role } = req.body;

    const isExist = await Banner.findOne({ name: name, isDisabled: false });
    if (isExist) {
        res.status(400);
        throw new Error("Tên banner đã tồn tại!");
    }
    const newBanner = new Banner({
        name,
        index,
        image,
        linkTo,
        role
    });
    if (!newBanner) {
        res.status(400);
        throw new Error("Dữ liệu không hợp lệ!");
    }
    const createdBanner = await newBanner.save();
    res.status(201).json(createdBanner);
};

const getBanner = async (req, res) => {
    const { role = "banner" } = req.query;
    const banner = await Banner.find({ role: role }).sort({ _id: 1 });
    res.status(200).json(banner);
};

const updateBanner = async (req, res) => {
    const { name, index, image, linkTo, role } = req.body;
    const bannerId = req.params.id || null;
    const banner = await Banner.findOne({ _id: bannerId, isDisabled: false });
    if (!banner) {
        res.status(404);
        throw new Error("Banner không tồn tại!");
    }

    banner.name = name || banner.name;
    banner.index = index || banner.index;
    banner.image = image || banner.image;
    banner.linkTo = linkTo || banner.linkTo;
    banner.role = role || banner.role;
    const updatedBanner = await banner.save();
    res.json(updatedBanner);
};

const disableBanner = async (req, res) => {
    const banner = await Banner.findById(req.params.id);
    if (!banner) {
        res.status(404);
        throw new Error("Banner không tồn tại!");
    }

    banner.isDisabled = true;
    await banner.save();
    res.status(200).json({ message: "Banner đã vô hiệu hóa thành công!" });
};

const restoreBanner = async (req, res) => {
    const bannerId = req.params.id || null;
    const banner = await banner.findOne({ _id: bannerId, isDisabled: true });
    if (!banner) {
        res.status(404);
        throw new Error("Banner không tồn tại!");
    }
    banner.isDisabled = false;
    const updateBanner = await banner.save();
    res.status(200).json(updateBanner);
};

const deleteBanner = async (req, res) => {
    const banner = await Banner.findById(req.params.id);
    if (!banner) {
        res.status(404);
        throw new Error("Banner không tồn tại!");
    }
    await banner.remove();
    res.status(200).json({ message: "Banner đã xóa thành công!" });
};

const BannerController = {
    createBanner,
    getBanner,
    updateBanner,
    disableBanner,
    restoreBanner,
    deleteBanner
};

export default BannerController;