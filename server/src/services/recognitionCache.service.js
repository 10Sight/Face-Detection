import { identifyFace } from "./recognition.service.js";
import { alertService } from "./alert.service.js";
import { logSighting, clearTrackAuditMemory } from "./audit.service.js";
import logger from "../loggers/winston.logger.js";
import { calculateCosineSimilarity } from "../utils/vectorUtils.js";

class RecognitionCacheService {
    constructor() {
        // Map<track_id, { identity, alert, embedding, lastSeen }>
        this.cache = new Map();
        this.DRIFT_THRESHOLD = 0.70; // Recalculate if similarity < 0.70 (more sticky)
        this.EXPIRY_MS = 30000; // 30 seconds idle time for cleanup
    }

    /**
     * Gets or updates recognition for a specific track.
     */
    async getIdentityForTrack(trackId, currentEmbedding, options = {}) {
        const { unknownAlertsEnabled = true } = options;
        const cached = this.cache.get(trackId);
        const now = Date.now();

        if (cached && (cached.identity.name !== "Unknown" && cached.identity.name !== "Guest")) {
            // Update last seen
            cached.lastSeen = now;

            // Check for drift
            const similarity = calculateCosineSimilarity(currentEmbedding, cached.embedding);
            if (similarity >= this.DRIFT_THRESHOLD) {
                return { identity: cached.identity, alert: cached.alert, driftTriggered: false };
            }
            logger.debug(`[RecognitionCache] Drift detected for track ${trackId} (sim: ${similarity.toFixed(3)}). Re-verifying.`);
        }


        // Parallel Identity + Watchlist Lookup
        const identity = await identifyFace(currentEmbedding);
        let alert = null;

        if (identity && identity._id) {
            alert = await alertService.evaluate(identity._id);
        } else if (identity && identity.name === "Unknown") {
            // New Unknown Face Alert (Optional: Throttled by track start)
            if (!cached && unknownAlertsEnabled) {
                alertService.notifyUnknown(trackId).catch(err => logger.error(`[RecognitionCache] Alert Error: ${err.message}`));
            }
        }

        this.cache.set(trackId, {
            identity,
            alert,
            embedding: currentEmbedding,
            lastSeen: now
        });

        return { identity, alert, driftTriggered: true };
    }


    /**
     * Periodic cleanup of stale tracks.
     */
    async cleanup() {
        const now = Date.now();
        for (const [trackId, data] of this.cache.entries()) {
            if (now - data.lastSeen > this.EXPIRY_MS) {
                logger.debug(`[RecognitionCache] Track ${trackId} expired. Logging exit.`);

                // Log Track Loss
                logSighting({
                    identity: data.identity,
                    confidence: 0.5,
                    track_id: trackId
                }, "TRACK_LOST").catch(err => logger.error(`[RecognitionCache] Track Loss Log Error: ${err.message}`));

                clearTrackAuditMemory(trackId);
                this.cache.delete(trackId);
            }
        }
    }
}

export const recognitionCache = new RecognitionCacheService();
// Run cleanup every 10 seconds
setInterval(() => recognitionCache.cleanup(), 10000);

