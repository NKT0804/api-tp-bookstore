import express from "express";
import expressAsyncHandler from "express-async-handler";
import Product from "../models/ProductModel.js";
import Category from "../models/CategoryModel.js";
import Order from "../models/OrderModel.js";
import Cart from "../models/CartModel.js";
import Comment from "../models/CommentModel.js";
import createSlug from "../utils/createSlug.js";
import { cloudinaryRemove, cloudinaryUpload } from "../utils/cloudinary.js";
import { productQueryParams, validateConstants } from "../constants/searchConstants.js";

//Admin create new product
const createProduct = async (req, res) => {
    const {
        name,
        price,
        priceSale,
        description,
        author,
        image,
        countInStock,
        category,
        publisher,
        supplier,
        publishingYear,
        language,
        numberOfPages
    } = req.body;
    const isExist = await Product.findOne({ name: name });
    if (isExist) {
        res.status(400);
        throw new Error("Sản phẩm đã tồn tại!");
    }
    // Tạo slug
    let slug = createSlug(name);
    const isExistSlug = await Product.findOne({ slug: slug });
    if (isExistSlug) {
        slug = slug + "-" + Math.round(Math.random() * 10000).toString();
    }
    // Upload image
    const urlImage = await cloudinaryUpload(JSON.parse(image), "TPBookstore/products", slug);
    if (!urlImage.secure_url) {
        res.status(400);
        throw new Error(urlImage.err);
    }
    const newProduct = new Product({
        name,
        slug,
        price,
        priceSale,
        author,
        description,
        image: urlImage.secure_url,
        countInStock,
        category,
        publisher,
        supplier,
        publishingYear,
        language,
        numberOfPages
    });
    if (!newProduct) {
        res.status(400);
        throw new Error("Dữ liệu không hợp lệ!");
    }
    const createdProduct = await newProduct.save();
    res.status(201).json(createdProduct);
};

// Non-user, user and admin filter product
const getProducts = async (req, res) => {
    const limit = Number(req.query.limit) || 12;
    let page = Number(req.query.pageNumber) || 1;
    const rating = Number(req.query.rating) || 0;
    const maxPrice = Number(req.query.maxPrice) || 0;
    const minPrice = Number(req.query.minPrice) || 0;
    const Sort = validateConstants(productQueryParams, "sort", req.query.sortBy);
    const sortBy = { ...Sort };
    let statusFilter;
    if (!req.user || req.user.isAdmin == false) {
        statusFilter = validateConstants(productQueryParams, "status", "default");
    } else if (req.user.isAdmin) {
        statusFilter = validateConstants(productQueryParams, "status", req.query.status);
    }

    const keyword = req.query.keyword
        ? {
              name: {
                  $regex: req.query.keyword,
                  $options: "i"
              }
          }
        : {}; // TODO: return cannot find product

    //Check if category existed
    let categoryName = req.query.category;
    if (!req.query.category) {
        categoryName = "All";
    }
    let categoryIds;
    if (categoryName == "All") {
        categoryIds = await Category.find({ isDisabled: false }).select({ _id: 1 });
    } else {
        categoryIds = await Category.find({ slug: categoryName, isDisabled: false }).select({ _id: 1 });
    }
    //(categoryFilter);
    const categoryFilter = categoryIds ? { category: categoryIds } : {};
    //rating filter
    const ratingFilter = rating
        ? {
              rating: { $gte: rating }
          }
        : {};
    //price filter
    const priceFilter =
        maxPrice > 0
            ? {
                  priceSale: {
                      $gte: minPrice,
                      $lte: maxPrice
                  }
              }
            : {};
    const count = await Product.countDocuments({
        ...keyword,
        ...categoryFilter,
        ...ratingFilter,
        ...priceFilter,
        ...statusFilter
    });
    //Check if product match keyword
    if (count == 0) {
        res.status(204);
        throw new Error("Không có sản phẩm nào!");
    }
    const pages = Math.ceil(count / limit);
    page = page <= pages ? page : 1;
    //else
    const products = await Product.find({
        ...keyword,
        ...categoryFilter,
        ...ratingFilter,
        ...priceFilter,
        ...statusFilter
    })
        .limit(limit)
        .skip(limit * (page - 1))
        .sort(sortBy)
        .populate("category");
    res.status(200).json({ products, page, pages, total: count });
};

// //Admin get all disabled products
// productRouter.get(
//     "/disabled",
//     protect,
//     admin,
//     expressAsyncHandler(async (req, res) => {
//         const products = await Product.find({ isDisabled: true });
//         if (products.length != 0) {
//             res.status(200);
//             res.json(products);
//         } else {
//             res.status(204);
//             res.json({ message: "No products are disabled" });
//         }
//     })
// );

//Non-user, user get product by slug
const getDetailProductBySlug = async (req, res) => {
    const productSlug = req.params.slug || null;
    const product = await Product.findOne({ slug: productSlug }).populate("reviews.user", "name avatarUrl");
    if (!product) {
        res.status(404);
        throw new Error("Sản phẩm không tồn tại!");
    }

    // increment Product View counter
    product.numViews = product.numViews + 1;
    await product.save();

    res.status(200);
    res.json(product);
};

// Non-user, user, admin get detail product by id
const getDetailProductById = async (req, res) => {
    const productId = req.params.id || null;
    const product = await Product.findOne({ _id: productId, isDisabled: false }).populate(
        "reviews.user",
        "name avatarUrl"
    );
    if (!product) {
        res.status(404);
        throw new Error("Sản phẩm không tồn tại!");
    }

    // increment Product View counter
    product.numViews = product.numViews + 1;
    await product.save();

    res.status(200);
    res.json(product);
};

//Non-user, user, admin get product comments
const getProductComments = async (req, res) => {
    const product = await Product.findOne({ _id: req.params.id, isDisabled: false });
    if (!product) {
        res.status(404);
        throw new Error("Sản phẩm không tồn tại!");
    }
    let comments = await Comment.find({ product: product._id, isDisabled: false }).populate("user replies.user");
    res.status(200);
    res.json(comments);
};

//User review a product
const reviewProduct = async (req, res, next) => {
    const { rating, reviewContent } = req.body;
    const productId = req.params.id || null;
    const product = await Product.findOne({ _id: productId, isDisabled: false });
    if (!product) {
        res.status(404);
        throw new Error("Sản phẩm không tồn tại!");
    }
    const orders = await Order.find({ user: req.user._id, "orderItems.product": product._id, isDisabled: false });
    const totalOrdered = orders.length;
    const totalReviewed = product.reviews.reduce((previousValue, currentReview) => {
        if (currentReview.user.toString() === req.user._id.toString()) {
            previousValue++;
        }
        return previousValue;
    }, 0);
    if (totalOrdered <= 0) {
        res.status(400);
        throw new Error("Bạn cần mua hàng để có thể đánh giá sản phẩm!");
    }
    if (totalOrdered <= totalReviewed) {
        res.status(400);
        throw new Error("Bạn đã đánh giá sản phẩm này rồi!");
    }
    //.
    //else
    const review = {
        name: req.user.name,
        rating: Number(rating),
        reviewContent: reviewContent,
        user: req.user._id
    };
    product.reviews.push(review);
    product.numReviews = product.reviews.length;
    product.rating =
        product.reviews.reduce((previousValue, curentReview) => curentReview.rating + previousValue, 0) /
        product.numReviews;
    await product.save();
    res.status(201);
    res.json({ message: "Đánh giá sản phẩm thành công!" });
};

//Admin update product
const updateProduct = async (req, res) => {
    const {
        name,
        price,
        priceSale,
        description,
        author,
        image,
        countInStock,
        category,
        publisher,
        supplier,
        publishingYear,
        language,
        numberOfPages
    } = req.body;
    const publicId = image.split(".").pop();
    const productId = req.params.id || null;
    const product = await Product.findOne({ _id: productId, isDisabled: false });
    if (!product) {
        res.status(404);
        throw new Error("Sản phẩm không tồn tại!");
    }
    let slug = product.slug;
    // Tạo slug
    if (name != product.name) {
        slug = createSlug(name);
    }
    // Upload image
    let urlImage = image;
    if (image != product.image) {
        const uploadResult = await cloudinaryUpload(JSON.parse(image), "TPBookstore/products", slug);
        if (!uploadResult.secure_url) {
            res.status(400);
            throw new Error(uploadResult.err);
        }
        urlImage = uploadResult.secure_url;
    }

    product.name = name || product.name;
    product.slug = slug || product.slug;
    product.price = price || product.price;
    product.priceSale = priceSale || product.priceSale;
    product.description = description || product.description;
    product.author = author || product.author;
    product.image = urlImage || product.image;
    product.countInStock = countInStock || product.countInStock;
    product.publisher = publisher || product.publisher;
    product.supplier = supplier || product.supplier;
    product.publishingYear = publishingYear || product.publishingYear;
    product.language = language || product.language;
    product.numberOfPages = numberOfPages || product.numberOfPages;
    let existedCategory;
    if (category != null) {
        existedCategory = await Category.findOne({ _id: category, isDisabled: false });
        if (!existedCategory) {
            res.status(404);
            throw new Error("Danh mục không tồn tại!");
        }
        product.category = existedCategory._id;
    }
    const upadatedProduct = await product.save();
    res.json(upadatedProduct);
};

//Admin disable product
//Note: check if product is added to users cart
const disableProduct = async (req, res) => {
    const product = await Product.findById(req.params.id);
    if (!product) {
        res.status(404);
        throw new Error("Sản phẩm không tồn tại!");
    }
    const order = await Order.findOne({ "orderItems.product": product._id, isDisabled: false });
    if (order) {
        res.status(400);
        throw new Error("Không thể vô hiệu hóa sản phẩm, vì sản phẩm đang có trong 1 số đơn hàng!");
    }

    const disabledProduct = await Product.findOneAndUpdate({ _id: product._id }, { isDisabled: true });
    res.status(200);
    res.json(disabledProduct);
};

//Admin restore disabled product
const restoreProduct = async (req, res) => {
    const productId = req.params.id || null;
    const product = await Product.findOne({ _id: productId, isDisabled: true });
    if (!product) {
        res.status(404);
        throw new Error("Sản phẩm không tồn tại!");
    }
    product.isDisabled = false;
    const restoredProduct = await product.save();

    res.status(200);
    res.json(restoredProduct);
};

//Admin delete product
const deleteProduct = async (req, res) => {
    const product = await Product.findById(req.params.id);
    if (!product) {
        res.status(404);
        throw new Error("Sản phẩm không tồn tại!");
    }
    const order = await Order.findOne({ "orderItems.product": product._id, isDisabled: false });
    if (order) {
        res.status(400);
        throw new Error("Không thể xóa sản phẩm, vì sản phẩm đang có trong 1 số đơn hàng!");
    }
    const cart = await Cart.findOne({ "cartItems.product": product._id });
    if (cart) {
        res.status(400);
        throw new Error("Không thể xóa sản phẩm, vì sản phẩm đang thuộc giỏ hàng của người dùng!");
    }
    await cloudinaryRemove(product.slug);
    await product.remove();
    //delete comments
    await Comment.deleteMany({ product: product._id });
    res.status(200);
    res.json({ message: "Sàn phẩm đã được xóa!" });
};

const ProductController = {
    createProduct,
    getProducts,
    getDetailProductBySlug,
    getDetailProductById,
    getProductComments,
    reviewProduct,
    updateProduct,
    disableProduct,
    restoreProduct,
    deleteProduct
};

export default ProductController;
