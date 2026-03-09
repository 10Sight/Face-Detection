import { Watchlist } from "../models/watchlist.model.js";
import logger from "../loggers/winston.logger.js";
import { whatsappService } from "./whatsapp.service.js";

/**
 * Alert Management Service.
 * Decides when and how to trigger security notifications.
 */
class AlertService {
    /**
     * Checks if an identity is on a watchlist and evaluates alert urgency.
     * @param {string} faceId 
     * @returns {Promise<Object|null>}
     */
    async evaluate(faceId) {
        if (!faceId) return null;

        try {
            const entry = await Watchlist.findOne({ faceId, isActive: true });
            if (!entry) return null;

            const alert = {
                type: entry.type,
                severity: entry.severity,
                message: entry.type === "Blacklist" ? "CRITICAL: Unauthorized Access" : "VIP Notice",
                notes: entry.notes || ""
            };

            logger.warn(`[AlertEngine] ${alert.type} Alert Triggered for ID: ${faceId}`);

            // Trigger External Notifications for high-priority alerts
            if (entry.severity === "High" || entry.severity === "Critical") {
                this.notifyExternal(alert, faceId);
            }

            return alert;
        } catch (error) {
            logger.error(`[AlertEngine] Evaluation Error: ${error.message}`);
            return null;
        }
    }

    /**
     * Triggers alert for an unknown/unrecognized face.
     */
    async notifyUnknown(trackId) {
        try {
            const message = `🚨 *UNKNOWN FACE DETECTED*\nTrack ID: ${trackId}\nTime: ${new Date().toLocaleString()}\nPlease check the dashboard.`;
            await whatsappService.sendMessage(message);
            logger.info(`[AlertEngine] Unknown face notification sent for track ${trackId}`);
        } catch (error) {
            logger.error(`[AlertEngine] Unknown notification failed: ${error.message}`);
        }
    }

    /**
     * Triggers external notification platforms (WhatsApp, etc).
     */
    async notifyExternal(alert, faceId, imageUrl = null) {
        try {
            const message = `🚨 *${alert.type} Alert*\nSeverity: ${alert.severity}\nDetails: ${alert.message}\nID: ${faceId}`;

            if (imageUrl) {
                await whatsappService.sendImage(imageUrl, message);
            } else {
                await whatsappService.sendMessage(message);
            }

            logger.info(`[AlertEngine] External notify sent for ${faceId}`);
        } catch (error) {
            logger.error(`[AlertEngine] Notification Pipeline failed: ${error.message}`);
        }
    }

    /**
     * Alerts for suspicious repeated appearance of an unknown face.
     */
    async notifySuspiciousFaceActivity(count, window) {
        const message = `🚨 *SUSPICIOUS FACE ACTIVITY*\n` +
            `Unknown person detected *${count}* times within *${window}* minutes.\n` +
            `Possible reconnaissance activity. Please check surveillance.`;
        await whatsappService.sendMessage(message);
        logger.warn(`[AlertEngine] Suspicious face alert triggered: ${count} sightings`);
    }

    /**
     * Alerts for suspicious repeated appearance of an object.
     */
    async notifySuspiciousObjectActivity(label, count, window) {
        const message = `🚨 *SUSPICIOUS OBJECT ALERT*\n` +
            `Object type *${label}* detected *${count}* times within *${window}* minutes.\n` +
            `Unusual recurrence may indicate a risk.`;
        await whatsappService.sendMessage(message);
        logger.warn(`[AlertEngine] Suspicious object alert triggered: ${label} (${count})`);
    }


    /**
     * Registers a face on the watchlist.
     */
    async addToWatchlist(faceId, type, severity = "Medium", notes = "") {
        return await Watchlist.create({ faceId, type, severity, notes });
    }

    /**
     * Triggers a WhatsApp alert for specific behavior events.
     */
    async notifyBehavior(type, trackId, cameraId) {
        try {
            const emoji = type === "fall" ? "🆘" : (type === "running" ? "🏃" : "🛑");
            const message = `${emoji} *BEHAVIOR ALERT: ${type.toUpperCase()}*\nTrack: ${trackId}\nCamera: ${cameraId}\nTime: ${new Date().toLocaleString()}\nPlease check live feed immediately.`;
            await whatsappService.sendMessage(message);
            logger.warn(`[AlertEngine] Behavior alert sent: ${type} for track ${trackId}`);
        } catch (error) {
            logger.error(`[AlertEngine] Behavior notification failed: ${error.message}`);
        }
    }

    /**
     * Alerts for zone-specific violations (Restricted Entry, Loitering).
     */
    async notifyZoneEvent({ trackId, cameraId, zoneName, eventType, time }) {
        try {
            const emoji = eventType === "restricted_entry" ? "🚫" : "⏳";
            const title = eventType === "restricted_entry" ? "RESTRICTED AREA ENTRY" : "LOITERING DETECTED";

            const message = `${emoji} *${title}*\n` +
                `Camera: ${cameraId}\n` +
                `Zone: ${zoneName}\n` +
                `Track ID: ${trackId}\n` +
                `Time: ${time}\n` +
                `Please investigate immediately.`;

            await whatsappService.sendMessage(message);
            logger.warn(`[AlertEngine] Zone alert sent: ${eventType} for zone ${zoneName}`);
        } catch (error) {
            logger.error(`[AlertEngine] Zone notification failed: ${error.message}`);
        }
    }
}

export const alertService = new AlertService();

