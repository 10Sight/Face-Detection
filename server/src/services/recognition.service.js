import { Face } from "../models/face.model.js";
import logger from "../loggers/winston.logger.js";
import { calculateCosineSimilarity } from "../utils/vectorUtils.js";


/**
 * IN-MEMORY VECTOR INDEX
 * Optimized for high-frequency sub-millisecond recognition.
 */
let localIndex = []; // Array of { name, userId, embedding }
let lastLoadTime = 0;
const REFRESH_INTERVAL = 60000; // Auto-refresh index every 1 minute

/**
 * Loads all face embeddings into memory.
 */
export const loadIndex = async (force = false) => {
    const now = Date.now();
    if (!force && lastLoadTime > 0 && (now - lastLoadTime < REFRESH_INTERVAL)) {
        return;
    }

    try {
        const allFaces = await Face.find({}).lean();
        const newIndex = allFaces.map(f => ({
            _id: f._id,
            name: f.name,
            userId: f.userId,
            dateOfBirth: f.dateOfBirth,
            gender: f.gender,
            embedding: f.embedding
        }));

        // Atomic swap to avoid race conditions during inference
        localIndex = newIndex;

        lastLoadTime = now;
        logger.info(`[Recognition] Vector index refreshed: ${localIndex.length} identities.`);
    } catch (error) {
        logger.error(`[Recognition] Failed to load vector index: ${error.message}`);
    }
};


/**
 * Recognizes a face by comparing its embedding with stored faces (IN-MEMORY)
 */
export const identifyFace = async (embedding, threshold = 0.35) => {

    // Ensure index is loaded
    if (localIndex.length === 0) {
        await loadIndex();
    }

    let bestMatch = { name: "Unknown", confidence: 0, _id: null, lastMaxSim: 0 };

    // Copy reference to avoid disruption if localIndex is swapped mid-loop
    const currentIndex = localIndex;

    // Tight loop for high-performance comparison
    for (let i = 0; i < currentIndex.length; i++) {
        const face = currentIndex[i];
        const similarity = calculateCosineSimilarity(embedding, face.embedding);

        if (similarity > bestMatch.lastMaxSim) {
            bestMatch.lastMaxSim = similarity;
        }

        if (similarity > threshold && similarity > bestMatch.confidence) {
            bestMatch = {
                _id: face._id,
                name: face.name,
                confidence: similarity,
                userId: face.userId,
                dateOfBirth: face.dateOfBirth,
                gender: face.gender,
                lastMaxSim: bestMatch.lastMaxSim
            };
        }
    }

    if (bestMatch.name === "Unknown" && currentIndex.length > 0) {
        logger.debug(`[Recognition] No match found. Max similarity: ${bestMatch.lastMaxSim.toFixed(3)} (Threshold: ${threshold})`);
    } else if (bestMatch.name !== "Unknown") {
        logger.info(`[Recognition] Matched ${bestMatch.name} (${bestMatch.confidence.toFixed(3)})`);
    }

    return bestMatch;
};

/**
 * Removes an identity from the local index.
 */
export const removeFromLocalIndex = (id) => {
    const originalCount = localIndex.length;
    localIndex = localIndex.filter(f => f._id.toString() !== id.toString());
    if (localIndex.length < originalCount) {
        logger.info(`[Recognition] Identity ${id} removed from vector index.`);
    }
};

/**
 * Updates or adds an identity in the local index.
 */
export const updateLocalIndex = (id, updates) => {
    const idx = localIndex.findIndex(f => f._id.toString() === id.toString());
    if (idx !== -1) {
        localIndex[idx] = { ...localIndex[idx], ...updates };
        logger.info(`[Recognition] Identity ${id} updated in vector index.`);
    } else {
        // Safe to push as JS is single-threaded
        localIndex.push({ _id: id, ...updates });
        logger.info(`[Recognition] New identity ${id} added to vector index.`);
    }
};



// Initial load
loadIndex().catch(err => logger.error(`[Recognition] Initial index load failed: ${err.message}`));
