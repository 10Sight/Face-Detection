import express from "express";
import cors from "cors";
import logger from "./loggers/winston.logger.js";
import faceRouter from "./routes/face.routes.js";
import analyticsRouter from "./routes/analytics.routes.js";
import identityRouter from "./routes/identity.routes.js";
import objectRouter from "./routes/object.route.js";
import alertRouter from "./routes/alert.route.js";
import zoneRouter from "./routes/zone.routes.js";

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
app.use("/api/v1/object", objectRouter);
app.use("/api/v1/alert", alertRouter);
app.use("/api/v1/zones", zoneRouter);

// Global Error Handler
app.use((err, req, res, next) => {
    const status = err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    logger.error(`[Error Handler] ${message}`, {
        status,
        stack: err.stack,
        errors: err.errors
    });

    res.status(status).json({
        success: false,
        message,
        errors: err.errors || [message],
        stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
});

export default app;
