import mongoose from "mongoose";

const connectDatabase = async () => {
    try {
        const conn = await mongoose.connect(process.env.MONGO_URL, {});
        // const conn = await mongoose.connect("mongodb://localhost:27017/TPBookstore", {});
        console.log(`Successfully connected to Mongoose... ${conn.connection.host}`);
    } catch (error) {
        console.error(`Error when connect DB: ${error.message}`);
        process.exit(1);
    }
};

export default connectDatabase;
