import { Watchlist } from "../models/watchlist.model.js";

/**
 * Checks if a face is on any watchlist and returns alert metadata.
 */
export const checkWatchlist = async (faceId) => {
    if (!faceId) return null;

    try {
        const entry = await Watchlist.findOne({ faceId, isActive: true });
        if (entry) {
            return {
                type: entry.type,
                severity: entry.severity,
                message: entry.type === "Blacklist" ? "CRITICAL: Unauthorized Access Detected" : "VIP: Identified Profile Detected",
                notes: entry.notes || ""
            };
        }
        return null;
    } catch (error) {
        console.error("Watchlist Check Error:", error);
        return null;
    }
};

/**
 * Convenience method to add a face to a watchlist.
 */
export const addToWatchlist = async (faceId, type, severity = "Medium", notes = "") => {
    return await Watchlist.create({ faceId, type, severity, notes });
};
