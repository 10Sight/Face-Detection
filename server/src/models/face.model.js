import mongoose, { Schema } from "mongoose";

const faceSchema = new Schema(
    {
        name: {
            type: String,
            required: true,
            index: true,
        },
        userId: {
            type: Schema.Types.ObjectId,
            ref: "User",
        },
        embedding: {
            type: [Number],
            required: true,
            validate: {
                validator: function (v) {
                    return v.length > 0;
                },
                message: "Embedding must not be empty",
            },
        },
        metadata: {
            sourceImage: String,
            confidence: Number,
        },
    },
    {
        timestamps: true,
    }
);

// Optional: Vector search index for MongoDB Atlas
// faceSchema.index({ embedding: "vector" });

export const Face = mongoose.model("Face", faceSchema);
