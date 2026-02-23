import { Face } from "../models/face.model.js";

/**
 * Calculates cosine similarity between two vectors
 */
const cosineSimilarity = (vecA, vecB) => {
    const dotProduct = vecA.reduce((sum, a, i) => sum + a * vecB[i], 0);
    const magA = Math.sqrt(vecA.reduce((sum, a) => sum + a * a, 0));
    const magB = Math.sqrt(vecB.reduce((sum, b) => sum + b * b, 0));
    if (magA === 0 || magB === 0) return 0;
    return dotProduct / (magA * magB);
};

/**
 * Recognizes a face by comparing its embedding with stored faces
 */
export const identifyFace = async (embedding, threshold = 0.6) => {
    const allFaces = await Face.find({});
    let bestMatch = { name: "Unknown", confidence: 0 };

    for (const face of allFaces) {
        const similarity = cosineSimilarity(embedding, face.embedding);
        if (similarity > threshold && similarity > bestMatch.confidence) {
            bestMatch = {
                name: face.name,
                confidence: similarity,
                userId: face.userId,
            };
        }
    }

    return bestMatch;
};

/**
 * Registers a new face embedding for a person
 */
export const registerFace = async (name, embedding, userId = null) => {
    const face = await Face.create({
        name,
        embedding,
        userId,
    });
    return face;
};
