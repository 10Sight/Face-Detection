import mongoose from "mongoose";
import env from "../configs/env.config.js";
import logger from "../loggers/winston.logger.js";

const { mongoUrl } = env;

const connectDB = async () => {
    try {
        await mongoose.connect(mongoUrl);
        logger.info("MongoDB connected successfully");
    } catch (error) {
        logger.error("MongoDB connection failed:", error);
        process.exit(1);
    }
};

export default connectDB;