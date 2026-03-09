/**
 * Shared Vector Utilities for AI Biocore.
 */

/**
 * Calculates cosine similarity between two vectors.
 * Optimized for high-dim embeddings (e.g., 512-dim).
 * @param {number[]} vecA 
 * @param {number[]} vecB 
 * @returns {number} Similarity score [0, 1]
 */
export const calculateCosineSimilarity = (vecA, vecB) => {
    if (!vecA || !vecB || vecA.length === 0 || vecB.length === 0) return 0;

    // Fallback for length mismatch if any
    const length = Math.min(vecA.length, vecB.length);

    let dotProduct = 0;
    let magA = 0;
    let magB = 0;

    for (let i = 0; i < length; i++) {
        dotProduct += vecA[i] * vecB[i];
        magA += vecA[i] * vecA[i];
        magB += vecB[i] * vecB[i];
    }

    if (magA === 0 || magB === 0) return 0;
    return dotProduct / (Math.sqrt(magA) * Math.sqrt(magB));
};
