import { AuditLog } from "../models/audit.model.js";
import env from "../configs/env.config.js";
import logger from "../loggers/winston.logger.js";

const { suspiciousWindowMinutes, suspiciousDetectionThreshold } = env;

/**
 * Suspicious Activity Monitoring Service.
 * Detects repeated appearances of unknown entities within a short window.
 */
class SuspiciousActivityService {
    /**
     * Evaluates the appearance history of an entity.
     * @param {string} entityType - "face" or "object"
     * @param {string} name - Entity label or identity name
     * @returns {Promise<Object>} - Status of suspicion
     */
    async evaluateAppearanceHistory(entityType, name) {
        if (!name || name === "Guest" || name === "Unknown") {
            // Normalize unknown names for broad matching
            name = { $in: ["Guest", "Unknown"] };
        }

        const timeWindow = new Date(Date.now() - suspiciousWindowMinutes * 60 * 1000);

        try {
            // Indexed query for high-performance aggregate matching
            const count = await AuditLog.countDocuments({
                entityType,
                name: typeof name === 'string' ? name : name,
                createdAt: { $gte: timeWindow }
            });

            const isSuspicious = count >= suspiciousDetectionThreshold;

            if (isSuspicious) {
                logger.warn(`[SuspiciousActivity] Alert Criteria Met: ${entityType}/${name} appeared ${count} times in ${suspiciousWindowMinutes}min.`);
            }

            return {
                suspicious: isSuspicious,
                entityType,
                name: typeof name === 'string' ? name : "Unknown Identity",
                count,
                windowMinutes: suspiciousWindowMinutes
            };
        } catch (error) {
            logger.error(`[SuspiciousActivity] History Evaluation Failed: ${error.message}`);
            return { suspicious: false, count: 0 };
        }
    }
}

export const suspiciousActivityService = new SuspiciousActivityService();
