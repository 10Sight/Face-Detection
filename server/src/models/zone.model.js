import mongoose from "mongoose";

const zoneSchema = new mongoose.Schema({
    cameraId: {
        type: String,
        required: true,
        index: true
    },
    name: {
        type: String,
        required: true
    },
    type: {
        type: String,
        enum: ["restricted", "monitoring", "corridor"],
        default: "monitoring"
    },
    polygon: [
        {
            x: { type: Number, required: true }, // Normalized 0-1
            y: { type: Number, required: true }  // Normalized 0-1
        }
    ],
    dwellThreshold: {
        type: Number,
        default: 30 // Seconds
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// Optimization: Index on cameraId for fast lookup during cache initialization
zoneSchema.index({ cameraId: 1 });

// Automatic cache refresh on data changes
zoneSchema.post("save", async function () {
    const { zoneService } = await import("../services/zone.service.js");
    zoneService.refreshCache();
});

zoneSchema.post("findOneAndDelete", async function () {
    const { zoneService } = await import("../services/zone.service.js");
    zoneService.refreshCache();
});

zoneSchema.post("findOneAndUpdate", async function () {
    const { zoneService } = await import("../services/zone.service.js");
    zoneService.refreshCache();
});

export const Zone = mongoose.model("Zone", zoneSchema);
