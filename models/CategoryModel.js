import mongoose from "mongoose";

const CategorySchema = mongoose.Schema(
    {
        name: {
            type: String,
            required: true
        },
        slug: {
            type: String,
            required: false,
            default: ""
        },
        parent_category: {
            type: String,
            required: true,
            default: ""
        },
        isDisabled: {
            type: Boolean,
            required: true,
            default: false
        }
    },
    {
        timestamps: true
    }
);

const Category = mongoose.model("Category", CategorySchema);
export default Category;
