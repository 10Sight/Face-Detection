import { workerService } from "./worker.service.js";
import { recognitionCache } from "./recognitionCache.service.js";
import { logSighting } from "./audit.service.js";
import { socketService } from "./socket.service.js";
import { suspiciousActivityService } from "./suspiciousActivity.service.js";
import { trackingService } from "./tracking.service.js";
import { alertService } from "./alert.service.js";
import { reidService } from "./reid.service.js";
import { behaviorService } from "./behavior.service.js";
import { zoneService } from "./zone.service.js";
import logger from "../loggers/winston.logger.js";

/**
 * Orchestrates the full forensic flow for a single frame or detection request.
 */
class DetectionPipelineService {
    constructor() {
        this.OBJECT_WHITELIST = ["person", "backpack", "suitcase", "handbag", "knife", "gun"];
    }

    /**
     * Executes the detection pipeline.
     * @param {Buffer} buffer - Image data.
     * @param {string} originalname - File name.
     * @param {boolean} isStatic - Whether it's a static image or stream.
     * @param {string[]} modes - AI modes (face, object, etc).
     * @param {number} timestampMs - Frame timestamp.
     * @param {Object} options - Pipeline options (alerts toggle, cameraId, etc).
     * @returns {Promise<Object>} - Processed results.
     */
    async process(buffer, originalname, isStatic, modes, timestampMs, options = {}) {
        const { unknownAlertsEnabled = true, suspiciousAlertsEnabled = true } = options;

        // Normalize Camera ID
        let { cameraId = "unknown" } = options;
        cameraId = (typeof cameraId === 'string' && cameraId.trim()) ? cameraId.trim().toLowerCase() : "unknown";

        logger.debug(`[DetectionPipeline] Starting pipeline for ${originalname} from camera ${cameraId}`);

        // 1. Worker Inference
        const detectionPayload = await workerService.detect(buffer, originalname, isStatic, modes, timestampMs);
        const detectionResult = detectionPayload.result;

        // 2. Face Processing
        if (detectionResult.faceDetected && detectionResult.faces) {
            await Promise.all(detectionResult.faces.map(async (face) => {
                if (face.embedding && face.track_id !== undefined) {
                    // Track-Centric Recognition & Watchlist Evaluation
                    const { identity, alert } = await recognitionCache.getIdentityForTrack(
                        face.track_id,
                        face.embedding,
                        { unknownAlertsEnabled }
                    );

                    face.identity = identity;
                    if (alert) face.securityAlert = alert;

                    // ReID Correlation: Link face to person via spatial overlap
                    if (detectionResult.persons) {
                        const personMatch = detectionResult.persons.find(p => {
                            // Simple overlap check
                            const pBbox = p.bbox; // [xmin, ymin, width, height]
                            const fBbox = face.xmin ? face : face.bbox; // face might have different bbox format

                            // Normalize face bbox to [xmin, ymin, width, height] for comparison
                            const fx = face.xmin || face.bbox[0];
                            const fy = face.ymin || face.bbox[1];
                            const fw = face.width || (face.bbox[2] - face.bbox[0]);
                            const fh = face.height || (face.bbox[3] - face.bbox[1]);

                            const px = pBbox[0];
                            const py = pBbox[1];
                            const pw = pBbox[2];
                            const ph = pBbox[3];

                            // Check if face center is inside person box (loose matching)
                            const fcx = fx + fw / 2;
                            const fcy = fy + fh / 2;
                            return fcx >= px && fcx <= (px + pw) && fcy >= py && fcy <= (py + ph);
                        });

                        if (personMatch) {
                            face.reidIdentityId = personMatch.reidIdentityId;
                            // If face is NOT recognized, use the temporary ReID name
                            if ((!identity || identity.name === "Unknown" || identity.name === "Guest") && personMatch.name) {
                                face.identity.name = personMatch.name;
                            }
                        }
                    }

                    // Cross-Camera Tracking (Only for recognized identities)
                    if (identity && identity.name !== "Unknown" && identity.name !== "Guest" && identity._id) {
                        const lastSeen = await trackingService.getLastSeen(identity._id);
                        if (lastSeen) {
                            face.lastCamera = lastSeen.lastCamera;
                            face.lastSeenAt = lastSeen.lastSeenAt;
                        }
                    }

                    // Audit Logging
                    await logSighting(face, null, "face", cameraId);

                    // 5. Suspicious Appearance Detection (Faces)
                    if (suspiciousAlertsEnabled && (identity.name === "Unknown" || identity.name === "Guest")) {
                        const evaluation = await suspiciousActivityService.evaluateAppearanceHistory("face", identity.name);
                        if (evaluation.suspicious) {
                            alertService.notifySuspiciousFaceActivity(evaluation.count, evaluation.windowMinutes);
                        }
                    }
                }

                // SECURITY: Strip embedding before return
                delete face.embedding;
            }));
        }

        // 3. Person ReID Processing (Phase 28: Fallback Identity)
        if (detectionResult.persons && detectionResult.persons.length > 0) {
            await Promise.all(detectionResult.persons.map(async (person) => {
                if (person.reid_embedding && person.reid_embedding.length > 0) {
                    const reidId = await reidService.processSighting(person.reid_embedding, cameraId);
                    person.reidIdentityId = reidId._id;

                    // Assign temporary identity if no face override occurs later
                    person.name = `Person_${reidId._id.toString().slice(-4).toUpperCase()}`;

                    // Audit Logging for Person (ReID-centric)
                    await logSighting({
                        type: 'person',
                        label: person.name,
                        confidence: person.confidence,
                        bbox: person.bbox,
                        reidIdentityId: reidId._id
                    }, null, "reid", cameraId);
                }
                // SECURITY: Strip embedding
                delete person.reid_embedding;
            }));
        }

        // 4. Object Intelligence (Generic Objects)
        if (detectionResult.objects && detectionResult.objects.length > 0) {
            const significantObjects = detectionResult.objects.filter(obj =>
                ['car', 'motorcycle', 'truck', 'laptop', 'cell phone', 'backpack', 'suitcase', 'handbag', 'knife', 'gun'].includes(obj.label.toLowerCase())
            );

            await Promise.all(significantObjects.map(async (obj) => {
                // Audit Logging
                await logSighting({
                    type: 'object',
                    label: obj.label,
                    confidence: obj.confidence,
                    bbox: obj.bbox_norm,
                    track_id: obj.track_id
                }, null, "object", cameraId);

                // 5. Suspicious Appearance Detection (Objects)
                if (suspiciousAlertsEnabled && this.OBJECT_WHITELIST.includes(obj.label.toLowerCase())) {
                    const evaluation = await suspiciousActivityService.evaluateAppearanceHistory("object", obj.label);
                    if (evaluation.suspicious) {
                        alertService.notifySuspiciousObjectActivity(obj.label, evaluation.count, evaluation.windowMinutes);
                    }
                }
            }));

            // SECURITY: Strip any embeddings from objects
            detectionResult.objects.forEach(obj => delete obj.embedding);
        }

        // 4. Behavior Intelligence (Phase 1)
        if (detectionResult.pose) {
            await behaviorService.processBehaviors(detectionResult.pose, cameraId);

            // 5. Zone Intelligence
            await Promise.all(detectionResult.pose.map(async (p) => {
                if (p.track_id && p.metrics?.center_norm) {
                    await zoneService.processTrack({
                        trackId: p.track_id,
                        center: p.metrics.center_norm,
                        cameraId,
                        timestamp: timestampMs
                    });
                }
            }));
        }

        // 5. Real-time Broadcasting
        socketService.broadcastResults(detectionResult);

        logger.info(`[Pipeline] Processed frame with ${detectionResult.totalFaces || 0} faces and ${detectionResult.objects?.length || 0} objects.`);
        return detectionResult;
    }
}


export const detectionPipeline = new DetectionPipelineService();
