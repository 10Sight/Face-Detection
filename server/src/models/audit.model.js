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
        entityType: {
            type: String,
            enum: ["face", "object"],
            default: "face",
            index: true
        },
        cameraId: {
            type: String,
            required: false,
            default: "unknown",
            index: true
        },
        reidIdentityId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'ReIDIdentity',
            required: false,
            index: true
        },
        imageSnapshot: {
            type: String, // URL or Base64 of the specific sighting
            required: false,
        },
        embedding: {
            type: [Number], // Forensic fingerprint for historical search
            required: false,
            select: false, // Don't return by default to save bandwidth
        },
        eventType: {
            type: String,
            enum: ["running", "fall", "stationary", "normal", "restricted_entry", "loitering"],
            default: "normal",
            index: true
        },
        behaviorConfidence: {
            type: Number,
            default: 0
        },
        zoneId: {
            type: Schema.Types.ObjectId,
            ref: "Zone",
            required: false
        },
        zoneName: {
            type: String,
            required: false
        }
    },
    {
        timestamps: true,
    }
);

// Performance: Compound index for Suspicious Activity Detection
auditLogSchema.index({ entityType: 1, name: 1, createdAt: -1 });

// Performance: Specialized indexes for Cross-Camera Tracking & Timelines
auditLogSchema.index({ faceId: 1, createdAt: -1 });
auditLogSchema.index({ faceId: 1, cameraId: 1, createdAt: -1 });

// Performance: Index timestamps for fast range queries (Attendance Reports)
auditLogSchema.index({ createdAt: -1 });


// Scalability: Auto-expire logs older than 90 days to prevent DB bloat
// auditLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 90 });

export const AuditLog = mongoose.model("AuditLog", auditLogSchema);
