import express from "express";
import expressAsyncHandler from "express-async-handler";
import { admin, protect, optional } from "../middleware/AuthMiddleware.js";
import Category from "../models/CategoryModel.js";
import Product from "../models/ProductModel.js";
import { categoryQueryParams, commentQueryParams, validateConstants } from "../constants/searchConstants.js";
import createSlug from "../utils/createSlug.js";

//Admin create new category
const createCategory = async (req, res) => {
    const { name, parent_category } = req.body;

    const isExist = await Category.findOne({ name: name, isDisabled: false });
    if (isExist) {
        res.status(400);
        throw new Error("Danh mục đã tồn tại!");
    }
    // Tạo slug
    let slug = createSlug(name);
    const isExistSlug = await Category.findOne({ slug: slug });
    if (isExistSlug) {
        slug = slug + "-" + Math.round(Math.random() * 10000).toString();
    }
    const newCategory = new Category({
        name,
        parent_category,
        slug
    });
    if (!newCategory) {
        res.status(400);
        throw new Error("Dữ liệu không hợp lệ!");
    }
    const createdCategory = await newCategory.save();
    if (createdCategory) {
        res.status(201).json({ success: true, categoryName: createdCategory.name });
    } else {
        res.status(400);
        throw new Error("Tạo danh mục không thành công!");
    }
};

//Get category
const getCategory = async (req, res) => {
    let statusFilter;
    if (!req.user || req.user.isAdmin == false) {
        statusFilter = validateConstants(categoryQueryParams, "status", "default");
    } else if (req.user.isAdmin) {
        statusFilter = validateConstants(categoryQueryParams, "status", req.query.status);
    }
    const categories = await Category.find({ ...statusFilter }).sort({ createdAt: "desc" });
    res.status(200);
    res.json(categories);
};

//Admin udpate category
const updateCategory = async (req, res) => {
    const { name, parent_category } = req.body;
    const categoryId = req.params.id || null;
    const category = await Category.findOne({ _id: categoryId, isDisabled: false });
    if (!category) {
        res.status(404);
        throw new Error("Danh mục không tồn tại!");
    }
    // Tạo slug
    let slug = createSlug(name);
    const isExistSlug = await Category.findOne({ slug: slug });
    if (isExistSlug) {
        slug = slug + "-" + Math.round(Math.random() * 10000).toString();
    }
    category.name = name || category.name;
    category.parent_category = parent_category || category.parent_category;
    category.slug = slug || category.slug;
    const updatedCategory = await category.save();
    res.json(updatedCategory);
};

//Admin disable category
const disableCategory = async (req, res) => {
    const category = await Category.findById(req.params.id);
    if (!category) {
        res.status(404);
        throw new Error("Danh mục không tồn tại!");
    }
    const product = await Product.findOne({ category: category._id });
    if (product) {
        res.status(400);
        throw new Error("Không thể vô hiệu hóa danh mục, vì còn có sản phẩm thuộc danh mục này!");
    }
    category.isDisabled = true;
    await category.save();
    res.status(200);
    res.json({ message: "Danh mục đã bị vô hiệu hóa!" });
};

//Admin restore disabled category
const restoreCategory = async (req, res) => {
    const categoryId = req.params.id || null;
    const category = await Category.findOne({ _id: categoryId, isDisabled: true });
    if (!category) {
        res.status(404);
        throw new Error("Danh mục không tồn tại!");
    }
    category.isDisabled = false;
    const updateCategory = await category.save();
    res.status(200);
    res.json(updateCategory);
};

//Admin delete category
const deleteCategory = async (req, res) => {
    const category = await Category.findById(req.params.id);
    if (!category) {
        res.status(404);
        throw new Error("Danh mục không tồn tại!");
    }
    const product = await Product.findOne({ category: category._id });
    if (product) {
        res.status(400);
        throw new Error("Không thể xóa danh mục, vì còn có sản phẩm thuộc danh mục này!");
    }
    await category.remove();
    res.status(200);
    res.json({ message: "Danh mục đã xóa thành công!" });
};

const CategoryController = {
    createCategory,
    getCategory,
    updateCategory,
    disableCategory,
    restoreCategory,
    deleteCategory
};

export default CategoryController;
