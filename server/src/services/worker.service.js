import axios from "axios";
import env from "../configs/env.config.js";
import ApiError from "../utils/ApiError.js";
import logger from "../loggers/winston.logger.js";

const { workerUrl } = env;

/**
 * Service to handle low-level communication with the Neural Worker.
 */
class WorkerService {
    /**
     * Sends an image to the Python worker for detection/inference.
     * @param {Buffer} imageBuffer 
     * @param {string} filename 
     * @param {boolean} isStatic 
     * @param {string[]} modes 
     * @param {number} timestampMs 
     * @returns {Promise<Object>}
     */
    async detect(imageBuffer, filename, isStatic = false, modes = ['face'], timestampMs = null) {
        try {
            const formData = new FormData();
            const blob = new Blob([imageBuffer], { type: 'image/jpeg' });
            formData.append('file', blob, filename);

            const modeParams = modes.map(m => `modes=${m}`).join('&');
            let url = `${workerUrl}/api/v1/face/detect?is_static=${isStatic}&${modeParams}`;
            if (timestampMs) {
                url += `&timestamp_ms=${timestampMs}`;
            }

            logger.debug(`[WorkerProxy] Sending inference request to ${url}`);
            const response = await axios.post(url, formData);
            return response.data;
        } catch (error) {
            const errorData = error.response?.data || error.message;
            const statusCode = error.response?.status || 500;

            logger.error(`[WorkerProxy] Inference Failed. Status: ${statusCode}`, {
                data: errorData,
                url: error.config?.url
            });

            throw new ApiError(
                statusCode,
                "Error communicating with AI worker",
                [typeof errorData === 'string' ? errorData : JSON.stringify(errorData)]
            );
        }
    }
}

export const workerService = new WorkerService();
