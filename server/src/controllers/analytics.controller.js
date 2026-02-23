import { getAttendanceTrends, getTotalAuditLogs } from "../services/audit.service.js";
import { fetchAdvancedStats, searchByEmbedding, fetchReportData } from "../services/analytics.service.js";
import { identifyFace } from "../services/recognition.service.js";
import { detectFaceInWorker } from "../services/faceDetection.service.js";
import asyncHandler from "../utils/asyncHandler.js";
import ApiResponse from "../utils/ApiResponse.js";
import ApiError from "../utils/ApiError.js";

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

    // 1. Extract embedding from the uploaded sus image using the worker
    const detectionPayload = await detectFaceInWorker(req.file.buffer, req.file.originalname, true);
    if (!detectionPayload.result.faceDetected) throw new ApiError(400, "No face detected in suspect image");

    const targetEmbedding = detectionPayload.result.faces[0].embedding;

    // 2. Search historical logs
    const matches = await searchByEmbedding(targetEmbedding);

    return res
        .status(200)
        .json(new ApiResponse(200, "Forensic search completed", matches));
});

/**
 * GET /api/v1/analytics/report
 * Exports intelligence data for a given range.
 */
export const getReport = asyncHandler(async (req, res) => {
    const { start, end, format = "json" } = req.query;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;

    if (!start || !end) throw new ApiError(400, "Date range required for reporting");

    const data = await fetchReportData(start, end, page, limit);

    return res
        .status(200)
        .json(new ApiResponse(200, "Report data retrieved", data));
});
