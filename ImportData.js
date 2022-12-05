import express from "express";
import expressAsyncHandler from "express-async-handler";
import User from "./models/UserModel.js";
import Cart from "./models/CartModel.js";
import Product from "./models/ProductModel.js";
import Category from "./models/CategoryModel.js";

import users from "./data/User.js";
// import carts from "./data/Cart.js";
import products from "./data/Products.js";
import Categories from "./data/category.js";

import createSlug from "./utils/createSlug.js";
import { cloudinaryUpload } from "./utils/cloudinary.js";

const ImportData = express.Router();

ImportData.post(
    "/user",
    expressAsyncHandler(async (req, res) => {
        // await User.deleteMany({});
        const importUser = await User.insertMany(users);
        res.send({ importUser });
    })
);
// ImportData.post(
//     "/cart",
//     expressAsyncHandler(async (req, res) => {
//         // await Cart.deleteMany({});
//         const importCart = await Cart.insertMany(carts);
//         res.send({ importCart });
//     })
// );
ImportData.post(
    "/category",
    expressAsyncHandler(async (req, res) => {
        // await Category.deleteMany({});
        const importCategory = await Category.insertMany(Categories);
        res.send({ importCategory });
    })
);

ImportData.post(
    "/product",
    expressAsyncHandler(async (req, res) => {
        // await Product.deleteMany({});
        products.forEach((item) => {
            item.slug = createSlug(item.name);
            cloudinaryUpload(item.image, "TPBookstore/products", item.slug);
            item.image =
                "https://res.cloudinary.com/nkt2001/image/upload/v1670220365/TPBookstore/products/" +
                item.slug +
                ".jpg";
        });

        const importProducts = await Product.insertMany(products);
        res.send({ importProducts });
    })
);
// ImportData.post(
//   "/category",
//   expressAsyncHandler(async (req, res) => {
//     await Category.deleteMany({});
//     const importCategory = await Category.insertMany(category);
//     res.send({ importCategory });
//   })
// );

export default ImportData;
