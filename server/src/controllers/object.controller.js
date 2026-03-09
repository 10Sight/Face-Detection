import { ObjectRef } from "../models/object.model.js";
import { identifyObject, registerNewObject, deleteObject } from "../services/objectRecognition.service.js";
import { workerService } from "../services/worker.service.js";
import logger from "../loggers/winston.logger.js";
import asyncHandler from "../utils/asyncHandler.js";
import ApiResponse from "../utils/ApiResponse.js";
import ApiError from "../utils/ApiError.js";

/**
 * Identifies an object from its embedding.
 */
export const identifyObjectHandler = asyncHandler(async (req, res) => {
    const { embedding, category } = req.body;
    if (!embedding) {
        throw new ApiError(400, "Embedding is required");
    }

    const match = await identifyObject(embedding, category);

    return res.status(200).json(new ApiResponse(200, "Object identification successful",
        match.name ? match : { name: "Unknown" }
    ));
});

/**
 * Registers a new object reference.
 */
export const registerObjectHandler = asyncHandler(async (req, res) => {
    const { name, category, embedding, metadata } = req.body;
    if (!name || !embedding || !category) {
        throw new ApiError(400, "Name, category, and embedding are required");
    }

    const newObject = await registerNewObject({
        name,
        category,
        embedding,
        metadata
    });

    return res.status(201).json(new ApiResponse(201, "Object registered successfully", newObject));
});

/**
 * Retrieves all registered objects.
 */
export const getAllObjectsHandler = asyncHandler(async (req, res) => {
    const objects = await ObjectRef.find({}).sort({ createdAt: -1 });
    return res.status(200).json(new ApiResponse(200, "Objects retrieved successfully", objects));
});

/**
 * Deletes a registered object.
 */
export const deleteObjectHandler = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const deleted = await deleteObject(id);

    if (!deleted) {
        throw new ApiError(404, "Object not found");
    }

    return res.status(200).json(new ApiResponse(200, "Object deleted successfully", null));
});

/**
 * Registers a new object by extracting an embedding from an uploaded image.
 */
export const registerObjectFromImageHandler = asyncHandler(async (req, res) => {
    const { name, category, metadata } = req.body;
    const file = req.file;

    if (!name || !category || !file) {
        throw new ApiError(400, "Name, category, and image file are required");
    }

    // 1. Call Worker to get embedding
    const workerResult = await workerService.detect(file.buffer, file.originalname, true, ["object"]);
    const objects = workerResult.result?.objects || [];

    if (objects.length === 0) {
        throw new ApiError(400, "No objects detected in the uploaded image");
    }

    // 2. Pick the best object (or the one matching the requested category)
    let targetObj = objects.find(o => o.label === category) || objects[0];

    if (!targetObj.embedding || targetObj.embedding.length === 0) {
        throw new ApiError(400, "Could not generate vector signature for the object");
    }

    // 3. Register in DB
    const newObject = await registerNewObject({
        name,
        category: targetObj.label,
        embedding: targetObj.embedding,
        metadata: {
            ...metadata,
            sourceImage: file.originalname,
            confidence: targetObj.confidence
        }
    });

    return res.status(201).json(new ApiResponse(201, "Object registered successfully from image", newObject));
});

