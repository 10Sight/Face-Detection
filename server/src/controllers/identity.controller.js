import { fetchAllIdentities, updateIdentityRecord, purgeIdentityRecord } from "../services/identity.service.js";
import asyncHandler from "../utils/asyncHandler.js";
import ApiResponse from "../utils/ApiResponse.js";

/**
 * GET /api/v1/identity/all
 */
export const getAllIdentities = asyncHandler(async (req, res) => {
    const identities = await fetchAllIdentities();

    return res
        .status(200)
        .json(new ApiResponse(200, "Identities retrieved successfully", identities));
});

/**
 * PATCH /api/v1/identity/:id
 */
export const updateIdentity = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const identity = await updateIdentityRecord(id, req.body);

    return res
        .status(200)
        .json(new ApiResponse(200, "Identity updated successfully", identity));
});

/**
 * DELETE /api/v1/identity/:id
 */
export const deleteIdentity = asyncHandler(async (req, res) => {
    const { id } = req.params;
    await purgeIdentityRecord(id);

    return res
        .status(200)
        .json(new ApiResponse(200, "Identity purged successfully", null));
});
