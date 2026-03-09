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
    workerUrl: process.env.WORKER_URL || "http://127.0.0.1:8000",
    whatsappInstanceId: process.env.WHATSAPP_INSTANCE_ID,
    whatsappToken: process.env.WHATSAPP_TOKEN,
    whatsappNotifyNumber: process.env.WHATSAPP_NOTIFY_NUMBER,
    suspiciousWindowMinutes: parseInt(process.env.SUSPICIOUS_WINDOW_MINUTES) || 10,
    suspiciousDetectionThreshold: parseInt(process.env.SUSPICIOUS_DETECTION_THRESHOLD) || 5,
};


export default env;