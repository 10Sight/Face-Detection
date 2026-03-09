import { ReIDIdentity } from '../models/reidIdentity.model.js';
import { AuditLog } from '../models/audit.model.js';
import logger from '../loggers/winston.logger.js';
import { calculateCosineSimilarity } from '../utils/vectorUtils.js';

/**
 * REID VECTOR INDEX (IN-MEMORY)
 * Optimized for fallback person tracking.
 */
let reidIndex = []; // Array of { _id, embedding, lastSeen, lastSeenCamera, confidence, sightings }
const MAX_REID_IDENTITIES = 5000;
const SLIDING_WINDOW_MS = 2 * 60 * 60 * 1000; // 2 Hours
const CLEANUP_INTERVAL_MS = 30 * 60 * 1000; // 30 Minutes
const EXPIRATION_MS = 24 * 60 * 60 * 1000; // 24 Hours

/**
 * Ensures the index stays within limits and recent.
 */
const enforceMemoryLimits = () => {
    const now = Date.now();
    // 1. Remove expired from window
    reidIndex = reidIndex.filter(id => (now - id.lastSeen) < SLIDING_WINDOW_MS);

    // 2. Cap size
    if (reidIndex.length > MAX_REID_IDENTITIES) {
        // Remove oldest seen if over cap
        reidIndex.sort((a, b) => b.lastSeen - a.lastSeen);
        reidIndex = reidIndex.slice(0, MAX_REID_IDENTITIES);
    }
};

/**
 * Periodic cleanup for database and memory.
 */
export const startCleanupJob = () => {
    setInterval(async () => {
        try {
            const now = new Date();
            const expirationDate = new Date(now.getTime() - EXPIRATION_MS);

            // Cleanup DB: remove stale, low-confidence identities
            const deleted = await ReIDIdentity.deleteMany({
                $or: [
                    { lastSeen: { $lt: expirationDate } },
                    { confidence: { $lt: 0.3 }, sightings: { $lt: 3 }, lastSeen: { $lt: new Date(now.getTime() - SLIDING_WINDOW_MS) } }
                ]
            });

            if (deleted.deletedCount > 0) {
                logger.info(`[ReID] Database cleanup: Removed ${deleted.deletedCount} stale identities.`);
            }

            enforceMemoryLimits();
        } catch (error) {
            logger.error(`[ReID] Cleanup Job Error: ${error.message}`);
        }
    }, CLEANUP_INTERVAL_MS);
};

/**
 * Loads recent ReID identities into memory on startup.
 */
export const initReIDService = async () => {
    try {
        const recentIdentities = await ReIDIdentity.find({
            lastSeen: { $gt: new Date(Date.now() - SLIDING_WINDOW_MS) }
        }).sort({ lastSeen: -1 }).limit(MAX_REID_IDENTITIES).select('+embedding').lean();

        reidIndex = recentIdentities.map(id => ({
            _id: id._id,
            embedding: id.embedding,
            lastSeen: id.lastSeen.getTime(),
            lastSeenCamera: id.lastSeenCamera,
            confidence: id.confidence,
            sightings: id.sightings
        }));

        logger.info(`[ReID] Service initialized: ${reidIndex.length} identities loaded.`);
        startCleanupJob();
    } catch (error) {
        logger.error(`[ReID] Initialization Failed: ${error.message}`);
    }
};

/**
 * PHYSICS CHECK: Minimum camera transition time (teleportation guard).
 */
const validatePhysics = (candidate, currentCamera) => {
    if (candidate.lastSeenCamera === currentCamera) return 1.0;

    const timeSinceLastSeen = Date.now() - candidate.lastSeen;
    if (timeSinceLastSeen < 2000) { // < 2 seconds for different cameras is impossible
        return 0.5; // Heavy penalty
    }
    return 1.0;
};

/**
 * Matches a ReID embedding against the in-memory index.
 */
export const matchReID = async (embedding, cameraId, highThreshold = 0.80, fallbackThreshold = 0.70) => {
    let bestMatch = null;
    let maxSim = -1;

    for (const candidate of reidIndex) {
        let similarity = calculateCosineSimilarity(embedding, candidate.embedding);

        // Apply Physics Penalty
        const physicsMultiplier = validatePhysics(candidate, cameraId);
        similarity *= physicsMultiplier;

        if (similarity > maxSim) {
            maxSim = similarity;
            if (similarity >= fallbackThreshold) {
                bestMatch = candidate;
            }
        }
    }

    // Merge Logic: High similarity (>0.90) and enough sightings
    if (bestMatch && maxSim > 0.90 && bestMatch.sightings > 3) {
        // Potential for merge logic if another match exists, but here we just return the best.
        // Merging usually happens when TWO existing identities are found to be the same.
    }

    if (bestMatch && maxSim >= (bestMatch.confidence > 0.5 ? fallbackThreshold : highThreshold)) {
        logger.info(`[ReID] Matched Identity ${bestMatch._id} (Sim: ${maxSim.toFixed(3)})`);
        return { identity: bestMatch, confidence: maxSim };
    }

    return null;
};

/**
 * Creates or updates a ReID identity.
 */
export const processSighting = async (embedding, cameraId) => {
    // 1. Try to match
    const match = await matchReID(embedding, cameraId);

    if (match) {
        const { identity } = match;
        // Update existing
        const updated = await ReIDIdentity.findByIdAndUpdate(identity._id, {
            $inc: { sightings: 1, confidence: 0.05 },
            $set: { lastSeen: new Date(), lastSeenCamera: cameraId, embedding: embedding }
        }, { new: true });

        // Update local index
        const idx = reidIndex.findIndex(id => id._id.equals(identity._id));
        if (idx !== -1) {
            reidIndex[idx] = {
                ...reidIndex[idx],
                lastSeen: Date.now(),
                lastSeenCamera: cameraId,
                confidence: updated.confidence,
                sightings: updated.sightings,
                embedding: embedding
            };
        }
        return updated;
    } else {
        // 2. Race condition check: second pass for creation suppression
        const secondPassMatch = await matchReID(embedding, cameraId, 0.85); // Stricter for creation
        if (secondPassMatch) return await processSighting(embedding, cameraId); // Recurse to update

        // 3. Create new
        const newIdentity = await ReIDIdentity.create({
            embedding,
            lastSeenCamera: cameraId,
            confidence: 0.1,
            sightings: 1
        });

        // Add to local index
        reidIndex.push({
            _id: newIdentity._id,
            embedding,
            lastSeen: Date.now(),
            lastSeenCamera: cameraId,
            confidence: 0.1,
            sightings: 1
        });
        enforceMemoryLimits();

        logger.info(`[ReID] Created temporary identity: ${newIdentity._id}`);
        return newIdentity;
    }
};

/**
 * Merges two identities.
 */
export const mergeIdentities = async (sourceId, targetId) => {
    logger.info(`[ReID] Merging identity ${sourceId} into ${targetId}`);

    // Update AuditLogs
    await AuditLog.updateMany({ reidIdentityId: sourceId }, { $set: { reidIdentityId: targetId } });

    // Update target screenings/data
    const source = await ReIDIdentity.findById(sourceId);
    if (source) {
        await ReIDIdentity.findByIdAndUpdate(targetId, {
            $inc: { sightings: source.sightings },
            $max: { confidence: source.confidence }
        });
    }

    // Delete source
    await ReIDIdentity.findByIdAndDelete(sourceId);

    // Remove from index
    reidIndex = reidIndex.filter(id => !id._id.equals(sourceId));
};

// Export as a service object for consistency
export const reidService = {
    initReIDService,
    matchReID,
    processSighting,
    mergeIdentities
};

// Auto-init
initReIDService();
