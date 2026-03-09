import { getAttendanceTrends, getTotalAuditLogs } from "../services/audit.service.js";
import { fetchAdvancedStats, searchByEmbedding, fetchReportData } from "../services/analytics.service.js";
import { trackingService } from "../services/tracking.service.js";
import { identifyFace } from "../services/recognition.service.js";
import { workerService } from "../services/worker.service.js";
import asyncHandler from "../utils/asyncHandler.js";
import ApiResponse from "../utils/ApiResponse.js";
import ApiError from "../utils/ApiError.js";
import logger from "../loggers/winston.logger.js";

/**
 * GET /api/v1/analytics/history
 */
export const getHistory = asyncHandler(async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;

    const history = await getAttendanceTrends(page, limit);
    const total = await getTotalAuditLogs();

    return res
        .status(200)
        .json(new ApiResponse(200, "History retrieved successfully", {
            history,
            pagination: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit)
            }
        }));
});

/**
 * GET /api/v1/analytics/timeline/:faceId
 * Returns movement timeline for a specific recognized person.
 */
export const getTimeline = asyncHandler(async (req, res) => {
    const { faceId } = req.params;
    const hours = parseInt(req.query.hours) || 24;

    if (!faceId) throw new ApiError(400, "Face ID is required for timeline retrieval");

    const timeline = await trackingService.getMovementTimeline(faceId, hours);

    return res
        .status(200)
        .json(new ApiResponse(200, "Movement timeline retrieved", timeline));
});

/**
 * GET /api/v1/analytics/stats
 */
export const getQuickStats = asyncHandler(async (req, res) => {
    const stats = await fetchAdvancedStats();

    return res
        .status(200)
        .json(new ApiResponse(200, "Advanced intelligence retrieved", stats));
});

/**
 * POST /api/v1/analytics/forensic-search
 * Searches for sightings using a provided image (extracting embedding first).
 */
export const forensicSearch = asyncHandler(async (req, res) => {
    if (!req.file) throw new ApiError(400, "Forensic search requires a suspect image");

    logger.info(`[Analytics] Starting forensic search for file: ${req.file.originalname}`);

    // 1. Extract embedding from the uploaded sus image using the worker
    const detectionPayload = await workerService.detect(req.file.buffer, req.file.originalname, true, ['face']);
    const detectionResult = detectionPayload.result;

    if (!detectionResult.faceDetected) {
        throw new ApiError(400, "No face detected in suspect image");
    }

    const targetEmbedding = detectionResult.faces[0].embedding;

    // 2. Search historical logs
    const matches = await searchByEmbedding(targetEmbedding);

    logger.info(`[Analytics] Forensic search found ${matches.length} historical matches.`);

    return res
        .status(200)
        .json(new ApiResponse(200, "Forensic search completed", matches));
});

/**
 * GET /api/v1/analytics/report
 */
export const getReport = asyncHandler(async (req, res) => {
    const { start, end } = req.query;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;

    if (!start || !end) throw new ApiError(400, "Date range required for reporting");

    const data = await fetchReportData(start, end, page, limit);

    return res
        .status(200)
        .json(new ApiResponse(200, "Report data retrieved", data));
});

