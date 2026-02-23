import { detectFaceInWorker } from "../services/faceDetection.service.js";
import asyncHandler from "../utils/asyncHandler.js";
import ApiError from "../utils/ApiError.js";
import ApiResponse from "../utils/ApiResponse.js";
import { identifyFace, registerFace as registerFaceInDB } from "../services/recognition.service.js";
import { logSighting } from "../services/audit.service.js";
import { checkWatchlist } from "../services/alert.service.js";
import { registerNewIdentity } from "../services/identity.service.js";

const detectFace = asyncHandler(async (req, res) => {
    if (!req.file) {
        throw new ApiError(400, "No image file provided");
    }

    const { buffer, originalname } = req.file;
    const isStatic = req.query.is_static === 'true';

    // Detect and extract embeddings from worker
    const detectionPayload = await detectFaceInWorker(buffer, originalname, isStatic);
    const detectionResult = detectionPayload.result;

    if (detectionResult.faceDetected) {
        // Phase 3: Identity Recognition
        for (let face of detectionResult.faces) {
            if (face.embedding) {
                const identity = await identifyFace(face.embedding);
                face.identity = identity;

                // Phase 8: Neural Security Alerts
                if (identity) {
                    const alert = await checkWatchlist(identity._id);
                    if (alert) face.securityAlert = alert;
                }
            }

            // Phase 6: Operational Audit Logging (Async)
            // Fire and forget to avoid blocking the API response
            logSighting(face).catch(err => console.error("Async Audit Log Failure:", err));
        }
    }

    return res
        .status(200)
        .json(new ApiResponse(200, "Face detection and recognition successful", detectionResult));
});

const registerFace = asyncHandler(async (req, res) => {
    const { name, userId, watchlistType, severity } = req.body;
    if (!req.file || !name) {
        throw new ApiError(400, "Name and image are required for registration");
    }

    // Get embedding for the registration image
    const detectionPayload = await detectFaceInWorker(req.file.buffer, req.file.originalname, true);
    const detectionResult = detectionPayload.result;

    if (!detectionResult || !detectionResult.faceDetected || detectionResult.totalFaces > 1) {
        throw new ApiError(400, "Single clear face required for registration");
    }

    const embedding = detectionResult.faces[0].embedding;

    const registrationData = {
        name,
        embedding,
        userId: userId || null,
        watchlist: watchlistType ? {
            type: watchlistType,
            severity: severity || "Medium"
        } : null
    };

    const registeredFace = await registerNewIdentity(registrationData);

    return res
        .status(201)
        .json(new ApiResponse(201, "Face registered successfully", registeredFace));
});

export { detectFace, registerFace };
