import mongoose, { Schema } from "mongoose";

const objectSchema = new Schema(
    {
        name: {
            type: String,
            required: true,
            index: true,
        },
        category: {
            type: String, // e.g. "cell phone", "laptop" (from detector)
            required: true,
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

export const ObjectRef = mongoose.model("ObjectRef", objectSchema);
