import axios from "axios";
import env from "../configs/env.config.js";
import ApiError from "../utils/ApiError.js";

const { workerUrl } = env;

/**
 * Sends an image to the Python worker for face detection.
 * @param {Buffer} imageBuffer - The image data as a buffer.
 * @param {string} filename - The name of the file.
 * @returns {Promise<Object>} - The detection results.
 */
const detectFaceInWorker = async (imageBuffer, filename, isStatic = false) => {
    try {
        const formData = new FormData();
        const blob = new Blob([imageBuffer], { type: 'image/jpeg' });
        formData.append('file', blob, filename);

        const response = await axios.post(`${workerUrl}/api/v1/detect${isStatic ? '?is_static=true' : ''}`, formData);

        return response.data;
    } catch (error) {
        console.error("Worker communication error:", error.response?.data || error.message);
        if (error.response) {
            console.error("Worker Status:", error.response.status);
            console.error("Worker Response Data:", JSON.stringify(error.response.data, null, 2));
        } else {
            console.error("No response from worker. Error Code:", error.code);
        }
        throw new ApiError(
            error.response?.status || 500,
            "Error communicating with face detection worker",
            error.response?.data?.errors || [error.message]
        );
    }
};

export { detectFaceInWorker };
