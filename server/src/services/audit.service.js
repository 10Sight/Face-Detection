import { AuditLog } from "../models/audit.model.js";
import logger from "../loggers/winston.logger.js";

/**
 * Persists a sighting to the Audit Log.
 * Optimized for performance: High-FPS streams should be throttled at the app level, 
 * but this service ensures data is correctly mapped.
 */
const loggedTracks = new Map(); // track_id -> name
const lastLoggedAlert = new Map(); // track_id -> alertType

/**
 * Persists a sighting to the Audit Log.
 * Log only on significant events: New Track, Identity Evolution, Watchlist Match, or explicit Request.
 */
export const logSighting = async (faceData, eventType = null, entityType = "face", cameraId = "unknown") => {
    try {
        const { identity, confidence, emotions, track_id, securityAlert } = faceData;
        const currentName = faceData.label || identity?.name || "Guest";

        // 1. Filter: Base confidence check
        if (confidence < 0.4 && !eventType) return;

        // 2. Duplicate Suppression (5-second window per camera for recognized identities)
        if (entityType === "face" && identity?._id) {
            const fiveSecondsAgo = new Date(Date.now() - 5000);
            const recentLog = await AuditLog.findOne({
                faceId: identity._id,
                cameraId: cameraId,
                createdAt: { $gte: fiveSecondsAgo }
            }).select('_id');

            if (recentLog) {
                // Skip logging to prevent excessive identical entries
                return;
            }
        }

        // 3. Logic: Should we log this frame?
        const previousName = track_id ? loggedTracks.get(track_id) : null;
        const isNewTrack = track_id && !loggedTracks.has(track_id);

        // Identity Evolution: If previously a placeholder but now have a real name, we MUST re-log.
        const isPlaceholder = (name) => !name || name === "Guest" || name === "Unknown";
        const identityEvolved = entityType === "face" && isPlaceholder(previousName) && !isPlaceholder(currentName);

        const isNewAlert = securityAlert && lastLoggedAlert.get(track_id) !== securityAlert.type;
        const isExplicit = !!eventType;

        if (!isNewTrack && !isNewAlert && !isExplicit && !identityEvolved) {
            return; // Skip per-frame redundant logging
        }

        // 4. Mark as logged
        if (track_id) {
            loggedTracks.set(track_id, currentName);
            if (securityAlert) lastLoggedAlert.set(track_id, securityAlert.type);
        }

        // 5. Create Entry
        const determinedEvent = eventType || (
            securityAlert ? "WATCHLIST_MATCH" :
                identityEvolved ? "IDENTITY_RECOGNIZED" :
                    isNewTrack ? "NEW_TRACK" : "PERIODIC"
        );

        await AuditLog.create({
            faceId: identity?._id || null,
            name: currentName,
            confidence: confidence,
            dominantEmotion: emotions?.dominant || "Neutral",
            emotionScores: emotions?.scores || {},
            demographics: {
                age: faceData.demographics?.age || null,
                gender: faceData.demographics?.gender || null,
                livenessScore: faceData.demographics?.livenessScore || null,
            },
            event: determinedEvent,
            trackId: track_id,
            entityType: entityType,
            cameraId: cameraId,
            reidIdentityId: faceData.reidIdentityId || null, // Added reidIdentityId
            // SECURITY: Never log full high-dim embeddings in audit logs anymore to prevent IP theft
            hasEmbedding: !!faceData.embedding
        });

        logger.info(`[Audit] Logged ${determinedEvent} (${entityType}) for track ${track_id}`);


    } catch (error) {
        logger.error(`[Audit] Logging Error: ${error.message}`);
    }
};

/**
 * Cleanup tracking memory. Called when tracks expire.
 */
export const clearTrackAuditMemory = (trackId) => {
    loggedTracks.delete(trackId);
    lastLoggedAlert.delete(trackId);
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
        .populate("faceId", "name");
};

/**
 * Specialized logger for behavior events.
 */
export const logBehaviorEvent = async ({ trackId, cameraId, type, confidence }) => {
    try {
        await AuditLog.create({
            name: "Person_" + (trackId || "Unknown"),
            confidence: confidence,
            dominantEmotion: "N/A",
            eventType: type,
            behaviorConfidence: confidence,
            entityType: "object",
            cameraId: cameraId,
            trackId: trackId
        });
        logger.info(`[Audit] Logged behavior ${type} for track ${trackId}`);
    } catch (error) {
        logger.error(`[Audit] Behavior Logging Error: ${error.message}`);
    }
};

/**
 * Gets the total number of audit logs.
 */
export const getTotalAuditLogs = async () => {
    return await AuditLog.countDocuments();
};

