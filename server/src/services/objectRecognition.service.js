import { ObjectRef } from "../models/object.model.js";
import logger from "../loggers/winston.logger.js";
import { calculateCosineSimilarity } from "../utils/vectorUtils.js";

/**
 * IN-MEMORY VECTOR INDEX FOR OBJECTS
 * Optimized for high-performance sub-millisecond matching.
 */
let localIndex = []; // Array of { name, category, embedding }
let lastLoadTime = 0;
const REFRESH_INTERVAL = 60000; // Auto-refresh index every 1 minute

/**
 * Loads all object embeddings into memory.
 */
export const loadObjectIndex = async (force = false) => {
    const now = Date.now();
    if (!force && lastLoadTime > 0 && (now - lastLoadTime < REFRESH_INTERVAL)) {
        return;
    }

    try {
        const allObjects = await ObjectRef.find({}).lean();
        const newIndex = allObjects.map(obj => ({
            _id: obj._id,
            name: obj.name,
            category: obj.category,
            embedding: obj.embedding
        }));

        // Atomic swap
        localIndex = newIndex;
        lastLoadTime = now;
        logger.info(`[ObjectRecognition] Vector index refreshed: ${localIndex.length} objects.`);
    } catch (error) {
        logger.error(`[ObjectRecognition] Failed to load vector index: ${error.message}`);
    }
};


/**
 * Recognizes an object by comparing its embedding with stored objects (IN-MEMORY)
 */
export const identifyObject = async (embedding, category = null, threshold = 0.5) => {
    // Ensure index is loaded
    if (localIndex.length === 0 && lastLoadTime === 0) {
        await loadObjectIndex();
    }

    let bestMatch = { name: null, confidence: 0, _id: null };
    const currentIndex = localIndex;

    // Tight loop for high-performance comparison
    for (let i = 0; i < currentIndex.length; i++) {
        const obj = currentIndex[i];

        // Optional: Filter by category if provided to narrow down search
        if (category && obj.category !== category) continue;

        const similarity = calculateCosineSimilarity(embedding, obj.embedding);

        if (similarity > threshold && similarity > bestMatch.confidence) {
            bestMatch = {
                _id: obj._id,
                name: obj.name,
                category: obj.category,
                confidence: similarity,
            };
        }
    }

    if (bestMatch.name) {
        logger.info(`[ObjectRecognition] Matched ${bestMatch.name} (${bestMatch.confidence.toFixed(3)})`);
    }

    return bestMatch;
};

/**
 * Registers a new object embedding and updates local index
 */
export const registerNewObject = async (data) => {
    const obj = await ObjectRef.create({
        name: data.name,
        category: data.category,
        embedding: data.embedding,
        metadata: data.metadata
    });

    // Proactively update local index
    localIndex.push({
        _id: obj._id,
        name: obj.name,
        category: obj.category,
        embedding: obj.embedding
    });

    return obj;
};

/**
 * Deletes an object from the registry and updates local index
 */
export const deleteObject = async (id) => {
    const obj = await ObjectRef.findByIdAndDelete(id);
    if (obj) {
        // Update local index
        localIndex = localIndex.filter(o => o._id.toString() !== id.toString());
        logger.info(`[ObjectRecognition] Object deleted: ${obj.name}. Index size: ${localIndex.length}`);
    }
    return obj;
};

// Initial load
loadObjectIndex().catch(err => logger.error(`[ObjectRecognition] Initial index load failed: ${err.message}`));

