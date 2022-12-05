import { v2 as cloudinary } from "cloudinary";

const cloudinaryUpload = async (fileStr, folder, public_id) => {
    cloudinary.config({
        cloud_name: process.env.CLOUDINARY_NAME,
        api_key: process.env.CLOUDINARY_API_KEY,
        api_secret: process.env.CLOUDINARY_API_SECRET
    });
    let status = {
        secure_url: ""
    };
    try {
        const uploadResponse = await cloudinary.uploader.upload(fileStr, {
            folder: folder,
            public_id: public_id
        });
        status.secure_url = uploadResponse.secure_url;
    } catch (err) {
        status.err = err;
    }
    return status;
};
const cloudinaryRemove = async (publicId) => {
    cloudinary.config({
        cloud_name: process.env.CLOUDINARY_NAME,
        api_key: process.env.CLOUDINARY_API_KEY,
        api_secret: process.env.CLOUDINARY_API_SECRET
    });
    const result = await cloudinary.uploader.destroy(publicId);
    return result;
};
export { cloudinaryUpload, cloudinaryRemove };
