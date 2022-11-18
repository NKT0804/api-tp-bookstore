import express from "express";
import expressAsyncHandler from "express-async-handler";
import { admin, protect, optional } from "../middleware/AuthMiddleware.js";
import Category from "../models/CategoryModel.js";
import Product from "../models/ProductModel.js";
import { categoryQueryParams, commentQueryParams, validateConstants } from "../constants/searchConstants.js";
import createSlug from "../utils/createSlug.js";

//Admin create new category
const createCategory = async (req, res) => {
    const { name } = req.body;

    const isExist = await Category.findOne({ name: name, isDisabled: false });
    if (isExist) {
        res.status(400);
        throw new Error("Category name is already exist");
    }
    // Tạo slug
    let slug = createSlug(name);
    const isExistSlug = await Category.findOne({ slug: slug });
    if (isExistSlug) {
        slug = slug + "-" + Math.round(Math.random() * 10000).toString();
    }
    const newCategory = new Category({
        name,
        slug
    });
    if (!newCategory) {
        res.status(400);
        throw new Error("Invalid category data");
    }
    const createdCategory = await newCategory.save();
    if (createdCategory) {
        res.status(201).json({ categoryName: createdCategory.name });
    } else {
        res.status(400);
        throw new Error("Create category fail");
    }
};

//Get category
const getCategory = async (req, res) => {
    const dateOrderFilter = validateConstants(categoryQueryParams, "date", req.query.dateOrder);
    let statusFilter;
    if (!req.user || req.user.isAdmin == false) {
        statusFilter = validateConstants(categoryQueryParams, "status", "default");
    } else if (req.user.isAdmin) {
        statusFilter = validateConstants(categoryQueryParams, "status", req.query.status);
    }
    const categories = await Category.find({ ...statusFilter }).sort({ ...dateOrderFilter });
    res.status(200);
    res.json(categories);
};

//Admin udpate category
const updateCategory = async (req, res) => {
    const { name } = req.body;
    const categoryId = req.params.id || null;
    const category = await Category.findOne({ _id: categoryId, isDisabled: false });
    if (!category) {
        res.status(404);
        throw new Error("Category not Found");
    }
    // Tạo slug
    let slug = createSlug(name);
    const isExistSlug = await Category.findOne({ slug: slug });
    if (isExistSlug) {
        slug = slug + "-" + Math.round(Math.random() * 10000).toString();
    }
    category.name = name || category.name;
    category.slug = slug || category.slug;
    const updatedCategory = await category.save();
    res.json(updatedCategory);
};

//Admin disable category
const disableCategory = async (req, res) => {
    const category = await Category.findById(req.params.id);
    if (!category) {
        res.status(404);
        throw new Error("Category not found");
    }
    const product = await Product.findOne({ category: category._id });
    if (product) {
        res.status(400);
        throw new Error("Cannot disable category with products");
    }
    category.isDisabled = true;
    await category.save();
    res.status(200);
    res.json({ message: "Category has been disabled" });
};

//Admin restore disabled category
const restoreCategory = async (req, res) => {
    const categoryId = req.params.id || null;
    const category = await Category.findOne({ _id: categoryId, isDisabled: true });
    if (!category) {
        res.status(404);
        throw new Error("Category not found");
    }
    const duplicatedCategory = await Category.findOne({ name: category.name, isDisabled: false });
    if (duplicatedCategory) {
        res.status(400);
        throw new Error("Restore this category will result in duplicated category name");
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
        throw new Error("Category not found");
    }
    const product = await Product.findOne({ category: category._id });
    if (product) {
        res.status(400);
        throw new Error("Cannot disable category with products");
    }
    await category.remove();
    res.status(200);
    res.json({ message: "Category has been deleted" });
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
