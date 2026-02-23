import express from "express";
import cors from "cors";
import logger from "./loggers/winston.logger.js";
import faceRouter from "./routes/face.routes.js";
import analyticsRouter from "./routes/analytics.routes.js";
import identityRouter from "./routes/identity.routes.js";

const app = express();

app.use(cors({
    origin: process.env.CORS_ORIGIN || "http://localhost:5173",
    credentials: true,
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
// Request logging is handled by morgan in server.js

app.include_router = (router, prefix) => {
    app.use(prefix, router);
};

app.use("/api/v1/face", faceRouter);
app.use("/api/v1/analytics", analyticsRouter);
app.use("/api/v1/identity", identityRouter);

export default app;
