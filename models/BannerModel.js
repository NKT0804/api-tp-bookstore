import mongoose from "mongoose";

const bannerSchema = mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    index: {
        type: Number,
        // required: true
        default: 0
    },
    image: {
        type: String,
        require: true
    },
    linkTo: {
        type: String,
        default: ""
    },
    role: {
        type: String,
        default: "slide"
    },
    isDisabled: {
        type: Boolean,
        required: true,
        default: false
    }
});
const Banner = mongoose.model("Banner", bannerSchema);
export default Banner;
