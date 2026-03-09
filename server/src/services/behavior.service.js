import { AuditLog } from "../models/audit.model.js";
import { alertService } from "./alert.service.js";
import { logBehaviorEvent } from "./audit.service.js";
import { socketService } from "./socket.service.js";
import winston from "winston";

const logger = winston.createLogger({
    level: "info",
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.printf(({ timestamp, level, message }) => {
            return `${timestamp} [${level.toUpperCase()}] [Behavior]: ${message}`;
        })
    ),
    transports: [new winston.transports.Console()],
});

class BehaviorService {
    constructor() {
        this.trackStates = new Map(); // trackId -> { lastBehavior, lastAlertTs }
        this.BEHAVIOR_COOLDOWN_S = 10;
    }

    /**
     * Processes behavior metrics from the worker for multiple persons.
     * @param {Array} poses - Array of pose objects with metrics
     * @param {String} cameraId - Source camera ID
     */
    async processBehaviors(poses, cameraId) {
        if (!poses || poses.length === 0) return;

        for (const pose of poses) {
            const { track_id, metrics } = pose;
            if (!track_id || !metrics) continue;

            const currentBehavior = this._getHighestPriorityBehavior(metrics);
            if (currentBehavior === "normal") continue;

            const state = this._getOrInitState(track_id);
            const now = Date.now();

            // Check Cooldown and State Change
            const isNewBehavior = state.lastBehavior !== currentBehavior;
            const cooldownElapsed = (now - state.lastAlertTs) / 1000 >= this.BEHAVIOR_COOLDOWN_S;

            if (isNewBehavior || cooldownElapsed) {
                logger.info(`Detected ${currentBehavior} for track ${track_id} (Conf: ${metrics.behaviorConfidence.toFixed(2)})`);

                state.lastBehavior = currentBehavior;
                state.lastAlertTs = now;

                // 1. Log to Audit Trail
                await logBehaviorEvent({
                    trackId: track_id,
                    cameraId,
                    type: currentBehavior,
                    confidence: metrics.behaviorConfidence
                });

                // 2. Trigger WhatsApp Alert if Confidence is high
                if (metrics.behaviorConfidence > 0.7) {
                    await alertService.notifyBehavior(currentBehavior, track_id, cameraId);
                }

                // 3. Broadcast via Socket
                socketService.emit("behavior_alert", {
                    track_id,
                    cameraId,
                    type: currentBehavior,
                    confidence: metrics.behaviorConfidence,
                    timestamp: now
                });
            }
        }
    }

    _getHighestPriorityBehavior(metrics) {
        if (metrics.fall) return "fall";
        if (metrics.running) return "running";
        if (metrics.stationary) return "stationary";
        return "normal";
    }

    _getOrInitState(trackId) {
        if (!this.trackStates.has(trackId)) {
            this.trackStates.set(trackId, {
                lastBehavior: "normal",
                lastAlertTs: 0
            });
        }
        return this.trackStates.get(trackId);
    }

    /**
     * Cleans up state when a track is purged on the server (optional, if server manages tracking)
     */
    purgeTrack(trackId) {
        this.trackStates.delete(trackId);
    }
}

export const behaviorService = new BehaviorService();
