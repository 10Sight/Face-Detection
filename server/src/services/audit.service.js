import { AuditLog } from "../models/audit.model.js";

/**
 * Persists a sighting to the Audit Log.
 * Optimized for performance: High-FPS streams should be throttled at the app level, 
 * but this service ensures data is correctly mapped.
 */
export const logSighting = async (faceData) => {
    try {
        const { identity, confidence, emotions } = faceData;

        // Skip logging if confidence is too low (< 0.5) to avoid noise
        if (confidence < 0.5) return;

        await AuditLog.create({
            faceId: identity?._id || null,
            name: identity?.name || "Guest",
            confidence: confidence,
            dominantEmotion: emotions?.dominant || "Neutral",
            emotionScores: emotions?.scores || {},
            demographics: {
                age: faceData.demographics?.age || null,
                gender: faceData.demographics?.gender || null,
                livenessScore: faceData.demographics?.livenessScore || null,
            },
            embedding: faceData.embedding || []
        });
    } catch (error) {
        console.error("Audit Logging Error:", error);
    }
};

/**
 * Retrieves attendance statistics with pagination.
 */
export const getAttendanceTrends = async (page = 1, limit = 50) => {
    const skip = (page - 1) * limit;
    return await AuditLog.find()
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate("faceId", "name metadata");
};

/**
 * Gets the total number of audit logs.
 */
export const getTotalAuditLogs = async () => {
    return await AuditLog.countDocuments();
};
