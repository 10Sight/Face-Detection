import axios from "axios";
import env from "../configs/env.config.js";
import logger from "../loggers/winston.logger.js";

const { workerUrl } = env;

/**
 * Service to proxy telemetry and health data from the worker.
 */
class TelemetryService {
    /**
     * Fetches real-time performance metrics from the worker.
     */
    async getMetrics() {
        try {
            const response = await axios.get(`${workerUrl}/api/v1/telemetry`);
            return response.data;
        } catch (error) {
            const errorData = error.response?.data || error.message;
            logger.warn(`[TelemetryProxy] Worker telemetry unreachable: ${error.message}`);
            return {
                status: "offline",
                error: error.message,
                timestamp: new Date().toISOString()
            };
        }
    }
}

export const telemetryService = new TelemetryService();
