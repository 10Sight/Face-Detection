import dotenv from "dotenv";
dotenv.config();

const env = {
    port: process.env.PORT || 3000,
    mongoUrl: process.env.MONGO_URL || "mongodb://localhost:27017/face-detection",
    jwtSecret: process.env.JWT_SECRET,
    aesKey: process.env.AES_KEY,
    aesSecret: process.env.AES_SECRET || process.env.AES_KEY,
    nodeEnv: process.env.NODE_ENV || "development",
    serverUrl: process.env.SERVER_URL || "http://localhost",
    workerUrl: process.env.WORKER_URL || "http://localhost:8000",
};

export default env;