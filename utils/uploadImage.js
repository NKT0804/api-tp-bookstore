import cloudinary from "cloudinary";

const uploadImage = async (fileStr, folder, public_id) => {
    cloudinary.v2.config({
        cloud_name: process.env.CLOUDINARY_NAME,
        api_key: process.env.CLOUDINARY_API_KEY,
        api_secret: process.env.CLOUDINARY_API_SECRET
    });
    let status = {
        url: ""
    };
    try {
        const uploadResponse = await cloudinary.v2.uploader.upload(fileStr, {
            folder: folder,
            public_id: public_id
        });
        status.url = uploadResponse.url;
    } catch (err) {
        status.err = err;
    }
    return status;
};

export default uploadImage;
