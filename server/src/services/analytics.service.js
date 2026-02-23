import { AuditLog } from "../models/audit.model.js";

/**
 * Aggregates sightings into advanced trends for the last 24 hours.
 */
export const fetchAdvancedStats = async () => {
    const now = new Date();
    const last24h = new Date(now - 24 * 60 * 60 * 1000);

    // 1. Demographic Distribution
    const demographicStats = await AuditLog.aggregate([
        { $match: { createdAt: { $gte: last24h } } },
        {
            $group: {
                _id: { gender: "$demographics.gender", age: "$demographics.age" },
                count: { $sum: 1 }
            }
        }
    ]);

    // 2. Emotional Sentiment Trends
    const sentimentTrends = await AuditLog.aggregate([
        { $match: { createdAt: { $gte: last24h } } },
        {
            $group: {
                _id: {
                    hour: { $hour: "$createdAt" },
                    emotion: "$dominantEmotion"
                },
                count: { $sum: 1 }
            }
        },
        { $sort: { "_id.hour": 1 } }
    ]);

    // 3. High-Level Metrics
    const totalSightings = await AuditLog.countDocuments({ createdAt: { $gte: last24h } });
    const uniqueIdentities = await AuditLog.distinct("name", { createdAt: { $gte: last24h } });

    return {
        totalSightings24h: totalSightings,
        uniqueIdentities: uniqueIdentities.length,
        demographics: demographicStats,
        trends: sentimentTrends,
        health: "Optimized"
    };
};
/**
 * Forensic Search: Finds historical sightings similar to a provided embedding.
 */
export const searchByEmbedding = async (targetEmbedding, threshold = 0.5, limit = 50) => {
    // In a production environment, we would use Atlas Vector Search.
    // Here we perform a high-performance scan of recent logs.
    const logs = await AuditLog.find({
        createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } // Last 30 days
    }).select("+embedding");

    const matches = logs
        .map(log => {
            const similarity = calculateCosineSimilarity(targetEmbedding, log.embedding);
            return { ...log.toObject(), similarity };
        })
        .filter(log => log.similarity > threshold)
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, limit);

    return matches;
};

/**
 * Generates an aggregated intelligence report for a date range with pagination.
 */
export const fetchReportData = async (startDate, endDate, page = 1, limit = 10) => {
    const query = {
        createdAt: {
            $gte: new Date(startDate),
            $lte: new Date(endDate)
        }
    };

    const skip = (page - 1) * limit;

    const logs = await AuditLog.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);

    const totalLogs = await AuditLog.countDocuments(query);

    const stats = await AuditLog.aggregate([
        { $match: query },
        {
            $group: {
                _id: "$name",
                count: { $sum: 1 },
                avgConfidence: { $avg: "$confidence" }
            }
        },
        { $sort: { count: -1 } }
    ]);

    return {
        logs,
        summary: stats,
        pagination: {
            total: totalLogs,
            page,
            limit,
            totalPages: Math.ceil(totalLogs / limit)
        }
    };
};

/**
 * Helper: Cosine Similarity calculation
 */
const calculateCosineSimilarity = (vecA, vecB) => {
    if (!vecA || !vecB || vecA.length !== vecB.length) return 0;
    const dotProduct = vecA.reduce((sum, a, i) => sum + a * vecB[i], 0);
    const magA = Math.sqrt(vecA.reduce((sum, a) => sum + a * a, 0));
    const magB = Math.sqrt(vecB.reduce((sum, b) => sum + b * b, 0));
    if (magA === 0 || magB === 0) return 0;
    return dotProduct / (magA * magB);
};
