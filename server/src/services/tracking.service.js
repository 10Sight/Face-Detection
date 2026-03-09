import { AuditLog } from "../models/audit.model.js";
import logger from "../loggers/winston.logger.js";

/**
 * Service for tracking recognized individuals across multiple cameras.
 */
class TrackingService {
    /**
     * Generates a movement timeline for a recognized person.
     * @param {string} faceId - MongoDB ID of the recognized face.
     * @param {number} hours - Time window in hours (default: 24, max: 168).
     * @returns {Promise<Array>} - Collapsed movement timeline.
     */
    async getMovementTimeline(faceId, hours = 24) {
        try {
            // 1. Validation & Window Clamping
            if (!faceId) return [];
            const windowHours = Math.min(Math.max(1, hours), 168);
            const timeWindow = new Date(Date.now() - windowHours * 60 * 60 * 1000);

            // 2. Query historical logs
            const logs = await AuditLog.find({
                faceId,
                entityType: "face",
                createdAt: { $gte: timeWindow }
            })
                .sort({ createdAt: 1 }) // Chronological order
                .limit(200) // Performance limit
                .select("cameraId createdAt");

            if (!logs || logs.length === 0) return [];

            // 3. Collapse consecutive entries with same cameraId
            const timeline = [];
            let lastCamera = null;

            for (const log of logs) {
                const currentCamera = log.cameraId || "unknown";

                // Only push if camera changed (collapsing consecutive duplicates)
                if (currentCamera !== lastCamera) {
                    timeline.push({
                        camera: currentCamera,
                        time: log.createdAt
                    });
                    lastCamera = currentCamera;
                }
            }

            logger.info(`[Tracking] Timeline generated for faceId=${faceId}, entries=${timeline.length}`);
            return timeline;

        } catch (error) {
            logger.error(`[Tracking] Timeline Generation Error: ${error.message}`);
            return [];
        }
    }

    /**
     * Gets the last known location of a person.
     * @param {string} faceId - MongoDB ID of the recognized face.
     * @returns {Promise<Object|null>} - Last sighting info.
     */
    async getLastSeen(faceId) {
        try {
            if (!faceId) return null;

            const lastLog = await AuditLog.findOne({
                faceId,
                entityType: "face"
            })
                .sort({ createdAt: -1 })
                .select("cameraId createdAt");

            if (!lastLog) return null;

            return {
                lastCamera: lastLog.cameraId || "unknown",
                lastSeenAt: lastLog.createdAt
            };

        } catch (error) {
            return null;
        }
    }
}

export const trackingService = new TrackingService();
