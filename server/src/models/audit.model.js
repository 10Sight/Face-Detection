import mongoose, { Schema } from "mongoose";

const auditLogSchema = new Schema(
    {
        faceId: {
            type: Schema.Types.ObjectId,
            ref: "Face",
            required: false, // Can be null for unidentified "Guest" faces
        },
        name: {
            type: String,
            default: "Guest",
            index: true,
        },
        confidence: {
            type: Number,
            required: true,
        },
        dominantEmotion: {
            type: String,
            required: true,
        },
        emotionScores: {
            type: Map,
            of: Number,
        },
        demographics: {
            age: String,
            gender: String,
            livenessScore: Number,
        },
        imageSnapshot: {
            type: String, // URL or Base64 of the specific sighting
            required: false,
        },
        embedding: {
            type: [Number], // Forensic fingerprint for historical search
            required: false,
            select: false, // Don't return by default to save bandwidth
        }
    },
    {
        timestamps: true,
    }
);

// Performance: Index timestamps for fast range queries (Attendance Reports)
auditLogSchema.index({ createdAt: -1 });

// Scalability: Auto-expire logs older than 90 days to prevent DB bloat
// auditLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 90 });

export const AuditLog = mongoose.model("AuditLog", auditLogSchema);
