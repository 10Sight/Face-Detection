import { Zone } from "../models/zone.model.js";
import logger from "../loggers/winston.logger.js";

/**
 * Get all zones defined for a specific camera.
 */
export const getZonesByCamera = async (req, res) => {
    try {
        const { cameraId } = req.params;
        const zones = await Zone.find({ cameraId: cameraId.toLowerCase() });

        res.status(200).json({
            success: true,
            data: zones
        });
    } catch (error) {
        logger.error(`[ZoneController] Fetch failed: ${error.message}`);
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * Create a new spatial zone.
 */
export const createZone = async (req, res) => {
    try {
        const { cameraId, name, type, polygon, dwellThreshold } = req.body;

        const zone = await Zone.create({
            cameraId: cameraId.toLowerCase(),
            name,
            type,
            polygon,
            dwellThreshold
        });

        logger.info(`[ZoneController] Created zone: ${name} for cam ${cameraId}`);

        res.status(201).json({
            success: true,
            data: zone
        });
    } catch (error) {
        logger.error(`[ZoneController] Create failed: ${error.message}`);
        res.status(400).json({ success: false, message: error.message });
    }
};

/**
 * Delete a specific zone.
 */
export const deleteZone = async (req, res) => {
    try {
        const { id } = req.params;
        const result = await Zone.findByIdAndDelete(id);

        if (!result) {
            return res.status(404).json({ success: false, message: "Zone not found" });
        }

        logger.info(`[ZoneController] Deleted zone: ${id}`);

        res.status(200).json({
            success: true,
            message: "Zone deleted successfully"
        });
    } catch (error) {
        logger.error(`[ZoneController] Delete failed: ${error.message}`);
        res.status(500).json({ success: false, message: error.message });
    }
};
