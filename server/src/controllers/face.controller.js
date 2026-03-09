import { detectionPipeline } from "../services/detectionPipeline.service.js";
import { telemetryService } from "../services/telemetry.service.js";
import { identifyFace } from "../services/recognition.service.js";
import { registerNewIdentity } from "../services/identity.service.js";

import asyncHandler from "../utils/asyncHandler.js";
import ApiError from "../utils/ApiError.js";
import ApiResponse from "../utils/ApiResponse.js";
import logger from "../loggers/winston.logger.js";


/**
 * Controller for Face Detection and Recognition endpoints.
 */

const getTelemetry = asyncHandler(async (req, res) => {
    const telemetry = await telemetryService.getMetrics();
    return res
        .status(200)
        .json(new ApiResponse(200, "Telemetry fetched", telemetry));
});

const detectFace = asyncHandler(async (req, res) => {
    if (!req.file) {
        throw new ApiError(400, "No image file provided");
    }

    const { buffer, originalname } = req.file;
    const isStatic = req.query.is_static === 'true';

    let modes = ['face'];
    if (Array.isArray(req.query.modes)) {
        modes = req.query.modes;
    } else if (typeof req.query.modes === 'string') {
        modes = req.query.modes.split(',');
    }

    const timestampMs = req.query.timestamp_ms;
    const unknownAlertsEnabled = req.query.unknownAlertsEnabled !== 'false';
    const suspiciousAlertsEnabled = req.query.suspiciousAlertsEnabled !== 'false';
    const { cameraId = "unknown" } = req.body;

    // Orchestrate through Central Pipeline
    const detectionResult = await detectionPipeline.process(
        buffer,
        originalname,
        isStatic,
        modes,
        timestampMs,
        { unknownAlertsEnabled, suspiciousAlertsEnabled, cameraId }
    );

    return res
        .status(200)
        .json(new ApiResponse(200, "Inference successful", detectionResult));
});

const registerFace = asyncHandler(async (req, res) => {
    const { name, userId, watchlistType, severity, dateOfBirth, gender } = req.body;
    if (!req.file || !name) {
        throw new ApiError(400, "Name and image are required for registration");
    }

    // Extraction embedding for registration (Single-shot flow)
    const { buffer, originalname } = req.file;
    const detectionResult = await detectionPipeline.process(buffer, originalname, true, ['face']);

    if (!detectionResult || !detectionResult.faceDetected || (detectionResult.totalFaces || 0) > 1) {
        throw new ApiError(400, "Single clear face required for registration");
    }

    const face = detectionResult.faces[0];
    // Re-calculating identity if needed, or just getting the embedding if we bypassed recognition in pipeline
    // However, the pipeline strips embeddings. For registration, we might need a raw worker call or a "keepEmbedding" flag.
    // Refactoring to call worker directly for registration to avoid pipeline stripping and logging.

    // Actually, for registration it's better to bypass the full forensic pipeline.
    const { workerService } = await import("../services/worker.service.js");
    const registrationInference = await workerService.detect(buffer, originalname, true, ['face']);
    const regResult = registrationInference.result;

    const embedding = regResult.faces[0]?.embedding;
    if (!embedding) {
        throw new ApiError(400, "Could not extract face embedding.");
    }

    const registrationData = {
        name,
        embedding,
        dateOfBirth,
        gender,
        userId: userId || null,
        watchlist: watchlistType ? {
            type: watchlistType,
            severity: severity || "Medium"
        } : null
    };

    const registeredFace = await registerNewIdentity(registrationData);

    return res
        .status(201)
        .json(new ApiResponse(201, "Face registered successfully", registeredFace));
});

const identifyFaceByEmbedding = asyncHandler(async (req, res) => {
    const { embedding } = req.body;
    if (!embedding || !Array.isArray(embedding)) {
        throw new ApiError(400, "Valid embedding array is required");
    }

    const identity = await identifyFace(embedding);

    return res
        .status(200)
        .json(new ApiResponse(200, "Identification successful", identity));
});

export { detectFace, registerFace, getTelemetry, identifyFaceByEmbedding };

