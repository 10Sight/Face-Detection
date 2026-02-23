import mongoose, { Schema } from "mongoose";

const watchlistSchema = new Schema(
    {
        faceId: {
            type: Schema.Types.ObjectId,
            ref: "Face",
            required: true,
            unique: true,
        },
        type: {
            type: String,
            enum: ["VIP", "Blacklist", "Unauthorized", "Staff"],
            required: true,
        },
        severity: {
            type: String,
            enum: ["Low", "Medium", "High", "Critical"],
            default: "Medium",
        },
        nickname: {
            type: String, // Optional human-readable tag
        },
        notes: {
            type: String,
        },
        isActive: {
            type: Boolean,
            default: true,
        }
    },
    {
        timestamps: true,
    }
);

export const Watchlist = mongoose.model("Watchlist", watchlistSchema);
