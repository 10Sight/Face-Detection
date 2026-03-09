import mongoose from 'mongoose';

const reidIdentitySchema = new mongoose.Schema({
    embedding: {
        type: [Number],
        required: true,
        select: false // Large vector, only select when needed for matching
    },
    confidence: {
        type: Number,
        default: 0.1,
        min: 0,
        max: 1.0
    },
    lastSeenCamera: {
        type: String,
        default: 'unknown'
    },
    embeddingVersion: {
        type: String,
        default: 'osnet_x0_25_v1'
    },
    sightings: {
        type: Number,
        default: 1
    },
    lastSeen: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

// Indexing for efficient lifecycle management and lookups
reidIdentitySchema.index({ lastSeen: -1 });
reidIdentitySchema.index({ confidence: 1, sightings: 1 });

export const ReIDIdentity = mongoose.model('ReIDIdentity', reidIdentitySchema);
