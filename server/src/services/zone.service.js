import { Zone } from "../models/zone.model.js";
import { alertService } from "./alert.service.js";
import { logBehaviorEvent } from "./audit.service.js";
import logger from "../loggers/winston.logger.js";

class ZoneService {
    constructor() {
        // zoneCache: Map<cameraId, Zone[]>
        this.zoneCache = new Map();

        // trackZoneState: Map<trackId, { zones: Map<zoneId, { enterTime, alerted }>, lastSeen }>
        this.trackZoneState = new Map();

        // Cleanup interval for stale tracks (every 5 seconds)
        setInterval(() => this.cleanupTracks(), 5000);
    }

    /**
     * Load all zones from database into memory cache.
     */
    async initializeCache() {
        try {
            const zones = await Zone.find({});
            this.zoneCache.clear();

            zones.forEach(zone => {
                if (!this.zoneCache.has(zone.cameraId)) {
                    this.zoneCache.set(zone.cameraId, []);
                }
                this.zoneCache.get(zone.cameraId).push(zone);
            });

            logger.info(`[Zone] Cache initialized with ${zones.length} zones across ${this.zoneCache.size} cameras`);
        } catch (error) {
            logger.error(`[Zone] Failed to initialize cache: ${error.message}`);
        }
    }

    /**
     * Public method to refresh the cache.
     */
    async refreshCache() {
        logger.info(`[Zone] Refreshing cache...`);
        await this.initializeCache();
    }

    /**
     * Point-in-Polygon detection using Ray-Casting algorithm.
     * @param {Object} point {x, y} normalized
     * @param {Array} polygon Array of {x, y} normalized
     */
    isPointInsidePolygon(point, polygon) {
        let isInside = false;
        const x = point.x;
        const y = point.y;

        for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
            const xi = polygon[i].x;
            const yi = polygon[i].y;
            const xj = polygon[j].x;
            const yj = polygon[j].y;

            const intersect = ((yi > y) !== (yj > y)) &&
                (x < (xj - xi) * (y - yi) / (yj - yi) + xi);

            if (intersect) isInside = !isInside;
        }

        return isInside;
    }

    /**
     * Process track detection for zone interaction.
     */
    async processTrack({ trackId, center, cameraId, timestamp }) {
        if (!this.zoneCache.has(cameraId)) return;

        const zones = this.zoneCache.get(cameraId);

        // Initialize state for track if not exists
        if (!this.trackZoneState.has(trackId)) {
            this.trackZoneState.set(trackId, {
                zones: new Map(),
                lastSeen: Date.now()
            });
        }

        const state = this.trackZoneState.get(trackId);
        state.lastSeen = Date.now();

        for (const zone of zones) {
            const isInside = this.isPointInsidePolygon(center, zone.polygon);
            const zoneId = zone._id.toString();
            const zoneState = state.zones.get(zoneId);

            if (isInside) {
                // If newly entered
                if (!zoneState) {
                    const newState = {
                        enterTime: Date.now(),
                        alerted: false
                    };

                    logger.info(`[Zone] Track ${trackId} entered zone ${zone.name} (${zone.type})`);

                    // Specific logic for Restricted Entry
                    if (zone.type === "restricted") {
                        this.handleZoneEvent(trackId, zone, "restricted_entry", cameraId);
                        newState.alerted = true; // Mark as alerted automatically for restricted entry
                    }

                    state.zones.set(zoneId, newState);
                } else {
                    // Already inside, check for loitering
                    const dwellTimeS = (Date.now() - zoneState.enterTime) / 1000;
                    if (!zoneState.alerted && dwellTimeS >= zone.dwellThreshold) {
                        zoneState.alerted = true;
                        this.handleZoneEvent(trackId, zone, "loitering", cameraId);
                    }
                }
            } else {
                // If exited
                if (zoneState) {
                    logger.info(`[Zone] Track ${trackId} left zone ${zone.name}`);
                    state.zones.delete(zoneId);
                }
            }
        }
    }

    /**
     * Handle event triggering (logging and alerts).
     */
    async handleZoneEvent(trackId, zone, eventType, cameraId) {
        logger.warn(`[Zone] EVENT: ${eventType} | Track: ${trackId} | Zone: ${zone.name}`);

        // 1. Log to Audit
        await logBehaviorEvent({
            trackId,
            cameraId,
            eventType,
            zoneId: zone._id,
            zoneName: zone.name,
            behaviorConfidence: 1.0 // Zone events are binary/high confidence based on geometry
        });

        // 2. Send Alert
        alertService.notifyZoneEvent({
            trackId,
            cameraId,
            zoneName: zone.name,
            eventType,
            time: new Date().toLocaleTimeString()
        });
    }

    /**
     * Periodically clean up tracks not seen for 5 seconds.
     */
    cleanupTracks() {
        const now = Date.now();
        for (const [trackId, state] of this.trackZoneState.entries()) {
            if (now - state.lastSeen > 5000) {
                this.trackZoneState.delete(trackId);
                logger.debug(`[Zone] Cleaned up stale track state: ${trackId}`);
            }
        }
    }
}

export const zoneService = new ZoneService();
