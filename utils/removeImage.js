import cloudinary from "cloudinary";

const removeImage = async (public_id) => {
    cloudinary.v2.config({
        cloud_name: process.env.CLOUDINARY_NAME,
        api_key: process.env.CLOUDINARY_API_KEY,
        api_secret: process.env.CLOUDINARY_API_SECRET
    });
    try {
        const removeResponse = await cloudinary.v2.uploader.destroy(public_id);
        return removeResponse;
    } catch (err) {
        return err;
    }
};

export default removeImage;
