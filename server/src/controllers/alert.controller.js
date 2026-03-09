import asyncHandler from "../utils/asyncHandler.js";
import ApiResponse from "../utils/ApiResponse.js";
import { whatsappService } from "../services/whatsapp.service.js";
import ApiError from "../utils/ApiError.js";
import logger from "../loggers/winston.logger.js";

/**
 * Handles manually triggered unknown face alerts from the frontend.
 */
export const notifyUnknownFace = asyncHandler(async (req, res) => {
    const file = req.file;
    if (!file) {
        throw new ApiError(400, "Image file is required for unknown face notification");
    }

    logger.info(`[AlertController] Manual unknown face alert triggered for file: ${file.originalname}`);

    const alertMessage = `🚨 *UNKNOWN FACE DETECTED*\n` +
        `Time: ${new Date().toLocaleString()}\n` +
        `Source: Manual System Trigger\n` +
        `Action Required: Check surveillance console immediately.`;

    await whatsappService.sendMessage(alertMessage);

    return res
        .status(200)
        .json(new ApiResponse(200, "Unknown face alert sent successfully", null));
});
