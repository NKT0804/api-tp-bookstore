import mongoose from "mongoose";

const reviewSchema = mongoose.Schema(
    {
        rating: { type: Number, required: true },
        reviewContent: { type: String },
        user: { type: mongoose.Schema.Types.ObjectId, required: true, ref: "User" }
    },
    {
        timestamps: true
    }
);

const productSchema = mongoose.Schema(
    {
        name: { type: String, required: true },
        slug: { type: String, required: false, unique: true },
        author: { type: String, required: true },
        category: { type: mongoose.Schema.Types.ObjectId, ref: "Category", required: false },
        publisher: { type: String, required: true },
        publishingYear: { type: Number, required: true },
        supplier: { type: String, required: true },
        language: { type: String, required: true },
        numberOfPages: { type: Number, required: true },
        description: { type: String, default: "" },
        // description: { type: String, required: true, default: "" },
        price: { type: Number, required: true, default: 0 },
        priceSale: { type: Number, required: true, default: 0 },
        countInStock: { type: Number, required: true, default: 0 },
        image: { type: String },
        totalSales: { type: Number, required: true, default: 0 },
        reviews: [reviewSchema],
        rating: { type: Number, required: true, default: 0 },
        numReviews: { type: Number, required: true, default: 0 },
        numViews: { type: Number, required: true, default: 0 },
        isDisabled: { type: Boolean, required: true, default: false }
    },
    {
        timestamps: true
    }
);

const Product = mongoose.model("Product", productSchema);

export default Product;
